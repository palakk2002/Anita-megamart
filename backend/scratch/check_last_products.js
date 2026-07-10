import dotenv from 'dotenv';
import mongoose from 'mongoose';
import dns from 'node:dns';
import Product from '../app/models/product.js';
dotenv.config();

dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

async function check() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB.");
    const products = await Product.find({}).sort({ createdAt: -1 }).limit(5).lean();
    console.log(`Found ${products.length} products:`);
    for (const p of products) {
      console.log(`- ID: ${p._id}, Name: ${p.name}, Price: ${p.price}, SalePrice: ${p.salePrice}`);
      console.log(`  Variants:`, JSON.stringify(p.variants, null, 2));
    }
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

check();
