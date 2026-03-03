import { useState, useCallback, useEffect } from 'react';
import './App.css';
import Map from './components/Map.tsx';
import Toolbar from './components/Toolbar.tsx';
import SidePanel from './components/SidePanel.tsx';
import { supabase } from './lib/supabase.ts';

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
  const [clicks, setClicks] = useState<[number, number][]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);

  // Load plan from URL if ID is present
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const planId = urlParams.get('plan');
    if (planId) {
      loadPlan(planId);
    }
  }, []);

  const loadPlan = async (id: string) => {
    const { data, error } = await supabase
      .from('site_plans')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error loading plan:', error);
      return;
    }

    if (data) {
      setClicks(data.data.clicks);
      setUnit(data.data.unit || 'ft');
      setMapStyle(data.data.mapStyle || 'mapbox://styles/mapbox/dark-v11');
      if (data.data.siteStyle) setSiteStyle(data.data.siteStyle);
      setShareLink(window.location.href);
    }
  };

  const handleSave = async () => {
    if (clicks.length === 0) {
      alert('Please add some points to the map before saving.');
      return;
    }

    setIsSaving(true);
    const planData = {
      clicks,
      unit,
      mapStyle,
      siteStyle
    };

    const { data, error } = await supabase
      .from('site_plans')
      .insert([{ name: 'Unnamed Plan', data: planData }])
      .select()
      .single();

    setIsSaving(false);

    if (error) {
      console.error('Error saving plan:', error);
      alert('Failed to save plan: ' + error.message);
    } else if (data) {
      const newUrl = `${window.location.origin}${window.location.pathname}?plan=${data.id}`;
      setShareLink(newUrl);
      window.history.pushState({}, '', newUrl);
    }
  };

  const handleRulerResult = useCallback((distanceMeters: number, pointA: [number, number], pointB: [number, number]) => {
    setRulerResult({ distanceMeters, pointA, pointB });
  }, []);

  const handlePolygonResult = useCallback((areaSqMeters: number, vertices: [number, number][]) => {
    setPolygonResult({ areaSqMeters, vertices });
  }, []);

  const handleClear = useCallback(() => {
    setRulerResult(null);
    setPolygonResult(null);
    setClicks([]);
    setShareLink(null);
    setMode('none');
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
        onSave={handleSave}
        isSaving={isSaving}
        shareLink={shareLink}
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
