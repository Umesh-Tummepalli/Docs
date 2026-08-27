import User from "../models/userModel.js";
import redis from "../config/redis.js";
import { randomUUID } from 'crypto';
import bcrypt from "bcrypt";
import { OAuth2Client } from 'google-auth-library';

const expiresIn = 10 * 24 * 60 * 60; // 10 days in seconds

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
  await redis.set(`session:${token}`, JSON.stringify(tokenData), 'EX', expiresIn);
  return token;
};

const setSessionCookie = (res, token) => {
  res.cookie('token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: expiresIn * 1000,
  });
};

export const handleNormalRegistration = async (req, res) => {
  try {
    const { email, password, username } = req.body;
    if (!email || !password || !username) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User with this email already exists" });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = new User({
      email,
      password: hash,
      username,
      authProviders: [{ provider: 'local' }],
    });
    await user.save();

    return res.status(200).json({ message: "User created successfully", success: true });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({ message: "Internal server error", success: false });
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

    // FIXED: Added missing 'await' keyword
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
    const user = await User.findById(req.user.id).select('_id username email authProviders');
    if (!user) {
      return res.status(404).json({ message: 'User not found', success: false });
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
    console.error('Current user error:', error);
    return res.status(500).json({ message: 'Failed to load user', success: false });
  }
};

export const handleGoogleAuth = async (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ message: "Code is required" });
  }

  try {
    // FIXED: Exchange the code for tokens first
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
      authProviders: { $elemMatch: { provider: 'google', providerId: sub } },
    });

    if (!user) {
      user = await User.findOne({ email });

      if (user) {
        user.authProviders.push({ provider: 'google', providerId: sub });
        await user.save();
      } else {
        user = await User.create({
          email,
          username: name || email.split('@')[0],
          authProviders: [{ provider: 'google', providerId: sub }],
        });
      }
    }

    const token = await createSession(user);
    setSessionCookie(res, token);

    return res.status(200).json({
      message: 'Authentication successful',
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

// ToDo : Microsoft oAuth2
