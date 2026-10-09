
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { CityBoundary } from '../types';
import { shiftGeometry } from '../services/geoService';

interface DraggableCityProps {
  city: CityBoundary;
  map: L.Map;
  onDrag: (id: string, newPos: [number, number]) => void;
  onRemove: (id: string) => void;
  removeLabel: string;
  formatNumber: (value: number) => string;
}

const BASE_STYLE = { fillOpacity: 0.35, weight: 3 };
const ACTIVE_STYLE = { fillOpacity: 0.5, weight: 4 };
// Pixels a pointer must travel before a press becomes a drag (keeps taps as taps)
const DRAG_THRESHOLD = 4;
const MAX_POSITION_LAT = 80;

const DraggableCity: React.FC<DraggableCityProps> = ({ city, map, onDrag, onRemove, removeLabel, formatNumber }) => {
  const polygonRef = useRef<L.Polygon | null>(null);
  const popupRef = useRef<L.Popup | null>(null);

  // Latest values for the long-lived event handlers below
  const cityRef = useRef(city);
  cityRef.current = city;
  const onDragRef = useRef(onDrag);
  onDragRef.current = onDrag;
  const onRemoveRef = useRef(onRemove);
  onRemoveRef.current = onRemove;
  const labelsRef = useRef({ removeLabel, formatNumber });
  labelsRef.current = { removeLabel, formatNumber };

  // Create the polygon and its drag handling once per city
  useEffect(() => {
    const initial = cityRef.current;
    const polygon = L.polygon(shiftGeometry(initial.geojson, initial.centroid, initial.currentPosition), {
      color: initial.color,
      fillColor: initial.color,
      ...BASE_STYLE,
      interactive: true,
      className: 'city-boundary-path',
    }).addTo(map);
    polygonRef.current = polygon;

    const el = polygon.getElement() as SVGPathElement | undefined;
    let drag: {
      pointerId: number;
      startX: number;
      startY: number;
      startLatLng: L.LatLng;
      startPos: [number, number];
      moved: boolean;
    } | null = null;
    let suppressClick = false;
    let frame = 0;
    let pending: [number, number] | null = null;

    const flush = () => {
      frame = 0;
      if (pending) {
        onDragRef.current(cityRef.current.id, pending);
        pending = null;
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      if (!e.isPrimary || e.button !== 0) return;
      // Keep the map from panning: stop the event before it reaches the map
      // container and disable map dragging before any touch/mouse compat events fire
      e.stopPropagation();
      try {
        // Keeps move/up events coming even if the finger leaves the outline
        el?.setPointerCapture(e.pointerId);
      } catch {
        // Pointer no longer active; dragging still works while over the outline
      }
      map.dragging.disable();
      suppressClick = false;
      drag = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        startLatLng: map.mouseEventToLatLng(e),
        startPos: [cityRef.current.currentPosition[0], cityRef.current.currentPosition[1]],
        moved: false,
      };
      polygon.setStyle(ACTIVE_STYLE);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.pointerId) return;
      if (!drag.moved) {
        if (Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < DRAG_THRESHOLD) return;
        drag.moved = true;
        map.closePopup();
      }
      const latlng = map.mouseEventToLatLng(e);
      const lat = drag.startPos[0] + latlng.lat - drag.startLatLng.lat;
      pending = [
        Math.max(-MAX_POSITION_LAT, Math.min(MAX_POSITION_LAT, lat)),
        drag.startPos[1] + latlng.lng - drag.startLatLng.lng,
      ];
      if (!frame) frame = requestAnimationFrame(flush);
    };

    const endDrag = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.pointerId) return;
      suppressClick = drag.moved;
      drag = null;
      map.dragging.enable();
      polygon.setStyle(BASE_STYLE);
    };

    el?.addEventListener('pointerdown', onPointerDown);
    el?.addEventListener('pointermove', onPointerMove);
    el?.addEventListener('pointerup', endDrag);
    el?.addEventListener('pointercancel', endDrag);

    const buildPopupContent = () => {
      const current = cityRef.current;
      // Padding inline: Leaflet measures the popup before the Tailwind CDN styles new classes
      const root = L.DomUtil.create('div');
      root.style.padding = '12px';
      const title = L.DomUtil.create('div', 'flex items-center gap-2 mb-1', root);
      const dot = L.DomUtil.create('div', 'w-2 h-2 rounded-full shrink-0', title);
      dot.style.backgroundColor = current.color;
      const name = L.DomUtil.create('strong', 'text-slate-800', title);
      name.textContent = current.name;
      const areaLabel = L.DomUtil.create('p', 'text-xs text-slate-500 font-semibold mb-2', root);
      areaLabel.textContent = `${labelsRef.current.formatNumber(current.areaKm2)} km²`;
      const button = L.DomUtil.create(
        'button',
        'w-full py-2 px-3 bg-red-50 text-red-500 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors',
        root
      );
      button.type = 'button';
      button.textContent = labelsRef.current.removeLabel;
      L.DomEvent.on(button, 'click', () => {
        map.closePopup();
        onRemoveRef.current(current.id);
      });
      return root;
    };

    // Popup opens on tap/click only, never at the end of a drag
    polygon.on('click', (e: L.LeafletMouseEvent) => {
      if (suppressClick) {
        suppressClick = false;
        return;
      }
      popupRef.current = L.popup({ className: 'custom-popup', offset: [0, -10], minWidth: 170 })
        .setLatLng(e.latlng)
        .setContent(buildPopupContent())
        .openOn(map);
    });

    polygon.on('mouseover', () => polygon.setStyle(ACTIVE_STYLE));
    polygon.on('mouseout', () => {
      if (!drag) polygon.setStyle(BASE_STYLE);
    });

    return () => {
      el?.removeEventListener('pointerdown', onPointerDown);
      el?.removeEventListener('pointermove', onPointerMove);
      el?.removeEventListener('pointerup', endDrag);
      el?.removeEventListener('pointercancel', endDrag);
      if (frame) cancelAnimationFrame(frame);
      if (drag) map.dragging.enable();
      popupRef.current?.remove();
      popupRef.current = null;
      map.removeLayer(polygon);
      polygonRef.current = null;
    };
  }, [map, city.id]);

  // Moving only updates the coordinates of the existing polygon
  useEffect(() => {
    popupRef.current?.remove(); // It would be left pointing at the old spot
    polygonRef.current?.setLatLngs(shiftGeometry(city.geojson, city.centroid, city.currentPosition));
  }, [city.currentPosition, city.geojson, city.centroid]);

  return null;
};

export default DraggableCity;
