import { BrevoClient } from "@getbrevo/brevo";

const OTP_EXPIRY_MINUTES = 10;
// The reset template must describe the same lifetime enforced by Redis.
const PASSWORD_RESET_EXPIRY_MINUTES = 10;
const BREVO_TEMPLATE_ID = Number.parseInt(process.env.BREVO_EMAIL_VERIFICATION_TEMPLATE_ID || "2", 10);
const PASSWORD_RESET_TEMPLATE_ID = Number.parseInt(process.env.BREVO_PASSWORD_RESET_TEMPLATE_ID || "1", 10);

const getBrevoClient = () => {
  if (!process.env.BREVO_API_KEY) {
    throw new Error("BREVO_API_KEY is not configured");
  }

  return new BrevoClient({
    apiKey: process.env.BREVO_API_KEY,
    timeoutInSeconds: 15,
    maxRetries: 2,
  });
};

const getTemplateUsername = (email) => {
  const localPart = email.split("@")[0] || "there";
  return `${localPart.charAt(0).toUpperCase()}${localPart.slice(1)}`;
};

export const sendRegistrationOtpEmail = async ({ email, otp }) => {
  if (!Number.isInteger(BREVO_TEMPLATE_ID)) {
    throw new Error("BREVO_EMAIL_VERIFICATION_TEMPLATE_ID must be a number");
  }

  const brevo = getBrevoClient();

  await brevo.transactionalEmails.sendTransacEmail({
    to: [{ email }],
    templateId: BREVO_TEMPLATE_ID,
    params: {
      username: getTemplateUsername(email),
      otp,
      expiry_minutes: OTP_EXPIRY_MINUTES,
      year: new Date().getFullYear(),
    },
  });
};

export const sendPasswordResetEmail = async ({ user, resetLink }) => {
  if (!Number.isInteger(PASSWORD_RESET_TEMPLATE_ID)) {
    throw new Error("BREVO_PASSWORD_RESET_TEMPLATE_ID must be a number");
  }

  const brevo = getBrevoClient();

  await brevo.transactionalEmails.sendTransacEmail({
    to: [{ email: user.email, name: user.username }],
    templateId: PASSWORD_RESET_TEMPLATE_ID,
    params: {
      username: user.username,
      email: user.email,
      reset_link: resetLink,
      expiry_minutes: PASSWORD_RESET_EXPIRY_MINUTES,
      year: new Date().getFullYear(),
    },
  });
};

export { OTP_EXPIRY_MINUTES, PASSWORD_RESET_EXPIRY_MINUTES };
