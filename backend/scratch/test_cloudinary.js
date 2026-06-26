import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function test() {
  try {
    console.log("Config:", {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET ? "PRESENT" : "MISSING"
    });
    console.log("Uploading dummy image...");
    // Upload a small 1x1 transparent PNG pixel base64
    const result = await cloudinary.uploader.upload("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", {
      folder: "test_products"
    });
    console.log("Upload SUCCESS! URL:", result.secure_url);
    process.exit(0);
  } catch (error) {
    console.error("Upload FAILED:", error);
    process.exit(1);
  }
}

test();
