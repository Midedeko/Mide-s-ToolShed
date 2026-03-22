import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import * as turf from '@turf/turf';
import SunCalc from 'suncalc';

type Mode = 'none' | 'ruler' | 'polygon';
type Unit = 'mm' | 'km' | 'ft' | 'mi';

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
  is3D: boolean;
  siteStyle: SiteStyle;
  setSiteStyle: (style: SiteStyle) => void;
  onRulerResult: (distanceMeters: number, pointA: [number, number], pointB: [number, number]) => void;
  onPolygonResult: (areaSqMeters: number, vertices: [number, number][]) => void;
  clicks: [number, number][];
  setClicks: React.Dispatch<React.SetStateAction<[number, number][]>>;
  zoomTrigger: number;
  timeOfDay: number;
  showSolar: boolean;
  showWind: boolean;
  windData: { dominantDirection: number; speed: number } | null;
}

const Map: React.FC<MapProps> = ({
  mode, mapStyle, unit, is3D, siteStyle, setSiteStyle,
  onRulerResult, onPolygonResult, clicks, setClicks, zoomTrigger,
  timeOfDay, showSolar, showWind, windData
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const searchMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const hudLabelsRef = useRef<mapboxgl.Marker[]>([]);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [renderTrigger, setRenderTrigger] = useState(0);

  const formatDistance = (meters: number) => {
    switch (unit) {
      case 'mm': return `${(meters * 1000).toLocaleString()} mm`;
      case 'km': return `${(meters / 1000).toLocaleString()} km`;
      case 'ft': return `${(meters * 3.28084).toLocaleString()} ft`;
      case 'mi': return `${(meters * 0.000621371).toLocaleString()} mi`;
      default: return `${meters.toFixed(2)} m`;
    }
  };

  const addLayers = (map: mapboxgl.Map) => {
    console.log('addLayers called...');
    if (map.getSource('measurement')) {
      console.log('Measurement source already exists.');
      return;
    }

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
        'fill-opacity': siteStyle.fillOpacity > 0 ? siteStyle.fillOpacity : 0.3
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

    // Right-click on polygon for context menu
    map.on('contextmenu', 'area-fill', (e) => {
      e.preventDefault();
      setContextMenu({ x: e.point.x, y: e.point.y });
    });

    // --- Site Analysis Source & Layers ---
    if (!map.getSource('analysis')) {
      map.addSource('analysis', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      map.addLayer({
        id: 'wind-rose',
        type: 'fill',
        source: 'analysis',
        filter: ['==', 'type', 'wind-rose'],
        paint: {
          'fill-color': '#38bdf8',
          'fill-opacity': 0.4,
          'fill-outline-color': '#0284c7'
        }
      });

      map.addLayer({
        id: 'solar-arc',
        type: 'line',
        source: 'analysis',
        filter: ['==', 'type', 'solar-arc'],
        paint: {
          'line-color': '#fde047',
          'line-width': 2,
        }
      });

      map.addLayer({
        id: 'sun-icon',
        type: 'circle',
        source: 'analysis',
        filter: ['==', 'type', 'sun-icon'],
        paint: {
          'circle-color': '#fde047',
          'circle-radius': 8,
          'circle-stroke-color': '#ca8a04',
          'circle-stroke-width': 2,
          'circle-blur': 0.2
        }
      });

      // --- Compass HUD Layers ---
      map.addLayer({
        id: 'compass-ring',
        type: 'line',
        source: 'analysis',
        filter: ['==', 'type', 'compass-ring'],
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['get', 'width']
        }
      });
      
      map.addLayer({
        id: 'compass-tick',
        type: 'line',
        source: 'analysis',
        filter: ['==', 'type', 'compass-tick'],
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['get', 'width']
        }
      });

      map.addLayer({
        id: 'compass-dot',
        type: 'circle',
        source: 'analysis',
        filter: ['==', 'type', 'compass-dot'],
        paint: {
          'circle-radius': 1,
          'circle-color': '#ffffff',
          'circle-opacity': 0.6
        }
      });
    }
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

  const clearHUDLabels = () => {
    hudLabelsRef.current.forEach(m => m.remove());
    hudLabelsRef.current = [];
  };

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setPitch(is3D ? 60 : 0);
    }
  }, [is3D]);

  useEffect(() => {
    if (!mapContainer.current) return;
    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: mapStyle,
      center: [20, 0],
      zoom: 0.5,
      projection: { name: 'globe' } as any
    });

    const geocoder = new MapboxGeocoder({
      accessToken: mapboxgl.accessToken as string,
      mapboxgl: mapboxgl as any,
      marker: false,
      flyTo: false,
      placeholder: 'SEARCH LOCATION...',
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
      window.dispatchEvent(new Event('close-search'));
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
      setRenderTrigger(v => v + 1);
      // Re-apply fog after first paint so stars/glow show at low zoom
      requestAnimationFrame(() => {
        updateFog(map);
        map.triggerRepaint();
      });
    });

    map.on('zoom', () => updateFog(map));

    map.on('load', () => {
      setIsMapLoaded(true);
    });

    mapRef.current = map;

    // Listen for global map clear event to remove the search marker
    const handleClearSearch = () => {
      if (searchMarkerRef.current) {
        searchMarkerRef.current.remove();
        searchMarkerRef.current = null;
      }
    };
    window.addEventListener('clear-map-extras', handleClearSearch);

    return () => {
      map.remove();
      window.removeEventListener('clear-map-extras', handleClearSearch);
    };
  }, []);

  const updateFog = (map: mapboxgl.Map) => {
    const zoom = map.getZoom();
    const isZoomedIn = zoom > 12;
    map.setFog({
      'range': [0.5, 10],
      'color': '#242b38',
      'high-color': '#161c24',
      'space-color': '#0b1015',
      'horizon-blend': isZoomedIn ? 0.01 : 0.12,
      'star-intensity': isZoomedIn ? 0 : 0.6
    } as any);
  };

  const isStyleInit = useRef(true);
  useEffect(() => {
    if (isStyleInit.current) {
      isStyleInit.current = false;
      return;
    }
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

  // --- Separate effect: DOM peg markers (no style dependency) ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;

    clearMarkers();
    clicks.forEach((c, i) => {
      const el = document.createElement('div');
      el.className = 'peg-marker';
      el.innerHTML = `<span>${i + 1}</span>`;

      const popupDiv = document.createElement('div');
      popupDiv.className = 'peg-delete-popup';
      popupDiv.innerHTML = `
        <div style="font-size: 10px; margin-bottom: 8px; letter-spacing: 1px; font-weight: bold;">DELETE PEG?</div>
        <div style="display: flex; gap: 8px;">
          <button id="peg-yes-${i}" class="peg-delete-btn">YES</button>
          <button id="peg-no-${i}" class="peg-delete-btn">NO</button>
        </div>
      `;

      const popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: true, offset: 15, anchor: 'bottom' })
        .setDOMContent(popupDiv);

      popup.on('open', () => {
        document.getElementById(`peg-yes-${i}`)?.addEventListener('click', () => {
          setClicks(prev => prev.filter((_, idx) => idx !== i));
          popup.remove();
        });
        document.getElementById(`peg-no-${i}`)?.addEventListener('click', () => {
          popup.remove();
        });
      });

      const marker = new mapboxgl.Marker({ element: el, draggable: true })
        .setLngLat(c)
        .setPopup(popup)
        .addTo(map);

      // Keep contextmenu support just in case users right click the peg!
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
  }, [clicks, isMapLoaded]);

  // --- Result Calculation (Area / Distance) ---
  // Runs independently of Mapbox style loading to ensure UI sync
  useEffect(() => {
    if (clicks.length >= 2) {
      if (mode === 'ruler') {
        const dist = turf.distance(clicks[0], clicks[1], { units: 'meters' });
        onRulerResult(dist, clicks[0], clicks[1]);
      } else if (mode === 'polygon' && clicks.length >= 3) {
        const poly = turf.polygon([[...clicks, clicks[0]]]);
        onPolygonResult(turf.area(poly), clicks);
      }
    }
  }, [clicks, mode, onRulerResult, onPolygonResult]);

  // --- Mapbox GeoJSON layer sync (requires style to be loaded) ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    // Ensure layers are added if they don't exist yet (e.g. after style change)
    if (!map.getSource('measurement') || !map.getSource('area') || !map.getSource('analysis')) {
      console.log('Sources missing, adding layers...');
      addLayers(map);
    }

    const measurementSource = map.getSource('measurement') as mapboxgl.GeoJSONSource;
    const areaSource = map.getSource('area') as mapboxgl.GeoJSONSource;

    if (!measurementSource || !areaSource) {
      console.warn('Sources still missing after addLayers attempt');
      return;
    }

    const features: any[] = [];
    const areaFeatures: any[] = [];

    // Clear previous HUD Labels (DOM)
    clearHUDLabels();

    // Helper for creating HUD Labels
    const createHUDLabel = (coords: [number, number], text: string, type: 'hud-text-label' | 'hud-compass-label', style: React.CSSProperties = {}) => {
      const el = document.createElement('div');
      el.className = type;
      el.textContent = text;
      Object.assign(el.style, style);
      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat(coords)
        .addTo(map);
      hudLabelsRef.current.push(marker);
    };

    // Ruler persistence (if 2 points)
    if (clicks.length >= 2) {
      const line = turf.lineString(clicks.slice(0, 2));
      const dist = turf.distance(clicks[0], clicks[1], { units: 'meters' });
      const labelStr = formatDistance(dist);
      features.push({ ...line, properties: { distance: labelStr } });
      
      const midpoint = turf.midpoint(clicks[0], clicks[1]).geometry.coordinates as [number, number];
      createHUDLabel(midpoint, labelStr, 'hud-text-label');
    }

    // Set Out persistence (Polygon)
    if (clicks.length >= 2) {
      for (let i = 0; i < clicks.length - 1; i++) {
        const dist = turf.distance(clicks[i], clicks[i + 1], { units: 'meters' });
        const labelStr = formatDistance(dist);
        areaFeatures.push({
          ...turf.lineString([clicks[i], clicks[i + 1]]),
          properties: { distance: labelStr }
        });
        const midpoint = turf.midpoint(clicks[i], clicks[i + 1]).geometry.coordinates as [number, number];
        createHUDLabel(midpoint, labelStr, 'hud-text-label');
      }
      if (clicks.length >= 3) {
        const lastIdx = clicks.length - 1;
        const dist = turf.distance(clicks[lastIdx], clicks[0], { units: 'meters' });
        const labelStr = formatDistance(dist);
        areaFeatures.push({
          ...turf.lineString([clicks[lastIdx], clicks[0]]),
          properties: { distance: labelStr }
        });
        const midpoint = turf.midpoint(clicks[lastIdx], clicks[0]).geometry.coordinates as [number, number];
        createHUDLabel(midpoint, labelStr, 'hud-text-label');

        const poly = turf.polygon([[...clicks, clicks[0]]]);
        areaFeatures.push(poly);
      }
    }

    console.log(`Setting data: measurement features=${features.length}, area features=${areaFeatures.length}`);
    measurementSource.setData({ type: 'FeatureCollection', features });
    areaSource.setData({ type: 'FeatureCollection', features: areaFeatures });

    // Site Analysis Overlay Update
    const analysisSource = map.getSource('analysis') as mapboxgl.GeoJSONSource;
    if (analysisSource) {
      const analysisFeatures: any[] = [];
      if (clicks.length >= 3) {
        const poly = turf.polygon([[...clicks, clicks[0]]]);
        const centerRef = turf.centroid(poly);
        const centerPoint = centerRef.geometry.coordinates as [number, number];
        const bbox = turf.bbox(poly);
        const radiusMeters = Math.max(
          turf.distance(centerPoint, [bbox[0], bbox[1]], { units: 'meters' }),
          turf.distance(centerPoint, [bbox[2], bbox[3]], { units: 'meters' })
        ) * 1.5;

        // --- HUD Compass Logic ---
        const compassRadius = Math.max(radiusMeters, 30); // Ensure minimal visible radius
        
        // 1. Compass Outer and Inner Rings
        const innerCircle = turf.circle(centerPoint, compassRadius * 0.95, { steps: 128, units: 'meters' });
        const outerCircle = turf.circle(centerPoint, compassRadius * 1.05, { steps: 128, units: 'meters' });
        
        analysisFeatures.push({
          type: 'Feature',
          properties: { type: 'compass-ring', color: 'rgba(255,255,255,0.4)', width: 1 },
          geometry: { type: 'LineString', coordinates: innerCircle.geometry.coordinates[0] }
        });
        analysisFeatures.push({
          type: 'Feature',
          properties: { type: 'compass-ring', color: 'rgba(255,255,255,0.15)', width: 6 },
          geometry: { type: 'LineString', coordinates: innerCircle.geometry.coordinates[0] }
        });
        analysisFeatures.push({
          type: 'Feature',
          properties: { type: 'compass-ring', color: 'rgba(255,255,255,0.6)', width: 2 },
          geometry: { type: 'LineString', coordinates: outerCircle.geometry.coordinates[0] }
        });

        // 2. Compass Ticks & Labels
        const cardinals = [
          { l: 'N', a: 0 }, { l: 'NE', a: 45 }, { l: 'E', a: 90 }, { l: 'SE', a: 135 },
          { l: 'S', a: 180 }, { l: 'SW', a: 225 }, { l: 'W', a: 270 }, { l: 'NW', a: 315 }
        ];

        for (let deg = 0; deg < 360; deg += 5) {
          const isCardinal = deg % 90 === 0;
          const isSub = deg % 45 === 0;
          const isMajor = deg % 15 === 0;
          
          if (isCardinal || isSub || isMajor) {
            let innerFactor = 0.96;
            let outerFactor = 1.04;
            let color = 'rgba(255,255,255,0.6)';
            let width = 1;
            
            if (isCardinal) {
              innerFactor = 0.85; outerFactor = 1.08; color = '#ffffff'; width = 2; // White target crosshairs
            } else if (isSub) {
              innerFactor = 0.90; outerFactor = 1.05; color = 'rgba(255,255,255,0.9)'; width = 1.5;
            } else if (isMajor) {
              innerFactor = 0.93; outerFactor = 1.0; 
            }

            const start = turf.destination(centerPoint, compassRadius * innerFactor, deg, { units: 'meters' });
            const end = turf.destination(centerPoint, compassRadius * outerFactor, deg, { units: 'meters' });
            
            analysisFeatures.push({
              type: 'Feature',
              properties: { type: 'compass-tick', color, width },
              geometry: { type: 'LineString', coordinates: [start.geometry.coordinates, end.geometry.coordinates] }
            });
          } else {
            // Dots for 5 degree lines
            const dotPt = turf.destination(centerPoint, compassRadius, deg, { units: 'meters' });
            analysisFeatures.push({
              type: 'Feature',
              properties: { type: 'compass-dot' },
              geometry: dotPt.geometry
            });
          }

          // Labels (DOM Markers)
          if (isSub) {
            const labelPt = turf.destination(centerPoint, compassRadius * 1.15, deg, { units: 'meters' });
            const labelStr = cardinals.find(c => c.a === deg)?.l || '';
            createHUDLabel(labelPt.geometry.coordinates as [number, number], labelStr, 'hud-compass-label', {
              fontSize: isCardinal ? '18px' : '14px',
              color: '#ffffff'
            });
          } else if (isMajor) {
             const labelPt = turf.destination(centerPoint, compassRadius * 1.1, deg, { units: 'meters' });
             createHUDLabel(labelPt.geometry.coordinates as [number, number], deg.toString(), 'hud-compass-label', {
              fontSize: '10px',
              color: 'rgba(255,255,255,0.5)'
            });
          }
        }

        const date = new Date();
        const lat = centerPoint[1];
        const lng = centerPoint[0];

        // 1. Solar Path
        if (showSolar) {
          const times = SunCalc.getTimes(date, lat, lng);
          const sunrise = times.sunrise;
          const sunset = times.sunset;

          if (sunrise && sunset) {
            const arcPoints = [];
            // Dynamically calculate steps based on radius for extra smoothness
            const steps = Math.min(2000, Math.max(120, Math.floor(compassRadius * 2)));
            const startTime = sunrise.getTime();
            const endTime = sunset.getTime();

            for (let i = 0; i <= steps; i++) {
              const t = new Date(startTime + (endTime - startTime) * (i / steps));
              const pos = SunCalc.getPosition(t, lat, lng);
              const azimuthDegrees = (pos.azimuth * 180) / Math.PI;
              const mapBearing = azimuthDegrees + 180;
              const dest = turf.destination(centerPoint, radiusMeters, mapBearing, { units: 'meters' });
              arcPoints.push(dest.geometry.coordinates);
            }

            analysisFeatures.push({
              type: 'Feature',
              properties: { type: 'solar-arc' },
              geometry: { type: 'LineString', coordinates: arcPoints }
            });

            const Math_floor = Math.floor(timeOfDay);
            const mins = Math.round((timeOfDay - Math_floor) * 60);
            const sunTime = new Date(date);
            sunTime.setHours(Math_floor, mins, 0, 0);

            if (sunTime >= sunrise && sunTime <= sunset) {
              const sunPos = SunCalc.getPosition(sunTime, lat, lng);
              const sunAzimuthDegrees = (sunPos.azimuth * 180) / Math.PI;
              const sunMapBearing = sunAzimuthDegrees + 180;
              const sunDest = turf.destination(centerPoint, radiusMeters, sunMapBearing, { units: 'meters' });

              analysisFeatures.push({
                type: 'Feature',
                properties: { type: 'sun-icon' },
                geometry: sunDest.geometry
              });
            }
          }
        }

        // 2. Wind Rose Diagram
        if (showWind && windData) {
          const windDir = windData.dominantDirection;
          const wedgePoints: [number, number][] = [centerPoint];
          for (let d = -15; d <= 15; d += 5) {
            const dest = turf.destination(centerPoint, radiusMeters * 1.2, windDir + d, { units: 'meters' });
            wedgePoints.push(dest.geometry.coordinates as [number, number]);
          }
          wedgePoints.push(centerPoint);

          analysisFeatures.push({
            type: 'Feature',
            properties: { type: 'wind-rose' },
            geometry: { type: 'Polygon', coordinates: [wedgePoints] }
          });
        }
      }
      analysisSource.setData({ type: 'FeatureCollection', features: analysisFeatures });
    }
  }, [clicks, unit, mapStyle, isMapLoaded, renderTrigger, timeOfDay, showSolar, showWind, windData]);

  // Explicit Auto-Transport (Zoom to Site)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded || clicks.length === 0 || zoomTrigger === 0) return;

    const bounds = new mapboxgl.LngLatBounds();
    clicks.forEach(c => bounds.extend(c));
    map.fitBounds(bounds, { padding: 100, maxZoom: 18, animate: true, duration: 1500 });
  }, [zoomTrigger, isMapLoaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const handleClick = (e: mapboxgl.MapMouseEvent) => {
      console.log('Map clicked!', e.lngLat, 'mode:', mode);
      setContextMenu(null);
      if (mode === 'none') return;

      // Prevent overlapping pegs when clicking markers or popups
      const target = e.originalEvent.target as HTMLElement;
      if (target.closest('.peg-marker') || target.closest('.mapboxgl-popup')) {
        return;
      }

      const point: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      setClicks(prev => {
        console.log('Previous clicks:', prev);
        if (mode === 'ruler') return prev.length >= 2 ? [point] : [...prev, point];
        // Remove the 4-point limit for polygon mode to allow complex site boundaries
        if (mode === 'polygon') return [...prev, point];
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
