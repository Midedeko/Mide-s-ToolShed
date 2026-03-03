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
    onShare: () => void;
    onExport: () => void;
    onImport: (file: File) => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
    currentMode, setMode, mapStyle, setMapStyle,
    unit, setUnit, onClear, onShare, onExport, onImport
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

            <div className="toolbar-group">
                <button className="group-label">
                    <span className="icon">✏️</span> Draw
                </button>
                <div className="group-dropdown">
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
                    <button onClick={onClear}>
                        <span className="icon">✖</span> Clear
                    </button>
                </div>
            </div>

            <div id="geocoder-dock" className="geocoder-dock"></div>

            <div className="toolbar-group">
                <button className="group-label">
                    <span className="icon">⚙️</span> Settings
                </button>
                <div className="group-dropdown">
                    <button
                        className={mapStyle.includes('satellite') ? 'active' : ''}
                        onClick={toggleStyle}
                    >
                        <span className="icon">🛰️</span> {mapStyle.includes('satellite') ? 'Satellite' : 'Dark Mode'}
                    </button>
                    <div className="unit-selector">
                        <select value={unit} onChange={(e) => setUnit(e.target.value as Unit)}>
                            <option value="mm">mm</option>
                            <option value="cm">cm</option>
                            <option value="inch">in</option>
                            <option value="ft">ft</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="vertical-divider"></div>

            <div className="toolbar-group">
                <button className="group-label">
                    <span className="icon">📁</span> File
                </button>
                <div className="group-dropdown">
                    <button onClick={onShare} title="Generate Share Link & Save">
                        <span className="icon">🔗</span> Share Link
                    </button>
                    <button onClick={onExport} title="Download as File">
                        <span className="icon">📥</span> Export
                    </button>
                    <button onClick={handleImportClick} title="Upload from File">
                        <span className="icon">📤</span> Import
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Toolbar;
