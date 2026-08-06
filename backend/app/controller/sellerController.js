import Seller from "../models/seller.js";
import Transaction from "../models/transaction.js";
import { handleResponse, calculateDistance } from "../utils/helper.js";
import mongoose from "mongoose";
import { invalidateSellerName } from "../services/entityNameCache.js";
import { getSellerCurrentOpenStatus } from "../services/storeStatusService.js";

/* ===============================
   GET NEARBY SELLERS
================================ */
export const getNearbySellers = async (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return handleResponse(res, 400, "Latitude and longitude are required");
    }

    const customerLat = Number(lat);
    const customerLng = Number(lng);

    // Fetch all active/verified sellers
    const sellers = await Seller.find({
      isActive: true,
      isVerified: true,
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [customerLng, customerLat],
          },
          $maxDistance: 100000, // 100km max search area
        },
      },
    }).lean();

    // Filter based on individual service radius and compute store open status
    const nearbySellers = sellers
      .map((seller) => {
        const sellerLng = seller.location.coordinates[0];
        const sellerLat = seller.location.coordinates[1];
        const distance = calculateDistance(
          customerLat,
          customerLng,
          sellerLat,
          sellerLng,
        );

        return {
          ...seller,
          distance,
          isStoreOpen: getSellerCurrentOpenStatus(seller),
        };
      })
      .filter((seller) => seller.distance <= (seller.serviceRadius || 5));

    return handleResponse(
      res,
      200,
      "Nearby sellers fetched successfully",
      nearbySellers,
    );
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

/* ===============================
   REQUEST WITHDRAWAL (Seller)
================================ */
export const requestWithdrawal = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return handleResponse(res, 400, "Please enter a valid amount");
    }

    // 1. Calculate current available balance
    const transactions = await Transaction.find({
      user: sellerId,
      userModel: "Seller",
    })
      .select("status amount type")
      .lean();

    const settledBalance = transactions
      .filter((t) => t.status === "Settled")
      .reduce((acc, t) => acc + (t.amount || 0), 0);

    const pendingPayouts = transactions
      .filter(
        (t) =>
          t.type === "Withdrawal" &&
          (t.status === "Pending" || t.status === "Processing"),
      )
      .reduce((acc, t) => acc + Math.abs(t.amount || 0), 0);

    const availableBalance = settledBalance - pendingPayouts;

    if (amount > availableBalance) {
      return handleResponse(
        res,
        400,
        `Insufficient balance. Available: ₹${availableBalance}`,
      );
    }

    // 2. Create Withdrawal Transaction
    const withdrawal = await Transaction.create({
      user: sellerId,
      userModel: "Seller",
      type: "Withdrawal",
      amount: -Math.abs(amount),
      status: "Pending",
      reference: `WDR-${Date.now()}`,
    });

    return handleResponse(
      res,
      201,
      "Withdrawal request submitted successfully",
      withdrawal,
    );
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

/* ===============================
   GET SELLER PROFILE
================================ */
export const getSellerProfile = async (req, res) => {
  try {
    const seller = await Seller.findById(req.user.id);
    if (!seller) {
      return handleResponse(res, 404, "Seller not found");
    }
    const sellerObj = seller.toObject();
    sellerObj.isStoreOpen = getSellerCurrentOpenStatus(seller);

    return handleResponse(
      res,
      200,
      "Seller profile fetched successfully",
      sellerObj,
    );
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

/* ===============================
   UPDATE SELLER PROFILE
================================ */
export const updateSellerProfile = async (req, res) => {
  try {
    const { name, shopName, phone, address, locality, pincode, city, state, lat, lng, radius, profileImage } = req.body;

    const seller = await Seller.findById(req.user.id);
    if (!seller) {
      return handleResponse(res, 404, "Seller not found");
    }

    if (name) seller.name = name;
    if (shopName) seller.shopName = shopName;
    if (phone) seller.phone = phone;
    if (profileImage !== undefined) seller.profileImage = profileImage;
    if (address !== undefined) seller.address = address;
    if (locality !== undefined) seller.locality = locality;
    if (pincode !== undefined) seller.pincode = pincode;
    if (city !== undefined) seller.city = city;
    if (state !== undefined) seller.state = state;

    if (lat !== undefined && lng !== undefined) {
      if (lat < -90 || lat > 90)
        return handleResponse(res, 400, "Invalid latitude");
      if (lng < -180 || lng > 180)
        return handleResponse(res, 400, "Invalid longitude");

      seller.location = {
        type: "Point",
        coordinates: [Number(lng), Number(lat)],
      };
    }

    if (radius !== undefined) {
      if (radius < 1 || radius > 100)
        return handleResponse(res, 400, "Radius must be between 1 and 100 km");
      seller.serviceRadius = Number(radius);
    }

    const updatedSeller = await seller.save();

    invalidateSellerName(req.user.id).catch((err) => {
      console.warn("[Seller] Name cache invalidation failed:", err.message);
    });

    const sellerObj = updatedSeller.toObject();
    sellerObj.isStoreOpen = getSellerCurrentOpenStatus(updatedSeller);

    return handleResponse(
      res,
      200,
      "Profile updated successfully",
      sellerObj,
    );
  } catch (error) {
    if (error.code === 11000) {
      return handleResponse(res, 400, "Phone number already in use");
    }
    return handleResponse(res, 500, error.message);
  }
};

/* ===============================
   TOGGLE SELLER ONLINE STATUS
================================ */
export const toggleStoreStatus = async (req, res) => {
  try {
    const seller = await Seller.findById(req.user.id);
    if (!seller) {
      return handleResponse(res, 404, "Seller not found");
    }

    const { isOnline } = req.body;
    seller.isOnline = isOnline !== undefined ? Boolean(isOnline) : !seller.isOnline;
    seller.isManualOverride = true;

    await seller.save();
    const isStoreOpen = getSellerCurrentOpenStatus(seller);

    return handleResponse(
      res,
      200,
      `Store status updated to ${seller.isOnline ? "Online" : "Offline"}`,
      {
        isOnline: seller.isOnline,
        isManualOverride: seller.isManualOverride,
        isStoreOpen,
      },
    );
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

/* ===============================
   UPDATE STORE OPERATING HOURS
================================ */
export const updateStoreHours = async (req, res) => {
  try {
    const seller = await Seller.findById(req.user.id);
    if (!seller) {
      return handleResponse(res, 404, "Seller not found");
    }

    const { enabled, schedule, resetManualOverride } = req.body;

    if (enabled !== undefined) {
      seller.storeHours.enabled = Boolean(enabled);
    }

    if (Array.isArray(schedule)) {
      seller.storeHours.schedule = schedule;
    }

    if (resetManualOverride) {
      seller.isManualOverride = false;
    }

    await seller.save();
    const isStoreOpen = getSellerCurrentOpenStatus(seller);

    return handleResponse(
      res,
      200,
      "Store operating hours updated successfully",
      {
        storeHours: seller.storeHours,
        isManualOverride: seller.isManualOverride,
        isStoreOpen,
      },
    );
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

