
import area from '@turf/area';
import { polygon, multiPolygon } from '@turf/helpers';
import { NominatimSearchResult } from '../types';

export const searchCities = async (query: string): Promise<NominatimSearchResult[]> => {
  if (!query || query.length < 3) return [];
  
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&polygon_geojson=1&addressdetails=1&limit=5`
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
