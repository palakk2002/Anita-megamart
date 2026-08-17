import dotenv from 'dotenv';
import mongoose from 'mongoose';
import dns from 'node:dns';
import Category from '../app/models/category.js';
import Product from '../app/models/product.js';

dotenv.config();
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB.");

    const catId = "6a71af27415ced00e0975f4e";
    const targetCat = await Category.findById(catId).lean();
    console.log("Target Category:", JSON.stringify(targetCat, null, 2));

    const directChildren = await Category.find({ parentId: catId }).lean();
    console.log("Direct Children:", directChildren.length);
    for (const c of directChildren) {
      console.log(`  - Child: "${c.name}" (${c._id}), Type: ${c.type}, Status: ${c.status}`);
      const subs = await Category.find({ parentId: c._id }).lean();
      console.log(`    has ${subs.length} subchildren`);
      for (const s of subs) {
        console.log(`      * Sub: "${s.name}" (${s._id}), Status: ${s.status}`);
      }
    }

    const productsCount = await Product.countDocuments({ headerId: catId });
    console.log("Products count with headerId:", productsCount);

    const productsCountCat = await Product.countDocuments({ categoryId: catId });
    console.log("Products count with categoryId:", productsCountCat);

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

run();
