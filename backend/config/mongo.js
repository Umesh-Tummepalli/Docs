import mongoose from "mongoose";
export const connectMongo = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected");
  }
  catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

process.on("SIGINT",async ()=>{
  console.log("gracefully shutting down");
  try {
    await mongoose.connection.close();
    process.exit(0);
  }
  catch (error) {
    console.error("Error closing MongoDB connection:", error);
    process.exit(1);
  }
})