export function getDistance(
  userLat: number | unknown, userLng: number | unknown,
  officeLat: number | unknown, officeLng: number | unknown
): number {
  const uLat = Number(userLat);
  const uLng = Number(userLng);
  const oLat = Number(officeLat);
  const oLng = Number(officeLng);

  if (
    !Number.isFinite(uLat) || !Number.isFinite(uLng) ||
    !Number.isFinite(oLat) || !Number.isFinite(oLng)
  ) {
    return Infinity;
  }

  const R = 6371000;
  const dLat = ((oLat - uLat) * Math.PI) / 180;
  const dLng = ((oLng - uLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((uLat * Math.PI) / 180) *
      Math.cos((oLat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;

  // Clamp a between 0 and 1 to prevent NaN from floating point rounding errors
  const clampedA = Math.min(1, Math.max(0, a));
  return R * 2 * Math.atan2(Math.sqrt(clampedA), Math.sqrt(1 - clampedA));
}

export function isWithinArea(
  userLat: number | unknown, userLng: number | unknown,
  officeLat: number | unknown, officeLng: number | unknown,
  radiusMeters: number = 100
): boolean {
  const dist = getDistance(userLat, userLng, officeLat, officeLng);
  return Number.isFinite(dist) && dist <= radiusMeters;
}

export interface BranchOffice {
  id: string;
  name: string;
  address?: string;
  lat: number;
  lng: number;
  radius: number;
  is_active?: boolean;
}

export const DEFAULT_BRANCHES: BranchOffice[] = [
  {
    id: "malang-cabang-2",
    name: "Dr. Meoww Cabang 2 - Malang",
    address: "Grooming dan Penitipan Kucing Malang",
    lat: -8.0097357,
    lng: 112.6106983,
    radius: 100,
    is_active: true,
  },
];

const STORAGE_KEY_BRANCHES = 'dr_meow_branches_cache';

export function getCachedBranches(): BranchOffice[] {
  if (typeof window === 'undefined') return DEFAULT_BRANCHES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BRANCHES);
    if (!raw) return DEFAULT_BRANCHES;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_BRANCHES;
    const valid = parsed
      .filter(
        (b): b is BranchOffice =>
          b != null &&
          typeof b === 'object' &&
          Number.isFinite(Number(b.lat)) &&
          Number.isFinite(Number(b.lng))
      )
      .map((b) => ({
        ...b,
        name: String(b.name || 'Cabang'),
        lat: Number(b.lat),
        lng: Number(b.lng),
        radius: Number(b.radius) || 100,
        is_active: b.is_active !== false,
      }));
    return valid.length > 0 ? valid : DEFAULT_BRANCHES;
  } catch {
    return DEFAULT_BRANCHES;
  }
}

export function saveCachedBranches(branches: BranchOffice[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_BRANCHES, JSON.stringify(branches));
  } catch {}
}

export function getNearestBranch(
  userLat: number,
  userLng: number,
  branches: BranchOffice[] = DEFAULT_BRANCHES
): { branch: BranchOffice; distance: number; isInside: boolean } | null {
  const activeBranches = branches.filter((b) => b.is_active !== false);
  if (activeBranches.length === 0) return null;

  let minDistance = Infinity;
  let nearest: BranchOffice = activeBranches[0];

  for (const b of activeBranches) {
    const dist = getDistance(userLat, userLng, b.lat, b.lng);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = b;
    }
  }

  return {
    branch: nearest,
    distance: minDistance,
    isInside: minDistance <= (nearest.radius || 100),
  };
}

export function isWithinAnyBranch(
  userLat: number,
  userLng: number,
  branches: BranchOffice[] = DEFAULT_BRANCHES
): boolean {
  const result = getNearestBranch(userLat, userLng, branches);
  return result ? result.isInside : false;
}