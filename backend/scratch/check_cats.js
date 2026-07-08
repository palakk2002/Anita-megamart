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

    // Query like the controller does
    const tree = await Category.find({ type: "header" }).lean();
    console.log("Headers count:", tree.length);
    
    for (const header of tree) {
      const children = await Category.find({ parent: header._id }).lean();
      console.log(`Header: "${header.name}" (${header._id}) has ${children.length} children:`);
      for (const child of children) {
        console.log(`  - Child: "${child.name}" (${child._id}), Type: ${child.type}`);
        const subchildren = await Category.find({ parent: child._id }).lean();
        if (subchildren.length > 0) {
          console.log(`    has ${subchildren.length} subchildren:`);
          for (const sub of subchildren) {
            console.log(`      * Sub: "${sub.name}" (${sub._id}), Type: ${sub.type}`);
          }
        }
      }
    }

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

run();
