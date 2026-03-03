import React from 'react';

type Mode = 'none' | 'ruler' | 'polygon';
type Unit = 'mm' | 'cm' | 'inch' | 'ft';

interface ToolbarProps {
    currentMode: Mode;
    setMode: (mode: Mode) => void;
    mapStyle: string;
    setMapStyle: (style: string) => void;
    unit: Unit;
    setUnit: (unit: Unit) => void;
    onClear: () => void;
    onSave: () => void;
    onExport: () => void;
    onImport: (file: File) => void;
    shareLink: string | null;
}

const Toolbar: React.FC<ToolbarProps> = ({
    currentMode, setMode, mapStyle, setMapStyle,
    unit, setUnit, onClear, onSave, onExport, onImport, shareLink
}) => {
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const toggleStyle = () => {
        setMapStyle(
            mapStyle === 'mapbox://styles/mapbox/dark-v11'
                ? 'mapbox://styles/mapbox/satellite-v9'
                : 'mapbox://styles/mapbox/dark-v11'
        );
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onImport(file);
        }
    };

    return (
        <div className="toolbar">
            <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept=".json"
                onChange={handleFileChange}
            />

            <button
                className={currentMode === 'ruler' ? 'active' : ''}
                onClick={() => setMode(currentMode === 'ruler' ? 'none' : 'ruler')}
            >
                <span className="icon">📏</span> Ruler
            </button>
            <button
                className={currentMode === 'polygon' ? 'active' : ''}
                onClick={() => setMode(currentMode === 'polygon' ? 'none' : 'polygon')}
                title="Set Out"
            >
                <span className="icon">⬢</span> Set Out
            </button>

            <div id="geocoder-dock" className="geocoder-dock"></div>

            <div className="unit-selector">
                <select value={unit} onChange={(e) => setUnit(e.target.value as Unit)}>
                    <option value="mm">mm</option>
                    <option value="cm">cm</option>
                    <option value="inch">in</option>
                    <option value="ft">ft</option>
                </select>
            </div>

            <button
                className={mapStyle.includes('satellite') ? 'active' : ''}
                onClick={toggleStyle}
            >
                <span className="icon">🛰️</span> {mapStyle.includes('satellite') ? 'Satellite' : 'Dark'}
            </button>

            <button onClick={onClear}>
                <span className="icon">✖</span> Clear
            </button>

            <div className="vertical-divider"></div>

            <button onClick={onSave} title="Save to History">
                <span className="icon">💾</span> Save
            </button>

            <button onClick={onExport} title="Download as File">
                <span className="icon">📥</span> Export
            </button>

            <button onClick={handleImportClick} title="Upload from File">
                <span className="icon">📤</span> Import
            </button>

            {shareLink && (
                <div className="share-box">
                    <button onClick={() => {
                        navigator.clipboard.writeText(shareLink);
                        alert('Link copied to clipboard!');
                    }}>
                        <span className="icon">🔗</span> Share Link
                    </button>
                </div>
            )}
        </div>
    );
};

export default Toolbar;
