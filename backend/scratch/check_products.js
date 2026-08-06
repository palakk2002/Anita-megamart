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
    const missing = await Product.find({
      $or: [
        { mainImage: { $exists: false } },
        { mainImage: null },
        { mainImage: "" }
      ]
    }).lean();

    console.log(`Found ${missing.length} products missing mainImage:`);
    const withOtherImg = missing.filter(
      (p) => p.image || (p.galleryImages && p.galleryImages.length > 0) || p.thumbnail
    );
    console.log(`Products having image in other fields: ${withOtherImg.length}`);
    if (withOtherImg.length > 0) {
      console.log("Sample with other fields:", withOtherImg.slice(0, 5).map(p => ({ id: p._id, name: p.name, image: p.image, gallery: p.galleryImages })));
    }

    console.log("\nSample missing products:");
    missing.slice(0, 10).forEach((p, i) => {
      console.log(`${i + 1}. [${p._id}] "${p.name}" (image: ${p.image}, gallery: ${JSON.stringify(p.galleryImages)})`);
    });

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

check();
