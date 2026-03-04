import React, { useState, useEffect } from 'react';

interface ResultProps {
    mode: 'none' | 'ruler' | 'polygon';
    rulerResult: { distanceMeters: number; pointA: [number, number]; pointB: [number, number] } | null;
    polygonResult: { areaSqMeters: number; vertices: [number, number][] } | null;
    unit: 'mm' | 'cm' | 'inch' | 'ft';
    isVisible: boolean;
    onToggleVisible: () => void;
    onLoadHistory: (plan: any) => void;
    planName: string;
    historyVersion: number;
    timeOfDay: number;
    setTimeOfDay: (time: number) => void;
    showSolar: boolean;
    setShowSolar: (show: boolean) => void;
    showWind: boolean;
    setShowWind: (show: boolean) => void;
    windData: { dominantDirection: number; speed: number } | null;
}

const SidePanel: React.FC<ResultProps> = ({
    mode, rulerResult, polygonResult, unit,
    isVisible, onToggleVisible, onLoadHistory, planName, historyVersion,
    timeOfDay, setTimeOfDay, showSolar, setShowSolar, showWind, setShowWind, windData
}) => {
    const [activeTab, setActiveTab] = useState<'details' | 'history' | 'analysis'>('details');
    const [savedPlans, setSavedPlans] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        fetchLocalHistory();
    }, [activeTab, historyVersion]);

    const fetchLocalHistory = () => {
        setIsLoading(true);
        try {
            const historyStr = localStorage.getItem('site_planner_history') || '[]';
            const history = JSON.parse(historyStr);
            setSavedPlans(history);
        } catch (e) {
            console.error('Failed to parse local history', e);
        }
        setIsLoading(false);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert('Coordinates copied to clipboard!');
    };

    const convertDist = (meters: number) => {
        switch (unit) {
            case 'mm': return `${(meters * 1000).toLocaleString()} mm`;
            case 'cm': return `${(meters * 100).toLocaleString()} cm`;
            case 'inch': return `${(meters * 39.3701).toLocaleString()} in`;
            case 'ft': return `${(meters * 3.28084).toLocaleString()} ft`;
            default: return `${meters.toFixed(2)} m`;
        }
    };

    const convertArea = (sqMeters: number) => {
        const areaSqFt = sqMeters * 10.7639;
        const acres = sqMeters / 4046.86;
        return (
            <>
                <p><strong>Sq Meters:</strong> {sqMeters.toFixed(2)} m²</p>
                <p><strong>Sq Feet:</strong> {areaSqFt.toLocaleString()} ft²</p>
                <p><strong>Acres:</strong> {acres.toFixed(4)} acres</p>
            </>
        );
    };

    const getCardinalDirection = (angle: number) => {
        const directions = ['North', 'North-East', 'East', 'South-East', 'South', 'South-West', 'West', 'North-West'];
        const index = Math.round(((angle %= 360) < 0 ? angle + 360 : angle) / 45) % 8;
        return directions[index];
    };

    const formatTime = (decimalHours: number) => {
        const Math_floor = Math.floor(decimalHours);
        const mins = Math.round((decimalHours - Math_floor) * 60);
        const ampm = Math_floor >= 12 ? 'PM' : 'AM';
        const hours12 = Math_floor % 12 || 12;
        return `${hours12}:${mins.toString().padStart(2, '0')} ${ampm}`;
    };

    const EyeIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    );

    const EyeOffIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
            <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
            <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
            <line x1="2" y1="2" x2="22" y2="22" />
        </svg>
    );

    return (
        <>
            <button className={`panel-toggle ${!isVisible ? 'collapsed' : ''}`} onClick={onToggleVisible} title={isVisible ? "Hide Panel" : "Show Panel"}>
                {isVisible ? <EyeIcon /> : <EyeOffIcon />}
            </button>

            <div className={`side-panel ${isVisible ? 'visible' : ''}`}>
                <div className="panel-tabs">
                    <button
                        className={activeTab === 'details' ? 'active' : ''}
                        onClick={() => setActiveTab('details')}
                    >
                        Details
                    </button>
                    <button
                        className={activeTab === 'history' ? 'active' : ''}
                        onClick={() => setActiveTab('history')}
                    >
                        Saved Plans
                    </button>
                    <button
                        className={activeTab === 'analysis' ? 'active' : ''}
                        onClick={() => setActiveTab('analysis')}
                    >
                        Analysis
                    </button>
                </div>

                {activeTab === 'details' ? (
                    <div className="tab-content">
                        <h3>{planName || 'Current Plan'}</h3>

                        {rulerResult && (
                            <div className="result-section">
                                <h4>Ruler Distance ({unit})</h4>
                                <p className="primary-result">{convertDist(rulerResult.distanceMeters)}</p>
                                <div className="point-list">
                                    <div>
                                        <span>Peg 1: {rulerResult.pointA[1].toFixed(6)}, {rulerResult.pointA[0].toFixed(6)}</span>
                                        <button onClick={() => copyToClipboard(`${rulerResult.pointA[1]}, ${rulerResult.pointA[0]}`)}>Copy</button>
                                    </div>
                                    <div>
                                        <span>Peg 2: {rulerResult.pointB[1].toFixed(6)}, {rulerResult.pointB[0].toFixed(6)}</span>
                                        <button onClick={() => copyToClipboard(`${rulerResult.pointB[1]}, ${rulerResult.pointB[0]}`)}>Copy</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {polygonResult && (
                            <div className="result-section" style={{ marginTop: '24px' }}>
                                <h4>Site Area</h4>
                                {convertArea(polygonResult.areaSqMeters)}
                                <div className="point-list">
                                    {polygonResult.vertices.map((v, i) => (
                                        <div key={i}>
                                            <span>Peg {i + 1}: {v[1].toFixed(6)}, {v[0].toFixed(6)}</span>
                                            <button onClick={() => copyToClipboard(`${v[1]}, ${v[0]}`)}>Copy</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {!rulerResult && !polygonResult && mode !== 'none' && (
                            <p className="hint">
                                {mode === 'ruler'
                                    ? 'Click two points to measure distance.'
                                    : 'Click 4 points to set out the site boundary. Drag pegs to adjust. Right-click pegs to delete.'}
                            </p>
                        )}
                    </div>
                ) : activeTab === 'analysis' ? (
                    <div className="tab-content">
                        <h3>Site Analysis</h3>
                        <p className="hint" style={{ marginTop: 0, textAlign: 'left' }}>Toggle and configure environmental overlays.</p>

                        <div className="result-section" style={{ marginTop: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                <h4>Solar Path</h4>
                                <label className="switch">
                                    <input type="checkbox" checked={showSolar} onChange={(e) => setShowSolar(e.target.checked)} />
                                    <span className="slider round"></span>
                                </label>
                            </div>

                            {showSolar && (
                                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span>Time of Day</span>
                                        <strong>{formatTime(timeOfDay)}</strong>
                                    </div>
                                    <input
                                        type="range"
                                        min="0" max="23.9" step="0.1"
                                        value={timeOfDay}
                                        onChange={(e) => setTimeOfDay(parseFloat(e.target.value))}
                                        style={{ width: '100%', accentColor: '#eab308' }}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="result-section" style={{ marginTop: '32px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                <h4>NASA Wind Rose</h4>
                                <label className="switch">
                                    <input type="checkbox" checked={showWind} onChange={(e) => setShowWind(e.target.checked)} />
                                    <span className="slider round"></span>
                                </label>
                            </div>

                            {showWind && windData && (
                                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px' }}>
                                    <p style={{ fontSize: '1rem', margin: '0 0 12px 0' }}>
                                        Dominant: <strong>{getCardinalDirection(windData.dominantDirection)}</strong> ({windData.dominantDirection}°)
                                    </p>
                                    <div style={{ padding: '12px', background: 'rgba(56, 189, 248, 0.1)', borderLeft: '4px solid #38bdf8', borderRadius: '4px', fontSize: '0.9rem', lineHeight: 1.5 }}>
                                        <strong>Bio-Climatic Tip:</strong> Primary cooling breeze from the {getCardinalDirection(windData.dominantDirection)}. Suggest permeable facade on the {getCardinalDirection(windData.dominantDirection)} elevation to maximize cross-ventilation.
                                    </div>
                                </div>
                            )}

                            {showWind && !windData && polygonResult && (
                                <p className="hint">Fetching NASA POWER climate data...</p>
                            )}
                            {showWind && !polygonResult && (
                                <p className="hint">Draw a site boundary to fetch local wind data.</p>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="tab-content">
                        <h3>Saved Plans</h3>
                        {isLoading ? (
                            <p className="hint">Loading history...</p>
                        ) : savedPlans.length > 0 ? (
                            <div className="history-list">
                                {savedPlans.map(plan => (
                                    <div key={plan.id} className="history-item">
                                        <div className="history-info">
                                            <strong>{plan.name}</strong>
                                            <span>{new Date(plan.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <button onClick={() => onLoadHistory(plan)}>Load</button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="hint">No saved plans found in your browser history.</p>
                        )}
                    </div>
                )}
            </div>
        </>
    );
};

export default SidePanel;
