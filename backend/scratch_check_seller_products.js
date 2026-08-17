import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

import Seller from "./app/models/seller.js";
import Product from "./app/models/product.js";

async function main() {
  try {
    const mongoUri = process.env.MONGO_URI;
    console.log("Connecting to:", mongoUri);
    await mongoose.connect(mongoUri);
    console.log("Connected successfully!");

    const seller = await Seller.findOne({ email: "as0077330@gmail.com" });
    if (!seller) {
      console.log("Seller not found!");
      await mongoose.disconnect();
      return;
    }

    console.log("Found Seller:", {
      id: seller._id.toString(),
      name: seller.name,
      email: seller.email,
      shopName: seller.shopName,
      isActive: seller.isActive,
      isVerified: seller.isVerified,
      applicationStatus: seller.applicationStatus
    });

    const productsCount = await Product.countDocuments({ sellerId: seller._id });
    console.log(`Total products for this seller in DB: ${productsCount}`);

    const products = await Product.find({ sellerId: seller._id }).lean();
    
    // Group by header category
    const headerCounts = {};
    for (const p of products) {
      const hId = String(p.headerId || "none");
      headerCounts[hId] = (headerCounts[hId] || 0) + 1;
    }

    console.log("Products count by Header ID in DB:", headerCounts);

    // Let's get header category names
    const categories = await mongoose.connection.db.collection("categories").find({}).toArray();
    const categoryMap = {};
    for (const c of categories) {
      categoryMap[String(c._id)] = c.name;
    }

    console.log("Header Category names & counts for seller:");
    for (const [hId, count] of Object.entries(headerCounts)) {
      const name = categoryMap[hId] || "Unknown Category";
      console.log(`- ${name} (${hId}): ${count} products`);
    }

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

main();
