import { useState, useCallback, useEffect } from 'react';
import LZString from 'lz-string';
import './App.css';
import Map from './components/Map.tsx';
import Toolbar from './components/Toolbar.tsx';
import SidePanel from './components/SidePanel.tsx';

type Mode = 'none' | 'ruler' | 'polygon';

interface SavedPlan {
  id: string;
  name: string;
  data: any;
  created_at: string;
}

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
  const [clicks, setClicks] = useState<[number, number][]>([]);
  const [planName, setPlanName] = useState<string>('Unnamed Plan');
  const [historyVersion, setHistoryVersion] = useState(0); // Used to trigger SidePanel refresh
  const [zoomTrigger, setZoomTrigger] = useState(0); // Signal map to fly to site

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

    // Save to Local Storage History (Automatically on Share)
    try {
      const historyStr = localStorage.getItem('site_planner_history') || '[]';
      const history = JSON.parse(historyStr);
      const newPlan: SavedPlan = {
        id: crypto.randomUUID(),
        name: finalName,
        data: planData,
        created_at: new Date().toISOString()
      };
      history.unshift(newPlan);
      localStorage.setItem('site_planner_history', JSON.stringify(history.slice(0, 50)));
      setHistoryVersion(v => v + 1);

      // Copy to clipboard
      navigator.clipboard.writeText(selfSufficientUrl);
      alert('Link generated and copied to clipboard! Plan also saved to your local history.');
    } catch (e) {
      console.error('Failed to save to local storage', e);
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

  const loadFromHistory = (plan: SavedPlan) => {
    applyPlanData(plan.data);
    setZoomTrigger(v => v + 1);
    setIsPanelVisible(true);
    const encoded = LZString.compressToEncodedURIComponent(JSON.stringify(plan.data));
    const newUrl = `${window.location.origin}${window.location.pathname}?s=${encoded}`;
    window.history.pushState({}, '', newUrl);
  };

  const handleRulerResult = useCallback((distanceMeters: number, pointA: [number, number], pointB: [number, number]) => {
    setRulerResult({ distanceMeters, pointA, pointB });
  }, []);

  const handlePolygonResult = useCallback((areaSqMeters: number, vertices: [number, number][]) => {
    setPolygonResult({ areaSqMeters: areaSqMeters || 0, vertices: vertices || [] });
  }, []);

  const handleClear = useCallback(() => {
    setRulerResult(null);
    setPolygonResult(null);
    setClicks([]);
    setMode('none');
    setPlanName('Unnamed Plan');
    window.history.pushState({}, '', window.location.pathname);
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
        onShare={handleShare}
        onExport={handleExport}
        onImport={handleImport}
      />

      <Map
        mode={mode}
        mapStyle={mapStyle}
        unit={unit}
        siteStyle={siteStyle}
        setSiteStyle={setSiteStyle}
        onRulerResult={handleRulerResult}
        onPolygonResult={handlePolygonResult}
        clicks={clicks}
        setClicks={setClicks}
        zoomTrigger={zoomTrigger}
      />

      <SidePanel
        mode={mode}
        rulerResult={rulerResult}
        polygonResult={polygonResult}
        unit={unit}
        isVisible={isPanelVisible}
        onToggleVisible={() => setIsPanelVisible(!isPanelVisible)}
        onLoadHistory={loadFromHistory}
        planName={planName}
        historyVersion={historyVersion}
      />
    </div>
  );
}

export default App;
