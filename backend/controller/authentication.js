import User from "../models/userModel.js";
import redis from "../config/redis.js";
import { createHash, createHmac, randomBytes, randomInt, randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import { OAuth2Client } from "google-auth-library";
import { OTP_EXPIRY_MINUTES, PASSWORD_RESET_EXPIRY_MINUTES, sendPasswordResetEmail, sendRegistrationOtpEmail } from "../utils/email.js";

const expiresIn = 30 * 24 * 60 * 60;
const isProd = process.env.NODE_ENV === "production";
const OTP_TTL_SECONDS = OTP_EXPIRY_MINUTES * 60;
// A verified email may complete registration only during the same short-lived OTP window.
const REGISTRATION_PROOF_TTL_SECONDS = OTP_TTL_SECONDS;
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_COOLDOWN_SECONDS = 60;
const OTP_MAX_REQUESTS_PER_HOUR = 5;
const REGISTRATION_COOKIE_NAME = "registration_token";
const PASSWORD_RESET_TTL_SECONDS = PASSWORD_RESET_EXPIRY_MINUTES * 60;
const PASSWORD_RESET_MAX_REQUESTS_PER_HOUR = 5;

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || "postmessage"
);

const createSession = async (user) => {
  const tokenData = {
    id: user._id,
    email: user.email,
    username: user.username,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
  };

  const token = randomUUID();
  await redis.set(`session:${token}`, JSON.stringify(tokenData), "EX", expiresIn);
  return token;
};

const setSessionCookie = (res, token) => {
  res.cookie("token", token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: expiresIn * 1000,
  });
};

const clearSessionCookie = (res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
  });
};

const setRegistrationProofCookie = (res, token) => {
  res.cookie(REGISTRATION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: REGISTRATION_PROOF_TTL_SECONDS * 1000,
  });
};

const clearRegistrationProofCookie = (res) => {
  res.clearCookie(REGISTRATION_COOKIE_NAME, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
  });
};

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const otpKey = (email) => `registration:otp:${email}`;
const proofKey = (token) => `registration:verified:${token}`;
const passwordResetKey = (tokenHash) => `password-reset:${tokenHash}`;
const passwordResetUserKey = (userId) => `password-reset:user:${userId}`;
const getPasswordResetTokenHash = (token) => createHash("sha256").update(token).digest("hex");
const isPasswordResetEligible = (user) => Boolean(
  user?.password && !user.authProviders?.some(({ provider }) => provider && provider !== "local")
);
const getFrontendUrl = () => (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");

const consumePasswordResetProof = async (tokenHash) => {
  const script = `
    local proof = redis.call("GET", KEYS[1])
    if not proof then
      return false
    end

    local decodedProof = cjson.decode(proof)
    if not decodedProof.userId then
      redis.call("DEL", KEYS[1])
      return false
    end

    local userKey = "password-reset:user:" .. decodedProof.userId
    if redis.call("GET", userKey) ~= ARGV[1] then
      redis.call("DEL", KEYS[1])
      return false
    end

    redis.call("DEL", KEYS[1])
    redis.call("DEL", userKey)
    return proof
  `;

  return redis.eval(script, 1, passwordResetKey(tokenHash), tokenHash);
};

const invalidateUserSessions = async (userId) => {
  let cursor = "0";
  const sessionKeysToDelete = [];

  do {
    const [nextCursor, sessionKeys] = await redis.scan(cursor, "MATCH", "session:*", "COUNT", 100);
    cursor = nextCursor;
    if (sessionKeys.length) {
      const sessions = await redis.mget(sessionKeys);
      sessionKeys.forEach((key, index) => {
        try {
          if (JSON.parse(sessions[index])?.id === userId) sessionKeysToDelete.push(key);
        } catch {
          // Ignore malformed or expired session entries.
        }
      });
    }
  } while (cursor !== "0");

  if (sessionKeysToDelete.length) await redis.del(...sessionKeysToDelete);
};

const getOtpHash = (email, otp) => {
  if (!process.env.OTP_PEPPER) {
    throw new Error("OTP_PEPPER is not configured");
  }

  return createHmac("sha256", process.env.OTP_PEPPER)
    .update(`${email}:${otp}`)
    .digest("hex");
};

const incrementRateLimit = async (key, maximum) => {
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, 60 * 60);
  }

  return count <= maximum;
};

