import dotenv from 'dotenv';
import mongoose from 'mongoose';
import dns from 'node:dns';
import Product from '../app/models/product.js';
import Category from '../app/models/category.js';

dotenv.config();
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB.");

    const products = await Product.find({}).limit(10).lean();
    console.log("\n--- PRODUCTS AND CATEGORIES ---");
    for (const p of products) {
      console.log(`Product: "${p.name}"`);
      console.log(`  - categoryId: ${p.categoryId}`);
      console.log(`  - subcategoryId: ${p.subcategoryId}`);
      console.log(`  - headerId: ${p.headerId}`);
      
      const cat = p.categoryId ? await Category.findById(p.categoryId).lean() : null;
      const sub = p.subcategoryId ? await Category.findById(p.subcategoryId).lean() : null;
      const head = p.headerId ? await Category.findById(p.headerId).lean() : null;
      
      console.log(`  - Category: ${cat ? cat.name + ' (' + cat.type + ')' : 'null'}`);
      console.log(`  - Subcategory: ${sub ? sub.name + ' (' + sub.type + ')' : 'null'}`);
      console.log(`  - Header: ${head ? head.name + ' (' + head.type + ')' : 'null'}`);
    }

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

run();
