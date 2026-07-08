import dotenv from 'dotenv';
import mongoose from 'mongoose';
import dns from 'node:dns';
import ExperienceSection from '../app/models/experienceSection.js';

dotenv.config();
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB.");

    const expSections = await ExperienceSection.find({}).lean();
    console.log("\n--- EXPERIENCE SECTIONS CONFIG ---");
    for (const s of expSections) {
      console.log(`Section: "${s.title}" (${s.displayType})`);
      console.log("Config:", JSON.stringify(s.config, null, 2));
    }

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

run();
