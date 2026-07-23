import mongoose from "mongoose";

async function checkLocalMongo() {
  try {
    console.log("Checking local MongoDB connection...");
    await mongoose.connect("mongodb://localhost:27017/quickcommerce", {
      serverSelectionTimeoutMS: 2000
    });
    console.log("Successfully connected to local MongoDB!");
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Local MongoDB is NOT running or reachable:", err.message);
    process.exit(1);
  }
}

checkLocalMongo();
