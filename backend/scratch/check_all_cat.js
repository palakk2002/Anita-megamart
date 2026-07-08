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

    const allCat = await Category.findOne({ slug: "all" }).lean();
    console.log("Category 'All' details:");
    console.log(JSON.stringify(allCat, null, 2));

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

run();
