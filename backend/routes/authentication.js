import express from "express"
import { getCurrentUser, handleGoogleAuth, handleNormalLogin, handleNormalRegistration, handleLogout, sendOtp, verifyOtp } from "../controller/authentication.js";
import { basicAuthorisation } from "../middlewares/authorisation.js";

const router = express.Router();

router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/register', handleNormalRegistration);

router.post('/login', handleNormalLogin);

router.get('/me', basicAuthorisation, getCurrentUser);

router.post('/logout', handleLogout);

router.post('/google', handleGoogleAuth);


export default router;
