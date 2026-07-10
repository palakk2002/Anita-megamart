import dotenv from 'dotenv';
import mongoose from 'mongoose';
import dns from 'node:dns';
import ExperienceSection from '../app/models/experienceSection.js';
dotenv.config();

dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

async function check() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected.");
    const section = await ExperienceSection.findById("69c900ee386933e28f670988").lean();
    console.log("Section Config:", JSON.stringify(section, null, 2));
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

check();
