import 'dotenv/config';
import express from "express";
import { connectMongo } from "./config/mongo.js";
import auth from "./routes/authentication.js"
import cors from "cors";
import documentRoutes from "./routes/document.js"
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';

await connectMongo();

const app = express();
app.set("trust proxy", 1);

const configuredFrontend = process.env.FRONTEND_URL?.trim();
const normalizedFrontend = configuredFrontend?.replace(/\/+$/, "");
const allowedOrigins = Array.from(
  new Set([configuredFrontend, normalizedFrontend, "http://localhost:5173"].filter(Boolean))
);

const corsOriginCheck = (origin, callback) => {
  if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes(origin.replace(/\/+$/, ""))) {
    return callback(null, true);
  }
  return callback(null, true);
};

const httpserver = createServer(app);
export const io = new Server(httpserver, {
  cors: {
     origin: corsOriginCheck,
     credentials: true
   }
});

app.use(cookieParser());

app.use(cors({
  origin: corsOriginCheck,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
}))
app.use(express.raw({
  type: 'application/octet-stream',
  limit: '16mb',
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));



app.get('/', (req, res) => {
    res.send("<h1>Server is working 👍</h1>");
})

// Routes
app.use('/auth', auth);
app.use('/documents', documentRoutes);

// Register Socket.IO collaboration handlers
import("./controller/collaboration.js");

// page not found;
app.use((req, res) => {
  res.status(404).json({ message: "Page not found" });
})

// server listening
httpserver.listen(8000,()=>{
  console.log("server running on port : 8000");
})
