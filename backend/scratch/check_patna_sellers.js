import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import dns from "node:dns";
import { fileURLToPath } from "url";
import Seller from "../app/models/seller.js";
import Product from "../app/models/product.js";

dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB.");

  // Ramkrishna Nagar, Patna coordinates: lat 25.5788, lng 85.1432
  const patnaLat = 25.5788;
  const patnaLng = 85.1432;

  const sellers = await Seller.find({ isActive: true }).lean();
  console.log(`Found ${sellers.length} active sellers in total.`);

  let patnaSellerId = null;
  for (const seller of sellers) {
    const coords = seller.location?.coordinates;
    const name = seller.businessName || seller.fullName || seller.email;
    const serviceRadius = seller.serviceRadius || 25;
    console.log(`Seller ID: ${seller._id} | "${name}" | Coords: ${JSON.stringify(coords)} | Service Radius: ${serviceRadius}km`);
    if (seller.email === "as0077330@gmail.com") {
      patnaSellerId = String(seller._id);
    }
  }

  if (patnaSellerId) {
    console.log(`Patna Seller ID: ${patnaSellerId}`);
    const patnaProducts = await Product.find({ sellerId: patnaSellerId }).lean();
    console.log(`Patna Seller has ${patnaProducts.length} total products in the DB.`);
    
    const patnaColdDrinks = await Product.find({ sellerId: patnaSellerId, headerId: "6a71af27415ced00e0975f4e" }).lean();
    console.log(`Patna Seller has ${patnaColdDrinks.length} Cold Drinks & Juices products.`);
    for (const p of patnaColdDrinks) {
      console.log(`  - Patna Product: "${p.name}" (ID: ${p._id}), Status: ${p.status}, Approval: ${p.approvalStatus}`);
    }
  }

  // Find products for "Cold Drinks & Juices" (headerId = 6a71af27415ced00e0975f4e)
  const products = await Product.find({ headerId: "6a71af27415ced00e0975f4e" }).lean();
  console.log(`Found ${products.length} products for Cold Drinks & Juices in total.`);
  
  if (products.length > 0) {
    const sellerIdsOfProducts = [...new Set(products.map(p => String(p.sellerId)))];
    console.log(`These products belong to sellers: ${JSON.stringify(sellerIdsOfProducts)}`);
  }

  await mongoose.disconnect();
}

run().catch(console.error);
