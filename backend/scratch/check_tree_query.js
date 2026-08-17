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

    const selectFields = "name slug image iconId type parentId headerColor headerFontColor headerIconColor";
    const tree = await Category.find({ type: "header" })
      .select(selectFields)
      .populate({
        path: "children",
        select: selectFields,
        populate: {
          path: "children",
          select: selectFields,
        },
      })
      .sort({ name: 1, _id: 1 })
      .lean();

    console.log("Tree count:", tree.length);
    const coldDrinks = tree.find(h => String(h._id) === "6a71af27415ced00e0975f4e");
    if (coldDrinks) {
      console.log("Cold Drinks & Juices Header Category:", {
        id: coldDrinks._id,
        name: coldDrinks.name,
        type: coldDrinks.type,
        childrenCount: coldDrinks.children ? coldDrinks.children.length : 'undefined',
      });
      if (coldDrinks.children) {
        console.log("Children of Cold Drinks & Juices:");
        coldDrinks.children.forEach(c => {
          console.log(`  - ${c.name} (${c._id}), type: ${c.type}, childrenCount: ${c.children ? c.children.length : 'undefined'}`);
        });
      }
    } else {
      console.log("Cold Drinks & Juices not found in tree.");
    }

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

run();
