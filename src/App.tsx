import { useState, useCallback } from 'react';
import './App.css';
import Map from './components/Map.tsx';
import Toolbar from './components/Toolbar.tsx';
import SidePanel from './components/SidePanel.tsx';

type Mode = 'none' | 'ruler' | 'polygon';

function App() {
  const [mode, setMode] = useState<Mode>('none');
  const [mapStyle, setMapStyle] = useState<string>('mapbox://styles/mapbox/dark-v11');
  const [unit, setUnit] = useState<'mm' | 'cm' | 'inch' | 'ft'>('ft');
  const [isPanelVisible, setIsPanelVisible] = useState(true);
  const [siteStyle, setSiteStyle] = useState({
    strokeColor: '#38bdf8',
    fillColor: '#0ea5e9',
    strokeOpacity: 1,
    fillOpacity: 0.2
  });
  const [rulerResult, setRulerResult] = useState<{ distanceMeters: number; pointA: [number, number]; pointB: [number, number] } | null>(null);
  const [polygonResult, setPolygonResult] = useState<{ areaSqMeters: number; vertices: [number, number][] } | null>(null);

  const handleRulerResult = useCallback((distanceMeters: number, pointA: [number, number], pointB: [number, number]) => {
    setRulerResult({ distanceMeters, pointA, pointB });
  }, []);

  const handlePolygonResult = useCallback((areaSqMeters: number, vertices: [number, number][]) => {
    setPolygonResult({ areaSqMeters, vertices });
  }, []);

  const handleClear = useCallback(() => {
    setRulerResult(null);
    setPolygonResult(null);
    setMode('none');
  }, []);

  return (
    <div className="app-container">
      <Toolbar
        currentMode={mode}
        setMode={setMode}
        mapStyle={mapStyle}
        setMapStyle={setMapStyle}
        unit={unit}
        setUnit={setUnit}
        onClear={handleClear}
      />

      <Map
        mode={mode}
        mapStyle={mapStyle}
        unit={unit}
        siteStyle={siteStyle}
        setSiteStyle={setSiteStyle}
        onRulerResult={handleRulerResult}
        onPolygonResult={handlePolygonResult}
      />

      <SidePanel
        mode={mode}
        rulerResult={rulerResult}
        polygonResult={polygonResult}
        unit={unit}
        isVisible={isPanelVisible}
        onToggleVisible={() => setIsPanelVisible(!isPanelVisible)}
      />
    </div>
  );
}

export default App;
