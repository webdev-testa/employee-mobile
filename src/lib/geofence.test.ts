import { describe, it, expect } from "vitest";
import { getDistance, isWithinArea } from "./geofence";

describe("geofence utility", () => {
  const OFFICE_LAT = -6.19026;
  const OFFICE_LNG = 106.82391;

  it("calculates zero distance for the exact same point", () => {
    const dist = getDistance(OFFICE_LAT, OFFICE_LNG, OFFICE_LAT, OFFICE_LNG);
    expect(Math.round(dist)).toBe(0);
  });

  it("correctly identifies point within 100m radius", () => {
    // Offset slightly (~30m)
    const userLat = -6.1905;
    const userLng = 106.82391;
    const within = isWithinArea(userLat, userLng, OFFICE_LAT, OFFICE_LNG, 100);
    expect(within).toBe(true);
  });

  it("rejects points far outside geofence boundary", () => {
    // 5km away
    const farLat = -6.2400;
    const farLng = 106.82391;
    const within = isWithinArea(farLat, farLng, OFFICE_LAT, OFFICE_LNG, 100);
    expect(within).toBe(false);
  });

  describe("Red-Team Stress & Edge Case Hardening", () => {
    it("safely handles NaN and non-numeric inputs without crashing", () => {
      expect(getDistance(NaN, 106.82, OFFICE_LAT, OFFICE_LNG)).toBe(Infinity);
      expect(getDistance(OFFICE_LAT, NaN, OFFICE_LAT, OFFICE_LNG)).toBe(Infinity);
      expect(isWithinArea(NaN, NaN, OFFICE_LAT, OFFICE_LNG)).toBe(false);
    });

    it("safely handles antipodal points without producing NaN due to floating-point rounding", () => {
      // Antipodal points: North Pole to South Pole
      const dist = getDistance(-90, 0, 90, 0);
      expect(Number.isNaN(dist)).toBe(false);
      expect(dist).toBeGreaterThan(19000000); // Earth half-circumference ~20,000 km
    });

    it("safely handles Null Island (0,0) without returning NaN", () => {
      const dist = getDistance(0, 0, OFFICE_LAT, OFFICE_LNG);
      expect(Number.isFinite(dist)).toBe(true);
      expect(isWithinArea(0, 0, OFFICE_LAT, OFFICE_LNG)).toBe(false);
    });
  });
});
