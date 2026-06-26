import dotenv from 'dotenv';
import mongoose from 'mongoose';
import dns from 'node:dns';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import FormData from 'form-data';

dotenv.config();
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

// Import models
import Seller from '../app/models/seller.js';
import Category from '../app/models/category.js';

async function test() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB.");

    // Find a seller
    const seller = await Seller.findOne({});
    if (!seller) {
      console.error("No seller found in database!");
      process.exit(1);
    }
    console.log("Using Seller ID:", seller._id);

    // Find a category (header, category, subcategory)
    const category = await Category.findOne({ parentId: { $ne: null } });
    if (!category) {
      console.error("No category found in database!");
      process.exit(1);
    }
    console.log("Using Category ID:", category._id);

    // Create a mock token
    const token = jwt.sign(
      { id: seller._id, role: 'seller' },
      process.env.JWT_SECRET || 'secret123',
      { expiresIn: '1h' }
    );

    // Create form data
    const form = new FormData();
    form.append("name", "Test API Product Upload");
    form.append("slug", "test-api-product-upload-" + Date.now());
    form.append("price", "99");
    form.append("stock", "50");
    
    // Use the category ID for all three levels to satisfy validation
    form.append("headerId", category._id.toString());
    form.append("categoryId", category._id.toString());
    form.append("subcategoryId", category._id.toString());
    form.append("status", "active");

    // Add a dummy 1x1 PNG file
    const dummyPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
    form.append("mainImage", dummyPng, {
      filename: "test.png",
      contentType: "image/png"
    });

    console.log("Sending POST request to /api/products...");
    const response = await axios.post(`http://localhost:7000/api/products`, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${token}`
      }
    });

    console.log("API Response Success:", response.data.success);
    console.log("Product Data returned:", response.data.result || response.data);
    process.exit(0);
  } catch (error) {
    console.error("Upload/API Request FAILED:", error.response?.data || error.message);
    process.exit(1);
  }
}

test();
