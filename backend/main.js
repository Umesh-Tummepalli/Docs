import express from "express";
import { connectMongo } from "./config/mongo.js";
import dotenv from "dotenv";

dotenv.config();
await connectMongo();

const app=express();
app.get('/',(req,res)=>{
    res.send("<h1>Server is working 👍</h1>");
})

app.use((req, res) => {
  res.status(404).json({ message: "Page not found" });
})
app.listen("8000",()=>{
  console.log("server running on port : 8000");
})
