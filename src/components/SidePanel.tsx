import React from 'react';

interface ResultProps {
    mode: 'none' | 'ruler' | 'polygon';
    rulerResult: { distanceMeters: number; pointA: [number, number]; pointB: [number, number] } | null;
    polygonResult: { areaSqMeters: number; vertices: [number, number][] } | null;
    unit: 'mm' | 'cm' | 'inch' | 'ft';
    isVisible: boolean;
    onToggleVisible: () => void;
}

const SidePanel: React.FC<ResultProps> = ({ mode, rulerResult, polygonResult, unit, isVisible, onToggleVisible }) => {
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

    return (
        <>
            <button className={`panel-toggle ${!isVisible ? 'collapsed' : ''}`} onClick={onToggleVisible}>
                {isVisible ? '→' : '←'}
            </button>

            <div className={`side-panel ${mode !== 'none' && isVisible ? 'visible' : ''}`}>
                <h3>Set Out Results</h3>

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
        </>
    );
};

export default SidePanel;
