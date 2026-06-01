import express from "express";

const app=express();

app.listen("8000",()=>{
  console.log("server running on port : 8000");
})

app.get('/',(req,res)=>{
    res.send("<h1>Server is working 👍</h1>");
})

process.on("SIGINT",()=>{
  console.log("gracefully shutting down");
  process.exit(0);
})