import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 1x1 transparent PNG buffer
const buffer = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64"
);

try {
  console.log("Attempting upload...");
  const uploadOptions = {
    folder: "categories",
    resource_type: "image",
  };
  const result = await new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(uploadOptions, (error, res) => {
      if (error) reject(error);
      else resolve(res);
    }).end(buffer);
  });
  console.log("Upload success:", result.secure_url);
} catch (err) {
  console.error("Upload failed:", err);
}
