import { useState, useCallback, useEffect } from 'react';
import LZString from 'lz-string';
import './App.css';
import Map from './components/Map.tsx';
import Toolbar from './components/Toolbar.tsx';
import SidePanel from './components/SidePanel.tsx';
import LoadingScreen from './components/LoadingScreen.tsx';
import LandingPage from './components/LandingPage.tsx';
import ToolshedLogo from './assets/icons/Mides Toolshed Logo.svg?react';
import { Agentation } from 'agentation';

type Mode = 'none' | 'ruler' | 'polygon';

export interface CelestialBody {
  id: string;
  type: 'sun' | 'moon';
  time: number; // 0-24
  date: string; // ISO yyyy-mm-dd
}

function App() {
  const [view, setView] = useState<'loading' | 'landing' | 'planner'>('loading');
  const [mode, setMode] = useState<Mode>('none');
  const [mapStyle, setMapStyle] = useState<string>('mapbox://styles/mapbox/satellite-v9');
  const [unit, setUnit] = useState<'mm' | 'km' | 'ft' | 'mi'>('ft');
  const [is3D, setIs3D] = useState(false);
  const [isPanelVisible, setIsPanelVisible] = useState(false);
  const [siteStyle, setSiteStyle] = useState({
    strokeColor: '#ffffff',
    fillColor: '#ffffff',
    strokeOpacity: 1,
    fillOpacity: 0.2
  });
  const [rulerResult, setRulerResult] = useState<{ distanceMeters: number; pointA: [number, number]; pointB: [number, number] } | null>(null);
  const [polygonResult, setPolygonResult] = useState<{ areaSqMeters: number; vertices: [number, number][] } | null>(null);
  const [clicks, setClicks] = useState<[number, number][]>([]);
  const [planName, setPlanName] = useState<string>('Unnamed Plan');
  const [zoomTrigger, setZoomTrigger] = useState(0); // Signal map to fly to site

  // GPS Set Out States
  const [editingPegIndex, setEditingPegIndex] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Environmental Analysis States
  const [celestialBodies, setCelestialBodies] = useState<CelestialBody[]>([]);
  const [showWind, setShowWind] = useState<boolean>(false);
  const [windData, setWindData] = useState<{ dominantDirection: number; speed: number } | null>(null);
  const [showAnalysisTooltip, setShowAnalysisTooltip] = useState(false);
  const [hasClickedAnalysis, setHasClickedAnalysis] = useState(false);

  // Load plan from URL if Search String is present
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const encodedData = urlParams.get('s');

    if (encodedData) {
      loadFromEncodedString(encodedData);
      setZoomTrigger(v => v + 1);
      setIsPanelVisible(true);
    }
  }, []);

  const loadFromEncodedString = (encoded: string) => {
    try {
      const decoded = LZString.decompressFromEncodedURIComponent(encoded);
      if (!decoded) return;
      const data = JSON.parse(decoded);
      applyPlanData(data);
    } catch (e) {
      console.error('Failed to decode data from URL', e);
    }
  };

  const applyPlanData = (data: any) => {
    if (data.clicks) {
      // Normalize legacy object format {lng, lat} to array format [lng, lat]
      const normalizedClicks = data.clicks.map((item: any) => {
        if (Array.isArray(item)) return item;
        if (item && typeof item.lng === 'number' && typeof item.lat === 'number') {
          return [item.lng, item.lat];
        }
        return item;
      });
      setClicks(normalizedClicks);
    }
    if (data.unit) setUnit(data.unit);
    if (data.mapStyle) setMapStyle(data.mapStyle);
    if (data.siteStyle) setSiteStyle(data.siteStyle);
    if (data.name) setPlanName(data.name);
  };

  const handleShare = () => {
    if (clicks.length === 0) {
      alert('Please add some points to the map before sharing.');
      return;
    }

    let finalName = planName;
    if (planName === 'Unnamed Plan') {
      let namePrompt = null;
      try {
        namePrompt = window.prompt("Give this layout a name before sharing:");
      } catch (e) {
        console.warn("Prompt blocked");
      }

      if (!namePrompt) {
        // Fallback if prompt is blocked or user cancelled without typing
        finalName = `Site Plan ${new Date().toLocaleDateString()}`;
      } else {
        finalName = namePrompt;
      }
      setPlanName(finalName);
    }

    const planData = {
      clicks,
      unit,
      mapStyle,
      siteStyle,
      name: finalName
    };

    // Generate Share Link (URL is self-sufficient)
    const encoded = LZString.compressToEncodedURIComponent(JSON.stringify(planData));
    const selfSufficientUrl = `${window.location.origin}${window.location.pathname}?s=${encoded}`;
    window.history.pushState({}, '', selfSufficientUrl);

    try {
      // Copy to clipboard
      navigator.clipboard.writeText(selfSufficientUrl);
      alert('Link generated and copied to clipboard!');
    } catch (e) {
      console.error('Failed to copy to clipboard', e);
    }
  };

  const handleExport = () => {
    if (clicks.length === 0) return;

    let finalName = planName;
    if (planName === 'Unnamed Plan') {
      let namePrompt = null;
      try {
        namePrompt = window.prompt("Give this layout a name before exporting:");
      } catch (e) {
        console.warn("Prompt blocked");
      }

      if (!namePrompt) {
        finalName = `Site Plan ${new Date().toLocaleDateString()}`;
      } else {
        finalName = namePrompt;
      }
      setPlanName(finalName);
    }

    const planData = {
      clicks,
      unit,
      mapStyle,
      siteStyle,
      name: finalName,
      exported_at: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(planData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${finalName.replace(/\s+/g, '_')}_plan.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        applyPlanData(data);
        setZoomTrigger(v => v + 1);
        setIsPanelVisible(true);
        alert('Plan imported successfully! Transporting to site...');
      } catch (err) {
        alert('Failed to parse the plan file.');
      }
    };
    reader.readAsText(file);
  };

  const loadFromPastedCoordinates = (text: string) => {
    const lines = text.trim().split(/\r?\n/).filter(Boolean);
    const coords: [number, number][] = [];
    for (const line of lines) {
      const match = line.match(/(-?\d+\.?\d*)\s*[, \t]\s*(-?\d+\.?\d*)/);
      if (match) {
        const lat = parseFloat(match[1]);
        const lng = parseFloat(match[2]);
        if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          coords.push([lng, lat]);
        }
      }
    }
    if (coords.length > 0) {
      setClicks(coords);
      setZoomTrigger(v => v + 1);
      setIsPanelVisible(true);
    }
  };

  const handleRulerResult = useCallback((distanceMeters: number, pointA: [number, number], pointB: [number, number]) => {
    setRulerResult({ distanceMeters, pointA, pointB });
    if (!isPanelVisible && !hasClickedAnalysis) setShowAnalysisTooltip(true);
  }, [isPanelVisible, hasClickedAnalysis]);

  const handlePolygonResult = useCallback((areaSqMeters: number, vertices: [number, number][]) => {
    setPolygonResult({ areaSqMeters: areaSqMeters || 0, vertices: vertices || [] });
    if (!isPanelVisible && !hasClickedAnalysis) setShowAnalysisTooltip(true);
  }, [isPanelVisible, hasClickedAnalysis]);

  const handleClear = useCallback(() => {
    setRulerResult(null);
    setPolygonResult(null);
    setClicks([]);
    setMode('none');
    setEditingPegIndex(null);
    setPlanName('Unnamed Plan');
    setWindData(null);
    // Remove search markers and other map overlays
    setShowAnalysisTooltip(false);
    window.dispatchEvent(new Event('clear-map-extras'));
    window.history.pushState({}, '', window.location.pathname);
  }, []);

  useEffect(() => {
    if (mode !== 'none') setShowAnalysisTooltip(false);
    if (mode !== 'polygon') setEditingPegIndex(null);
  }, [mode]);

  const handlePlacePeg = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const { longitude, latitude } = position.coords;
        setClicks(prev => {
          if (editingPegIndex !== null) {
            const updated = [...prev];
            updated[editingPegIndex] = [longitude, latitude];
            setEditingPegIndex(null);
            return updated;
          } else {
            return [...prev, [longitude, latitude]];
          }
        });
        // Fly to the updated site bounds
        setZoomTrigger(v => v + 1);
      },
      (error) => {
        setIsLocating(false);
        alert(`Failed to get location: ${error.message}`);
      },
      { enableHighAccuracy: true }
    );
  };

  useEffect(() => {
    if (polygonResult && polygonResult.vertices.length > 0) {
      const lng = polygonResult.vertices[0][0];
      const lat = polygonResult.vertices[0][1];

      const fetchEnvironmentalData = async () => {
        try {
          const res = await fetch(`https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=WD50M,WS50M&community=RE&longitude=${lng}&latitude=${lat}&format=JSON`);
          if (!res.ok) throw new Error('Network response was not ok');
          const data = await res.json();
          const annWindDir = data.properties.parameter.WD50M.ANN;
          const annWindSpeed = data.properties.parameter.WS50M.ANN;
          setWindData({ dominantDirection: annWindDir, speed: annWindSpeed });
        } catch (error) {
          console.error("Failed to fetch NASA POWER data", error);
        }
      };

      fetchEnvironmentalData();
    } else {
      setWindData(null);
    }
  }, [polygonResult]);

  if (view === 'loading') {
    return <LoadingScreen onFadeComplete={() => setView('landing')} />;
  }

  if (view === 'landing') {
    return <LandingPage onSelectTool={(id) => id === 'geo-planner' && setView('planner')} />;
  }

  return (
    <div className="app-container planner-view">
      <header className="landing-header tool-header-unified white-branding">
        <div className="brand-text-left">
          <span className="brand-line1">GEO / SITE</span>
          <span className="brand-line2">PLANNER</span>
        </div>
        <div
          className="mides-toolshed-logo-center clickable"
          onClick={() => setView('landing')}
          style={{ cursor: 'pointer' }}
        >
          <ToolshedLogo className="logo-svg" style={{ width: '48px', height: '48px' }} />
        </div>
      </header>

      {mode === 'polygon' && (
        <div className="gps-set-out-panel">
          {editingPegIndex !== null ? (
            <div className="gps-edit-controls">
              <button 
                className="gps-place-btn is-editing" 
                onClick={handlePlacePeg} 
                disabled={isLocating}
              >
                {isLocating ? 'LOCATING...' : `UPDATE PEG ${editingPegIndex + 1} AT CURRENT LOCATION`}
              </button>
              <button 
                className="gps-cancel-btn" 
                onClick={() => setEditingPegIndex(null)}
              >
                ✖
              </button>
            </div>
          ) : (
            <button 
              className="gps-place-btn" 
              onClick={handlePlacePeg} 
              disabled={isLocating}
            >
              {isLocating ? 'LOCATING...' : 'PLACE PEG'}
            </button>
          )}
        </div>
      )}

      <Toolbar
        currentMode={mode}
        setMode={setMode}
        mapStyle={mapStyle}
        setMapStyle={setMapStyle}
        unit={unit}
        setUnit={setUnit}
        is3D={is3D}
        setIs3D={setIs3D}
        onClear={handleClear}
        onShare={handleShare}
        onExport={handleExport}
        onImport={handleImport}
        onHidePanel={() => setIsPanelVisible(false)}
      />

      <Map
        mode={mode}
        mapStyle={mapStyle}
        unit={unit}
        is3D={is3D}
        siteStyle={siteStyle}
        setSiteStyle={setSiteStyle}
        onRulerResult={handleRulerResult}
        onPolygonResult={handlePolygonResult}
        clicks={clicks}
        setClicks={setClicks}
        zoomTrigger={zoomTrigger}
        celestialBodies={celestialBodies}
        showWind={showWind}
        windData={windData}
        editingPegIndex={editingPegIndex}
        setEditingPegIndex={setEditingPegIndex}
      />

      <SidePanel
        mode={mode}
        clicks={clicks}
        rulerResult={rulerResult}
        polygonResult={polygonResult}
        unit={unit}
        isVisible={isPanelVisible}
        onToggleVisible={() => {
          setIsPanelVisible(!isPanelVisible);
          setShowAnalysisTooltip(false);
          setHasClickedAnalysis(true);
        }}
        showAnalysisTooltip={showAnalysisTooltip}
        onLoadFromPastedCoordinates={loadFromPastedCoordinates}
        planName={planName}
        celestialBodies={celestialBodies}
        setCelestialBodies={setCelestialBodies}
        showWind={showWind}
        setShowWind={setShowWind}
        windData={windData}
      />
      {import.meta.env.DEV && <Agentation />}
    </div>
  );
}

export default App;
