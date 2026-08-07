import express from "express"
import { handleGoogleAuth, handleNormalLogin, handleNormalRegistration } from "../controller/authentication.js";

const router = express.Router();

router.post('/register', handleNormalRegistration);

router.post('/login', handleNormalLogin);

router.post('/google', handleGoogleAuth);


export default router;
