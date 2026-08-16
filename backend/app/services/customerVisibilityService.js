import Seller from "../models/seller.js";
import { calculateDistance } from "../utils/helper.js";
import { buildKey, getOrSet, getTTL } from "./cacheService.js";

const MAX_SELLER_SEARCH_DISTANCE_M = 100000;

export function parseCustomerCoordinates(query = {}) {
  const lat = Number(query.lat);
  const lng = Number(query.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { valid: false, lat: null, lng: null };
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return { valid: false, lat: null, lng: null };
  }

  return { valid: true, lat, lng };
}

/**
 * Round lat/lng to 4 decimal places (~11m precision) for cache key.
 * This groups nearby requests into the same cache bucket.
 */
function buildNearbySellersKey(lat, lng) {
  const rLat = Number(lat).toFixed(4);
  const rLng = Number(lng).toFixed(4);
  return buildKey("sellers", "nearby", `${rLat}:${rLng}`);
}

export async function getNearbySellerIdsForCustomer(lat, lng) {
  const fetchFn = async () => {
    // 1. Fetch sellers matching 2dsphere near query
    const geoSellers = await Seller.find({
      isActive: true,
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [lng, lat],
          },
          $maxDistance: MAX_SELLER_SEARCH_DISTANCE_M,
        },
      },
    })
      .select("_id location serviceRadius")
      .lean();

    // 2. Fetch active approved sellers with default [0, 0] coordinates or missing location
    const unassignedSellers = await Seller.find({
      isActive: true,
      $or: [
        { "location.coordinates": [0, 0] },
        { location: { $exists: false } },
        { "location.coordinates": { $exists: false } },
      ],
    })
      .select("_id")
      .lean();

    const matchedGeoIds = geoSellers
      .filter((seller) => {
        const coords = seller?.location?.coordinates;
        if (!Array.isArray(coords) || coords.length < 2) return false;
        const [sellerLng, sellerLat] = coords;
        if (!Number.isFinite(sellerLat) || !Number.isFinite(sellerLng)) {
          return false;
        }
        if (sellerLng === 0 && sellerLat === 0) return true;
        const distanceKm = calculateDistance(lat, lng, sellerLat, sellerLng);
        const effectiveRadius = Math.max(Number(seller.serviceRadius) || 25, 25);
        return distanceKm <= effectiveRadius;
      })
      .map((seller) => String(seller._id));

    const unassignedIds = unassignedSellers.map((seller) => String(seller._id));
    const allIds = [...new Set([...matchedGeoIds, ...unassignedIds])];

    if (allIds.length === 0) {
      // Fallback: If no sellers matched specific radius, include all active approved sellers
      const fallbackSellers = await Seller.find({
        isActive: true,
        applicationStatus: { $ne: "rejected" },
      }).select("_id").lean();
      return fallbackSellers.map((seller) => String(seller._id));
    }

    return allIds;
  };

  return getOrSet(buildNearbySellersKey(lat, lng), fetchFn, getTTL("nearbySellers"));
}
