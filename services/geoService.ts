
import area from '@turf/area';
import { polygon, multiPolygon } from '@turf/helpers';
import { NominatimSearchResult } from '../types';

export const searchCities = async (query: string, lang: string): Promise<NominatimSearchResult[]> => {
  if (!query || query.length < 3) return [];
  
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&polygon_geojson=1&addressdetails=1&limit=5&accept-language=${lang}`
    );
    if (!response.ok) throw new Error('Search failed');
    return await response.json();
  } catch (error) {
    console.error('Error searching cities:', error);
    return [];
  }
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
