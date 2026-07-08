import dotenv from 'dotenv';
import mongoose from 'mongoose';
import dns from 'node:dns';
import Category from '../app/models/category.js';

dotenv.config();
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB.");

    const dbCats = await Category.find({ type: "header" }).lean();
    console.log("\n--- HEADER CATEGORY DETAILS ---");
    for (const c of dbCats) {
      console.log(`- ID: ${c._id}, Name: ${c.name}, headerColor: ${c.headerColor}, headerFontColor: ${c.headerFontColor}, headerIconColor: ${c.headerIconColor}`);
    }

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

run();
