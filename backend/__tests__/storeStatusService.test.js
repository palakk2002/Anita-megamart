import { getSellerCurrentOpenStatus } from "../app/services/storeStatusService.js";

describe("storeStatusService", () => {
  it("should return false if seller is inactive or not approved", () => {
    expect(getSellerCurrentOpenStatus({ isActive: false, applicationStatus: "approved" })).toBe(false);
    expect(getSellerCurrentOpenStatus({ isActive: true, applicationStatus: "pending" })).toBe(false);
  });

  it("should respect manual override if isManualOverride is true", () => {
    const sellerOnlineOverride = {
      isActive: true,
      applicationStatus: "approved",
      isOnline: true,
      isManualOverride: true,
      storeHours: { enabled: true, schedule: [] },
    };
    expect(getSellerCurrentOpenStatus(sellerOnlineOverride)).toBe(true);

    const sellerOfflineOverride = {
      isActive: true,
      applicationStatus: "approved",
      isOnline: false,
      isManualOverride: true,
    };
    expect(getSellerCurrentOpenStatus(sellerOfflineOverride)).toBe(false);
  });

  it("should evaluate operating hours schedule when storeHours.enabled is true", () => {
    // Current test date: Monday 14:30
    const mondayAfternoon = new Date("2026-08-10T14:30:00Z"); // Monday

    const sellerWithSchedule = {
      isActive: true,
      applicationStatus: "approved",
      isOnline: true,
      isManualOverride: false,
      storeHours: {
        enabled: true,
        schedule: [
          { day: "Monday", openTime: "09:00", closeTime: "21:00", isOpen: true },
          { day: "Tuesday", openTime: "09:00", closeTime: "21:00", isOpen: false },
        ],
      },
    };

    expect(getSellerCurrentOpenStatus(sellerWithSchedule, mondayAfternoon)).toBe(true);
  });

  it("should return false if schedule specifies day is closed", () => {
    const tuesdayAfternoon = new Date("2026-08-11T14:30:00Z"); // Tuesday

    const sellerClosedTuesday = {
      isActive: true,
      applicationStatus: "approved",
      isOnline: true,
      isManualOverride: false,
      storeHours: {
        enabled: true,
        schedule: [
          { day: "Tuesday", openTime: "09:00", closeTime: "21:00", isOpen: false },
        ],
      },
    };

    expect(getSellerCurrentOpenStatus(sellerClosedTuesday, tuesdayAfternoon)).toBe(false);
  });
});
