
import area from '@turf/area';
import { polygon, multiPolygon } from '@turf/helpers';
import { NominatimSearchResult } from '../types';

// Outline simplification tolerance in degrees (~30 m). Cuts response size by
// roughly 75% while changing computed areas by well under 0.1%.
const POLYGON_THRESHOLD = 0.0003;

const hasOutline = (r: NominatimSearchResult) =>
  r.geojson?.type === 'Polygon' || r.geojson?.type === 'MultiPolygon';

/**
 * Searches places that have an outline. Throws on network/server errors
 * (including AbortError when `signal` is aborted) so callers can tell
 * "no results" apart from "search failed".
 */
export const searchCities = async (
  query: string,
  lang: string,
  signal?: AbortSignal
): Promise<NominatimSearchResult[]> => {
  if (!query || query.length < 3) return [];

  const params = new URLSearchParams({
    q: query,
    format: 'json',
    polygon_geojson: '1',
    polygon_threshold: String(POLYGON_THRESHOLD),
    addressdetails: '1',
    limit: '5',
    'accept-language': lang,
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { signal });
  if (!response.ok) throw new Error(`Search failed: ${response.status}`);
  const data: NominatimSearchResult[] = await response.json();
  return data.filter(hasOutline);
};

export const calculateArea = (geojson: any): number => {
  try {
    if (!geojson) return 0;
    
    let turfFeature;
    if (geojson.type === 'Polygon') {
      turfFeature = polygon(geojson.coordinates);
    } else if (geojson.type === 'MultiPolygon') {
      turfFeature = multiPolygon(geojson.coordinates);
    } else {
      return 0;
    }

    const areaInSqMeters = area(turfFeature);
    return areaInSqMeters / 1000000; // Convert to km2
  } catch (error) {
    console.error('Error calculating area:', error);
    return 0;
  }
};

const MAX_LAT = 85;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/**
 * Moves a city outline from its original centroid to a new position while
 * preserving its real ground size. One degree of latitude is roughly constant,
 * but a degree of longitude shrinks with cos(lat), so each vertex's longitude
 * offset is rescaled for the latitude it lands on.
 * Returns Leaflet-ready [lat, lng] rings (holes included).
 */
export const shiftGeometry = (
  geojson: any,
  centroid: [number, number],
  position: [number, number]
): any => {
  const dLat = position[0] - centroid[0];

  const shift = ([lng, lat]: number[]): [number, number] => {
    const newLat = Math.max(-MAX_LAT, Math.min(MAX_LAT, lat + dLat));
    const scale = Math.cos(toRad(lat)) / Math.cos(toRad(newLat));
    return [newLat, position[1] + (lng - centroid[1]) * scale];
  };
  const shiftRing = (ring: number[][]) => ring.map(shift);

  if (geojson?.type === 'Polygon') {
    return geojson.coordinates.map(shiftRing);
  }
  if (geojson?.type === 'MultiPolygon') {
    return geojson.coordinates.map((poly: number[][][]) => poly.map(shiftRing));
  }
  return [];
};
