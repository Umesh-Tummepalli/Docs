import express from "express"
import { getCurrentUser, handleGoogleAuth, handleNormalLogin, handleNormalRegistration, handleLogout, requestPasswordReset, resetPassword, sendOtp, verifyOtp, updateUsername } from "../controller/authentication.js";
import { basicAuthorisation } from "../middlewares/authorisation.js";

const router = express.Router();

router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/register', handleNormalRegistration);
router.post('/forgot-password', requestPasswordReset);
router.post('/reset-password', resetPassword);

router.post('/login', handleNormalLogin);

router.get('/me', basicAuthorisation, getCurrentUser);

router.patch('/username', basicAuthorisation, updateUsername);

router.post('/logout', handleLogout);

router.post('/google', handleGoogleAuth);


export default router;
