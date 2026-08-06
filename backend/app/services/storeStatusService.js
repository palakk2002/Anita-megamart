/**
 * Utility to evaluate whether a seller's shop is currently open/online.
 *
 * Rules:
 * 1. If seller is inactive or application not approved, shop is closed.
 * 2. If seller has set a manual override (isManualOverride === true), respects seller.isOnline.
 * 3. If seller has enabled automatic operating hours (storeHours.enabled === true):
 *    - Evaluates schedule for current day & time.
 * 4. Defaults to seller.isOnline (default true).
 */

const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function getSellerCurrentOpenStatus(seller, date = new Date()) {
  if (!seller) return false;

  // Account inactive or rejected/pending check if applicable
  if (seller.isActive === false) return false;
  if (seller.applicationStatus && seller.applicationStatus !== "approved") return false;

  // If manual override is active, respect manual toggle
  if (seller.isManualOverride) {
    return Boolean(seller.isOnline ?? true);
  }

  // If operating hours schedule is enabled, check current time vs schedule
  if (seller.storeHours?.enabled && Array.isArray(seller.storeHours.schedule) && seller.storeHours.schedule.length > 0) {
    // Determine current day of week in local/IST time
    // We can use Intl.DateTimeFormat for Asia/Kolkata or system local
    const dayName = DAYS_OF_WEEK[date.getDay()];
    const daySchedule = seller.storeHours.schedule.find((s) => s.day === dayName);

    if (daySchedule) {
      if (daySchedule.isOpen === false) {
        return false;
      }

      if (daySchedule.openTime && daySchedule.closeTime) {
        const currentHours = String(date.getHours()).padStart(2, "0");
        const currentMinutes = String(date.getMinutes()).padStart(2, "0");
        const currentTimeStr = `${currentHours}:${currentMinutes}`;

        const open = daySchedule.openTime.trim();
        const close = daySchedule.closeTime.trim();

        if (open <= close) {
          // Standard daytime shift (e.g., 09:00 to 21:00)
          return currentTimeStr >= open && currentTimeStr <= close;
        } else {
          // Overnight shift (e.g., 22:00 to 04:00)
          return currentTimeStr >= open || currentTimeStr <= close;
        }
      }
    }
  }

  // Fallback to manual status
  return Boolean(seller.isOnline ?? true);
}
