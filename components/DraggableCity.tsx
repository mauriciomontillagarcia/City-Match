
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { CityBoundary } from '../types';

interface DraggableCityProps {
  city: CityBoundary;
  map: L.Map;
  onDrag: (id: string, newPos: [number, number]) => void;
  onRemove: (id: string) => void;
}

const DraggableCity: React.FC<DraggableCityProps> = ({ city, map, onDrag, onRemove }) => {
  const layerRef = useRef<L.LayerGroup | null>(null);
  const polygonRef = useRef<L.Polygon | null>(null);

  useEffect(() => {
    if (!map) return;

    const group = L.layerGroup().addTo(map);
    layerRef.current = group;

    const renderPolygon = () => {
      if (polygonRef.current) {
        group.removeLayer(polygonRef.current);
      }

      // GeoJSON to coordinates
      // TrueSize logic: take points relative to original centroid, add new currentPosition.
      const transformCoord = (coord: [number, number]): [number, number] => {
        // Simple linear shift (Lat/Lng)
        // Note: For extreme accuracy at different latitudes, we'd need to adjust 
        // for longitude squeeze, but for city-scale visual comparison, a linear 
        // offset from the centroid is a common and effective "TrueSize" approximation.
        const latDiff = coord[1] - city.centroid[0];
        const lngDiff = coord[0] - city.centroid[1];
        return [city.currentPosition[0] + latDiff, city.currentPosition[1] + lngDiff];
      };

      const getPoints = (geometry: any): any => {
        if (geometry.type === 'Polygon') {
          return geometry.coordinates[0].map(transformCoord);
        }
        if (geometry.type === 'MultiPolygon') {
           return geometry.coordinates.map((poly: any) => 
             poly[0].map(transformCoord)
           );
        }
        return [];
      };

      const latlngs = getPoints(city.geojson);
      const polygon = L.polygon(latlngs, {
        color: city.color,
        fillColor: city.color,
        fillOpacity: 0.35,
        weight: 3,
        interactive: true,
        className: 'city-boundary-path',
      }).addTo(group);

      // Custom drag implementation
      let isDragging = false;
      let startMousePos: L.LatLng | null = null;
      let startCityPos: [number, number] = [city.currentPosition[0], city.currentPosition[1]];

      polygon.on('mousedown', (e: L.LeafletMouseEvent) => {
        isDragging = true;
        startMousePos = e.latlng;
        startCityPos = [city.currentPosition[0], city.currentPosition[1]];
        map.dragging.disable();
        L.DomEvent.stopPropagation(e as any);
      });

      map.on('mousemove', (e: L.LeafletMouseEvent) => {
        if (!isDragging || !startMousePos) return;
        const deltaLat = e.latlng.lat - startMousePos.lat;
        const deltaLng = e.latlng.lng - startMousePos.lng;
        onDrag(city.id, [startCityPos[0] + deltaLat, startCityPos[1] + deltaLng]);
      });

      const stopDrag = () => {
        if (isDragging) {
          isDragging = false;
          map.dragging.enable();
        }
      };

      map.on('mouseup', stopDrag);
      polygon.on('mouseup', stopDrag);

      // Custom style for the boundary on hover
      polygon.on('mouseover', () => {
        polygon.setStyle({ fillOpacity: 0.5, weight: 4 });
      });
      polygon.on('mouseout', () => {
        polygon.setStyle({ fillOpacity: 0.35, weight: 3 });
      });

      polygon.bindPopup(`
        <div class="p-2 min-w-[120px]">
          <div class="flex items-center gap-2 mb-1">
            <div class="w-2 h-2 rounded-full" style="background-color: ${city.color}"></div>
            <strong class="text-slate-800">${city.name}</strong>
          </div>
          <p class="text-[10px] text-slate-400 uppercase tracking-tighter mb-2 font-bold">Boundary Layer</p>
          <button id="remove-${city.id}" class="w-full py-1.5 px-3 bg-red-50 text-red-500 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-2">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            Remove
          </button>
        </div>
      `, {
        className: 'custom-popup',
        offset: [0, -10]
      });

      polygon.on('popupopen', () => {
        const btn = document.getElementById(`remove-${city.id}`);
        if (btn) btn.onclick = () => onRemove(city.id);
      });

      polygonRef.current = polygon;
    };

    renderPolygon();

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
      }
    };
  }, [map, city.currentPosition, city.id, city.color]);

  return null;
};

export default DraggableCity;
