import bcrypt from "bcrypt";
import express from "express"
import User from "../models/userModel.js"
import redis from "../config/redis.js"
import { randomUUID } from 'crypto';

const router = express.Router();

router.post('/register', async (req, res) => {

  const {email, password, username} = req.body;
  if(!email || !password || !username) {
    return res.status(400).json({ message: "All fields are required" });
  }
  const hash = await bcrypt.hash(password, 10);
  const user = new User({ email, password: hash, username });
  await user.save();
  return res.status(200).json({ message: "User created successfully" , success: true });
})

const expiresIn = 10 * 24 * 60 * 60 ;
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).json({ message: "User not found" });
  }
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(400).json({ message: "Invalid credentials" });
  }
  const tokenData = {
    id: user._id,
    email: user.email,
    username: user.username,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
  }

  const token = randomUUID();
  try {
    await redis.set(`session:${token}`, JSON.stringify(tokenData), 'EX', expiresIn);
    res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'none' });
    return res.status(200).json({ message: "Login successful", success: true });
  } catch (error) {
    return res.status(500).json({ message: "Failed to store session", success: false });
  }
});

export default router;