import express from "express"
import { getCurrentUser, handleGoogleAuth, handleNormalLogin, handleNormalRegistration } from "../controller/authentication.js";
import { basicAuthorisation } from "../middlewares/authorisation.js";

const router = express.Router();

router.post('/register', handleNormalRegistration);

router.post('/login', handleNormalLogin);

router.get('/me', basicAuthorisation, getCurrentUser);

router.post('/google', handleGoogleAuth);


export default router;