const consumeOtpAndCreateProof = async (email, otpHash, token) => {
  const script = `
    local raw = redis.call("GET", KEYS[1])
    if not raw then
      return 0
    end

    local entry = cjson.decode(raw)
    if entry.attempts >= tonumber(ARGV[2]) then
      redis.call("DEL", KEYS[1])
      return 2
    end

    if entry.otpHash ~= ARGV[1] then
      entry.attempts = entry.attempts + 1
      if entry.attempts >= tonumber(ARGV[2]) then
        redis.call("DEL", KEYS[1])
        return 2
      end
      redis.call("SET", KEYS[1], cjson.encode(entry), "KEEPTTL")
      return 1
    end

    redis.call("DEL", KEYS[1])
    redis.call("SET", KEYS[2], ARGV[3], "EX", ARGV[4])
    return 3
  `;

  const proof = JSON.stringify({ email, purpose: "complete_registration" });
  return redis.eval(
    script,
    2,
    otpKey(email),
    proofKey(token),
    otpHash,
    OTP_MAX_ATTEMPTS,
    proof,
    REGISTRATION_PROOF_TTL_SECONDS
  );
};

export const sendOtp = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Please enter a valid email address", success: false });
    }

    const existingUser = await User.findOne({ email }).select("_id").lean();
    if (existingUser) {
      return res.status(400).json({ message: "An account with this email already exists", success: false });
    }

    const withinEmailLimit = await incrementRateLimit(
      `registration:otp:email:${email}`,
      OTP_MAX_REQUESTS_PER_HOUR
    );

    if (!withinEmailLimit) {
      return res.status(429).json({ message: "Too many verification-code requests. Please try again later.", success: false });
    }

    const cooldown = await redis.ttl(`registration:otp:cooldown:${email}`);
    if (cooldown > 0) {
      return res.status(429).json({
        message: `Please wait ${cooldown} seconds before requesting another code`,
        success: false,
        resendAvailableIn: cooldown,
      });
    }

    const otp = randomInt(100000, 1000000).toString();
    const entry = JSON.stringify({ otpHash: getOtpHash(email, otp), attempts: 0 });

    await sendRegistrationOtpEmail({ email, otp });
    await redis.multi()
      .set(otpKey(email), entry, "EX", OTP_TTL_SECONDS)
      .set(`registration:otp:cooldown:${email}`, "1", "EX", OTP_RESEND_COOLDOWN_SECONDS)
      .exec();

    return res.status(200).json({
      message: "Verification code sent. Please check your email.",
      success: true,
      expiresIn: OTP_TTL_SECONDS,
      resendAvailableIn: OTP_RESEND_COOLDOWN_SECONDS,
    });
  } catch (error) {
    console.error("Send OTP error:", error.message);
    return res.status(500).json({ message: "Unable to send verification code. Please try again.", success: false });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const otp = String(req.body?.otp || "").trim();

    if (!isValidEmail(email) || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ message: "Enter a valid six-digit verification code", success: false });
    }

    const registrationToken = randomBytes(32).toString("hex");
    const result = await consumeOtpAndCreateProof(email, getOtpHash(email, otp), registrationToken);

    if (result === 0) {
      return res.status(400).json({ message: "The verification code is invalid or has expired", success: false });
    }
    if (result === 1) {
      return res.status(400).json({ message: "The verification code is incorrect", success: false });
    }
    if (result === 2) {
      return res.status(429).json({ message: "Too many incorrect attempts. Request a new code.", success: false });
    }

    const existingUser = await User.findOne({ email }).select("_id").lean();
    if (existingUser) {
      await redis.del(proofKey(registrationToken));
      return res.status(400).json({ message: "An account with this email already exists", success: false });
    }

    setRegistrationProofCookie(res, registrationToken);
    return res.status(200).json({ message: "Email verified. You can now create your account.", success: true });
  } catch (error) {
    console.error("Verify OTP error:", error.message);
    return res.status(500).json({ message: "Unable to verify code. Please request a new code.", success: false });
  }
};

