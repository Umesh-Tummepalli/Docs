import redis from "../config/redis.js"

const authorisation = async (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const sessionData = await redis.get(`session:${token}`);
  if (!sessionData) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  req.user = JSON.parse(sessionData);
  next();
};

module.exports = authorisation;