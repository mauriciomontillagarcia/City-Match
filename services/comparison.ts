
import { CityBoundary } from '../types';

export interface Comparison {
  larger: CityBoundary;
  smaller: CityBoundary;
  /** larger area / smaller area, always >= 1 */
  ratio: number;
}

/** Compares the first two cities; null if there are fewer than two or an area is unknown. */
export const compareCities = (cities: CityBoundary[]): Comparison | null => {
  if (cities.length < 2) return null;
  const [a, b] = cities;
  const larger = a.areaKm2 >= b.areaKm2 ? a : b;
  const smaller = larger === a ? b : a;
  if (smaller.areaKm2 <= 0) return null;

  return { larger, smaller, ratio: larger.areaKm2 / smaller.areaKm2 };
};
