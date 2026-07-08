import dotenv from 'dotenv';
import mongoose from 'mongoose';
import dns from 'node:dns';
import Category from '../app/models/category.js';
import ExperienceSection from '../app/models/experienceSection.js';
import OfferSection from '../app/models/offerSection.js';

dotenv.config();
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB.");

    const categories = await Category.find({}).lean();
    console.log(`\n--- ALL CATEGORIES (${categories.length}) ---`);
    for (const c of categories) {
      console.log(`- ID: ${c._id}, Name: ${c.name}, Slug: ${c.slug}, Type: ${c.type}, Status: ${c.status}, Parent: ${c.parent}`);
    }

    const expSections = await ExperienceSection.find({}).lean();
    console.log(`\n--- EXPERIENCE SECTIONS (${expSections.length}) ---`);
    for (const s of expSections) {
      console.log(`- ID: ${s._id}, Title: ${s.title}, Type: ${s.displayType}, Enabled: ${s.status}, Order: ${s.order}`);
    }

    const offerSections = await OfferSection.find({}).lean();
    console.log(`\n--- OFFER SECTIONS (${offerSections.length}) ---`);
    for (const o of offerSections) {
      console.log(`- ID: ${o._id}, Title: ${o.title}, Order: ${o.order}, Status: ${o.status}`);
    }

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

run();
