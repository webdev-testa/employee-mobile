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
});
