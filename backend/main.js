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
const httpserver = createServer(app);
export const io = new Server(httpserver, {
  cors: {
     origin: "http://localhost:5173",
     credentials: true
   }
});

app.use(cookieParser());

// const configuredFrontendOrigin = process.env.FRONTEND_ORIGIN;

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
}))
app.use(express.raw({
  type: 'application/octet-stream',
  limit: '16mb',
}));
app.use(express.json());
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

