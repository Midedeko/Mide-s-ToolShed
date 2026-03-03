import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import * as turf from '@turf/turf';

type Mode = 'none' | 'ruler' | 'polygon';
type Unit = 'mm' | 'cm' | 'inch' | 'ft';

interface SiteStyle {
  strokeColor: string;
  fillColor: string;
  strokeOpacity: number;
  fillOpacity: number;
}

interface MapProps {
  mode: Mode;
  mapStyle: string;
  unit: Unit;
  siteStyle: SiteStyle;
  setSiteStyle: (style: SiteStyle) => void;
  onRulerResult: (distanceMeters: number, pointA: [number, number], pointB: [number, number]) => void;
  onPolygonResult: (areaSqMeters: number, vertices: [number, number][]) => void;
  clicks: [number, number][];
  setClicks: React.Dispatch<React.SetStateAction<[number, number][]>>;
  zoomTrigger: number;
}

const Map: React.FC<MapProps> = ({
  mode, mapStyle, unit, siteStyle, setSiteStyle,
  onRulerResult, onPolygonResult, clicks, setClicks, zoomTrigger
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const searchMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);

  const formatDistance = (meters: number) => {
    switch (unit) {
      case 'mm': return `${(meters * 1000).toLocaleString()} mm`;
      case 'cm': return `${(meters * 100).toLocaleString()} cm`;
      case 'inch': return `${(meters * 39.3701).toLocaleString()} in`;
      case 'ft': return `${(meters * 3.28084).toLocaleString()} ft`;
      default: return `${meters.toFixed(2)} m`;
    }
  };

  const addLayers = (map: mapboxgl.Map) => {
    if (map.getSource('measurement')) return;

    map.addSource('measurement', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });

    map.addLayer({
      id: 'measurement-line',
      type: 'line',
      source: 'measurement',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#ff5722', 'line-width': 2, 'line-dasharray': [2, 1] },
    });

    map.addLayer({
      id: 'measurement-labels',
      type: 'symbol',
      source: 'measurement',
      layout: {
        'text-field': ['get', 'distance'],
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-size': 12,
        'text-offset': [0, -1],
        'symbol-placement': 'line-center',
        'text-allow-overlap': true,
      },
      paint: {
        'text-color': '#ff5722',
        'text-halo-color': 'rgba(15, 23, 42, 1)',
        'text-halo-width': 2,
      }
    });

    map.addSource('area', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });

    map.addLayer({
      id: 'area-fill',
      type: 'fill',
      source: 'area',
      paint: {
        'fill-color': siteStyle.fillColor,
        'fill-opacity': siteStyle.fillOpacity
      },
    });

    map.addLayer({
      id: 'area-outline',
      type: 'line',
      source: 'area',
      paint: {
        'line-color': siteStyle.strokeColor,
        'line-width': 2,
        'line-opacity': siteStyle.strokeOpacity
      },
    });

    map.addLayer({
      id: 'area-labels',
      type: 'symbol',
      source: 'area',
      layout: {
        'text-field': ['get', 'distance'],
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-size': 12,
        'text-offset': [0, -1],
        'symbol-placement': 'line-center',
        'text-allow-overlap': true,
      },
      paint: {
        'text-color': '#fff',
        'text-halo-color': siteStyle.strokeColor,
        'text-halo-width': 1,
      }
    });

    // Right-click on polygon for context menu
    map.on('contextmenu', 'area-fill', (e) => {
      e.preventDefault();
      setContextMenu({ x: e.point.x, y: e.point.y });
    });
  };

  const coordinateGeocoder = (query: string) => {
    const matches = query.match(/^[ ]*(?:lat[: ]*)*([-+]?\d+\.?\d*)[, ]+(?:lng[: ]*)*([-+]?\d+\.?\d*)[ ]*$/i);
    if (!matches) return null;
    const coord1 = Number(matches[1]);
    const coord2 = Number(matches[2]);
    const geocodes = [];
    if (coord1 >= -90 && coord1 <= 90 && coord2 >= -180 && coord2 <= 180) {
      geocodes.push({
        center: [coord2, coord1],
        geometry: { type: 'Point', coordinates: [coord2, coord1] },
        place_name: `Coordinates: ${coord1}, ${coord2}`,
        place_type: ['coordinate'],
        properties: {},
        type: 'Feature',
      } as any);
    }
    return geocodes;
  };

  const clearMarkers = () => {
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
  };

  useEffect(() => {
    if (!mapContainer.current) return;
    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: mapStyle,
      center: [-98.5795, 39.8283],
      zoom: 3,
      projection: { name: 'globe' } as any
    });

    const geocoder = new MapboxGeocoder({
      accessToken: mapboxgl.accessToken as string,
      mapboxgl: mapboxgl as any,
      marker: true,
      placeholder: 'Search location or lat, lng...',
      localGeocoder: coordinateGeocoder as any,
      reverseGeocode: true
    });

    geocoder.on('result', (e) => {
      const coords = e.result.center as [number, number];
      if (searchMarkerRef.current) searchMarkerRef.current.remove();
      searchMarkerRef.current = new mapboxgl.Marker({ color: '#ff0000' })
        .setLngLat(coords)
        .addTo(map);
      map.flyTo({ center: coords, zoom: 15 });
    });

    setTimeout(() => {
      const dock = document.getElementById('geocoder-dock');
      if (dock) {
        dock.innerHTML = '';
        geocoder.addTo('#geocoder-dock');
      }
    }, 0);

    map.on('style.load', () => {
      addLayers(map);
      updateFog(map);
    });

    map.on('zoom', () => updateFog(map));

    mapRef.current = map;
    return () => map.remove();
  }, []);

  const updateFog = (map: mapboxgl.Map) => {
    const zoom = map.getZoom();
    const isZoomedIn = zoom > 12;
    map.setFog({
      'range': [0.5, 10],
      'color': '#242b38',
      'high-color': '#161c24',
      'space-color': '#0b1015',
      'horizon-blend': isZoomedIn ? 0.01 : 0.05,
      // Fix for satellite haze: reduce opacity of atmosphere when zoomed in
      'star-intensity': isZoomedIn ? 0 : 0.5
    } as any);
  };

  useEffect(() => {
    if (mapRef.current) mapRef.current.setStyle(mapStyle);
  }, [mapStyle]);

  // Update Paint Properties dynamically
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    if (map.getLayer('area-fill')) {
      map.setPaintProperty('area-fill', 'fill-color', siteStyle.fillColor);
      map.setPaintProperty('area-fill', 'fill-opacity', siteStyle.fillOpacity);
    }
    if (map.getLayer('area-outline')) {
      map.setPaintProperty('area-outline', 'line-color', siteStyle.strokeColor);
      map.setPaintProperty('area-outline', 'line-opacity', siteStyle.strokeOpacity);
    }
  }, [siteStyle]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const measurementSource = map.getSource('measurement') as mapboxgl.GeoJSONSource;
    const areaSource = map.getSource('area') as mapboxgl.GeoJSONSource;

    if (!measurementSource || !areaSource) return;

    const features: any[] = [];
    const areaFeatures: any[] = [];

    // Sync Peg Markers (Persistent)
    if (markersRef.current.length !== clicks.length) {
      clearMarkers();
      clicks.forEach((c, i) => {
        const el = document.createElement('div');
        el.className = 'peg-marker';
        el.innerHTML = `<span>${i + 1}</span>`;

        const marker = new mapboxgl.Marker({ element: el, draggable: true })
          .setLngLat(c)
          .addTo(map);

        // Delete on right-click
        el.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          setClicks(prev => prev.filter((_, idx) => idx !== i));
        });

        marker.on('dragend', () => {
          const lngLat = marker.getLngLat();
          setClicks(prev => {
            const updated = [...prev];
            updated[i] = [lngLat.lng, lngLat.lat];
            return updated;
          });
        });
        markersRef.current.push(marker);
      });
    }

    // Ruler persistence (if 2 points)
    if (clicks.length >= 2) {
      const line = turf.lineString(clicks.slice(0, 2));
      const dist = turf.distance(clicks[0], clicks[1], { units: 'meters' });
      features.push({ ...line, properties: { distance: formatDistance(dist) } });
      onRulerResult(dist, clicks[0], clicks[1]);
    }

    // Set Out persistence (Polygon)
    if (clicks.length >= 2) {
      for (let i = 0; i < clicks.length - 1; i++) {
        const dist = turf.distance(clicks[i], clicks[i + 1], { units: 'meters' });
        areaFeatures.push({
          ...turf.lineString([clicks[i], clicks[i + 1]]),
          properties: { distance: formatDistance(dist) }
        });
      }
      if (clicks.length === 4) {
        const dist = turf.distance(clicks[3], clicks[0], { units: 'meters' });
        areaFeatures.push({
          ...turf.lineString([clicks[3], clicks[0]]),
          properties: { distance: formatDistance(dist) }
        });
        const poly = turf.polygon([[...clicks, clicks[0]]]);
        areaFeatures.push(poly);
        onPolygonResult(turf.area(poly), clicks);
      }
    }

    measurementSource.setData({ type: 'FeatureCollection', features });
    areaSource.setData({ type: 'FeatureCollection', features: areaFeatures });
  }, [clicks, unit, mapStyle, onRulerResult, onPolygonResult]);

  // Explicit Auto-Transport (Zoom to Site)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || clicks.length === 0 || zoomTrigger === 0) return;

    const bounds = new mapboxgl.LngLatBounds();
    clicks.forEach(c => bounds.extend(c));
    map.fitBounds(bounds, { padding: 100, maxZoom: 18, animate: true });
  }, [zoomTrigger]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const handleClick = (e: mapboxgl.MapMouseEvent) => {
      setContextMenu(null);
      if (mode === 'none') return;

      const point: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      setClicks(prev => {
        if (mode === 'ruler') return prev.length >= 2 ? [point] : [...prev, point];
        if (mode === 'polygon') return prev.length >= 4 ? [point] : [...prev, point];
        return prev;
      });
    };
    map.on('click', handleClick);
    return () => { map.off('click', handleClick); };
  }, [mode]);

  return (
    <>
      <div ref={mapContainer} className={`map-container ${mode !== 'none' ? 'measuring' : ''}`} />

      {contextMenu && (
        <div
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="menu-item">
            <span>Stroke Color</span>
            <input type="color" value={siteStyle.strokeColor} onChange={(e) => setSiteStyle({ ...siteStyle, strokeColor: e.target.value })} />
          </div>
          <div className="menu-item">
            <span>Fill Color</span>
            <input type="color" value={siteStyle.fillColor} onChange={(e) => setSiteStyle({ ...siteStyle, fillColor: e.target.value })} />
          </div>
          <div className="menu-item">
            <span>Stroke Opacity</span>
            <input type="range" min="0" max="1" step="0.1" value={siteStyle.strokeOpacity} onChange={(e) => setSiteStyle({ ...siteStyle, strokeOpacity: parseFloat(e.target.value) })} />
          </div>
          <div className="menu-item">
            <span>Fill Opacity</span>
            <input type="range" min="0" max="1" step="0.1" value={siteStyle.fillOpacity} onChange={(e) => setSiteStyle({ ...siteStyle, fillOpacity: parseFloat(e.target.value) })} />
          </div>
          <button onClick={() => setContextMenu(null)}>Close</button>
        </div>
      )}
    </>
  );
};

export default Map;
