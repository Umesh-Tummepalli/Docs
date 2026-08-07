import dotenv from "dotenv";
import express from "express";
import { connectMongo } from "./config/mongo.js";
import auth from "./routes/authentication.js"
import cors from "cors";

dotenv.config();

await connectMongo();

const app = express();

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
}))

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.get('/',(req,res)=>{
    res.send("<h1>Server is working 👍</h1>");
})

// Routes
app.use('/auth', auth);


// page not found;
app.use((req, res) => {
  res.status(404).json({ message: "Page not found" });
})

// server listening
app.listen(8000,()=>{
  console.log("server running on port : 8000");
})