export const handleNormalRegistration = async (req, res) => {
  try {
    const { username, password, confirmPassword } = req.body || {};
    const registrationToken = req.cookies?.[REGISTRATION_COOKIE_NAME];

    if (!registrationToken) {
      return res.status(401).json({ message: "Verify your email before creating an account", success: false });
    }
    if (!username?.trim() || !password || !confirmPassword) {
      return res.status(400).json({ message: "Username, password, and password confirmation are required", success: false });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match", success: false });
    }

    const rawProof = await redis.get(proofKey(registrationToken));
    if (!rawProof) {
      clearRegistrationProofCookie(res);
      return res.status(401).json({ message: "Email verification has expired. Please verify your email again.", success: false });
    }

    let proof;
    try {
      proof = JSON.parse(rawProof);
    } catch {
      await redis.del(proofKey(registrationToken));
      clearRegistrationProofCookie(res);
      return res.status(401).json({ message: "Email verification is invalid. Please verify your email again.", success: false });
    }

    if (proof.purpose !== "complete_registration" || !proof.email) {
      await redis.del(proofKey(registrationToken));
      clearRegistrationProofCookie(res);
      return res.status(401).json({ message: "Email verification is invalid. Please verify your email again.", success: false });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    try {
      await User.create({
        email: proof.email,
        username: username.trim(),
        password: passwordHash,
        authProviders: [{ provider: "local" }],
      });
    } catch (error) {
      if (error?.code === 11000) {
        await redis.del(proofKey(registrationToken));
        clearRegistrationProofCookie(res);
        return res.status(400).json({ message: "An account with this email already exists", success: false });
      }
      throw error;
    }

    await redis.del(proofKey(registrationToken));
    clearRegistrationProofCookie(res);
    return res.status(200).json({ message: "User created successfully", success: true });
  } catch (error) {
    console.error("Registration error:", error.message);
    return res.status(500).json({ message: "Internal server error", success: false });
  }
};

export const requestPasswordReset = async (req, res) => {
  const genericResponse = {
    message: "If an eligible account exists for this email, a password reset link has been sent.",
    success: true,
  };

  try {
    const email = normalizeEmail(req.body?.email);
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Please enter a valid email address", success: false });
    }

    const withinEmailLimit = await incrementRateLimit(
      `password-reset:request:${email}`,
      PASSWORD_RESET_MAX_REQUESTS_PER_HOUR
    );
    if (!withinEmailLimit) {
      return res.status(200).json(genericResponse);
    }

    const user = await User.findOne({ email }).select("_id email username password authProviders").lean();
    if (!isPasswordResetEligible(user)) {
      return res.status(200).json(genericResponse);
    }

    const resetToken = randomBytes(32).toString("base64url");
    const tokenHash = getPasswordResetTokenHash(resetToken);
    const resetLink = `${getFrontendUrl()}/reset-password?reset_token=${encodeURIComponent(resetToken)}`;

    const existingTokenHash = await redis.get(passwordResetUserKey(user._id.toString()));
    const transaction = redis.multi();
    if (existingTokenHash) transaction.del(passwordResetKey(existingTokenHash));
    transaction
      .set(
        passwordResetKey(tokenHash),
        JSON.stringify({ userId: user._id.toString(), purpose: "password_reset" }),
        "EX",
        PASSWORD_RESET_TTL_SECONDS
      )
      .set(passwordResetUserKey(user._id.toString()), tokenHash, "EX", PASSWORD_RESET_TTL_SECONDS);
    await transaction.exec();

    try {
      await sendPasswordResetEmail({ user, resetLink });
    } catch (emailError) {
      const cleanup = redis.multi().del(passwordResetKey(tokenHash));
      const currentTokenHash = await redis.get(passwordResetUserKey(user._id.toString()));
      if (currentTokenHash === tokenHash) cleanup.del(passwordResetUserKey(user._id.toString()));
      await cleanup.exec();
      throw emailError;
    }

    return res.status(200).json(genericResponse);
  } catch (error) {
    console.error("Password reset request error:", error.message);
    return res.status(500).json({ message: "Unable to request a password reset. Please try again.", success: false });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const resetToken = String(req.body?.reset_token || req.query?.reset_token || "").trim();
    const { password, confirmPassword } = req.body || {};

    if (!resetToken || !password || !confirmPassword) {
      return res.status(400).json({ message: "Reset token, password, and password confirmation are required", success: false });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match", success: false });
    }

    const tokenHash = getPasswordResetTokenHash(resetToken);
    const rawProof = await consumePasswordResetProof(tokenHash);
    if (!rawProof) {
      return res.status(400).json({ message: "This password reset link is invalid or has expired", success: false });
    }

    let proof;
    try {
      proof = JSON.parse(rawProof);
    } catch {
      return res.status(400).json({ message: "This password reset link is invalid or has expired", success: false });
    }
    if (proof.purpose !== "password_reset" || !proof.userId) {
      return res.status(400).json({ message: "This password reset link is invalid or has expired", success: false });
    }

    const user = await User.findById(proof.userId).select("_id password authProviders");
    if (!isPasswordResetEligible(user)) {
      return res.status(400).json({ message: "This password reset link is invalid or has expired", success: false });
    }

    user.password = await bcrypt.hash(password, 10);
    await user.save();

    await invalidateUserSessions(user._id.toString());

    clearSessionCookie(res);
    return res.status(200).json({ message: "Password reset successfully. Please sign in with your new password.", success: true });
  } catch (error) {
    console.error("Password reset error:", error.message);
    return res.status(500).json({ message: "Unable to reset password. Please request a new link.", success: false });
  }
};

