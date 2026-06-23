import mongoose from 'mongoose';
import dns from 'node:dns';
import dotenv from 'dotenv';
import Setting from '../app/models/setting.js';

dotenv.config();

// Apply public DNS resolvers to resolve MongoDB Atlas SRV addresses
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

async function run() {
    try {
        console.log("Connecting to MongoDB (using public DNS resolvers)...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected successfully.");

        // Find settings documents
        const settingsCount = await Setting.countDocuments();
        console.log(`Found ${settingsCount} settings document(s) in database.`);

        if (settingsCount === 0) {
            console.log("No settings document found. Creating a new one with new contact details...");
            const newSettings = await Setting.create({
                supportEmail: "info@anitamegart.com",
                supportPhone: "02269621920",
                address: "Ramkrishna Nagar patna 800020"
            });
            console.log("Created settings:", newSettings);
        } else {
            console.log("Updating existing settings document(s) with new contact details...");
            const result = await Setting.updateMany({}, {
                $set: {
                    supportEmail: "info@anitamegart.com",
                    supportPhone: "02269621920",
                    address: "Ramkrishna Nagar patna 800020"
                }
            });
            console.log(`Updated ${result.modifiedCount} document(s).`);
        }

        process.exit(0);
    } catch (error) {
        console.error("Error updating settings in database:", error);
        process.exit(1);
    }
}

run();