export const handleNormalLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findOne({ email });
    if (!user || !user.password) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = await createSession(user);
    setSessionCookie(res, token);
    return res.status(200).json({ message: "Login successful", success: true });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Failed to process login", success: false });
  }
};

export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("_id username email authProviders");
    if (!user) {
      const token = req.cookies?.token;
      if (token) await redis.del(`session:${token}`);
      clearSessionCookie(res);
      return res.status(401).json({ message: "Unauthorized", success: false });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        authProviders: user.authProviders,
      },
    });
  } catch (error) {
    console.error("Current user error:", error);
    return res.status(500).json({ message: "Failed to load user", success: false });
  }
};

export const handleGoogleAuth = async (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ message: "Code is required" });
  }

  try {
    const { tokens } = await googleClient.getToken(code);

    if (!tokens || !tokens.id_token) {
      return res.status(400).json({ message: "Google ID token is missing" });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, sub } = payload;

    if (!email || !sub) {
      return res.status(400).json({ message: "Google account details are incomplete" });
    }

    let user = await User.findOne({
      authProviders: { $elemMatch: { provider: "google", providerId: sub } },
    });

    if (!user) {
      user = await User.findOne({ email });

      if (user) {
        user.authProviders.push({ provider: "google", providerId: sub });
        await user.save();
      } else {
        user = await User.create({
          email,
          username: name || email.split("@")[0],
          authProviders: [{ provider: "google", providerId: sub }],
        });
      }
    }

    const token = await createSession(user);
    setSessionCookie(res, token);

    return res.status(200).json({
      message: "Authentication successful",
      success: true,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
      },
    });
  } catch (error) {
    console.error("Google authentication error:", error);
    return res.status(500).json({ message: "Failed to authenticate with Google", success: false });
  }
};

export const handleLogout = async (req, res) => {
  try {
    const token = req?.cookies?.token;

    if (token) {
      await redis.del(`session:${token}`);
    }

    clearSessionCookie(res);

    return res.status(200).json({ message: "Logged out successfully", success: true });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({ message: "Failed to log out", success: false });
  }
};

export const updateUsername = async (req, res) => {
  try {
    const { username } = req.body;
    const userId = req.user.id;

    if (!username?.trim()) {
      return res.status(400).json({ message: "Username is required", success: false });
    }

    const trimmedUsername = username.trim();
    if (trimmedUsername.length < 2 || trimmedUsername.length > 50) {
      return res.status(400).json({ message: "Username must be between 2 and 50 characters", success: false });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found", success: false });
    }

    user.username = trimmedUsername;
    await user.save();

    // Update session data with new username
    const token = req.cookies?.token;
    if (token) {
      const sessionData = await redis.get(`session:${token}`);
      if (sessionData) {
        const session = JSON.parse(sessionData);
        session.username = trimmedUsername;
        await redis.set(`session:${token}`, JSON.stringify(session), "EX", expiresIn);
      }
    }

    return res.status(200).json({ message: "Username updated successfully", success: true, username: trimmedUsername });
  } catch (error) {
    console.error("Update username error:", error);
    return res.status(500).json({ message: "Failed to update username", success: false });
  }
};
