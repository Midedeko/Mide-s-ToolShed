import React from 'react';

// Import custom SVGs
import MeasureIcon from '../assets/icons/Measure Icon.svg?react';
import SetOutIcon from '../assets/icons/Set Out Icon.svg?react';
import SateliteIcon from '../assets/icons/Satelite Icon.svg?react';
import DarkmodeIcon from '../assets/icons/Darkmode Icon.svg?react';
import ExportIcon from '../assets/icons/Export Icon.svg?react';
import ImportIcon from '../assets/icons/Import Icon.svg?react';

type Mode = 'none' | 'ruler' | 'polygon';
type Unit = 'mm' | 'km' | 'ft' | 'mi';

interface ToolbarProps {
    currentMode: Mode;
    setMode: (mode: Mode) => void;
    mapStyle: string;
    setMapStyle: (style: string) => void;
    unit: Unit;
    setUnit: (unit: Unit) => void;
    is3D: boolean;
    setIs3D: (is3D: boolean) => void;
    onClear: () => void;
    onShare: () => void;
    onExport: () => void;
    onImport: (file: File) => void;
    onHidePanel?: () => void;
}

const SearchIcon = ({ color = "currentColor", size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 18 19" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 1.5C12.411 1.5 16 5.089 16 9.5C16 11.346 15.3645 13.043 14.3115 14.397L17.707 17.793C18.098 18.184 18.098 18.816 17.707 19.207C17.512 19.402 17.256 19.5 17 19.5C16.744 19.5 16.488 19.402 16.293 19.207L12.8975 15.812C11.5435 16.865 9.846 17.5 8 17.5C3.589 17.5 0 13.911 0 9.5C0 5.089 3.589 1.5 8 1.5ZM8 3.5C4.691 3.5 2 6.191 2 9.5C2 12.809 4.691 15.5 8 15.5C11.309 15.5 14 12.809 14 9.5C14 6.191 11.309 3.5 8 3.5Z" fill={color} />
    </svg>
);

const CloseIcon = ({ color = "currentColor", size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
);

const Toolbar: React.FC<ToolbarProps> = ({
    currentMode, setMode, mapStyle, setMapStyle, unit, setUnit, is3D, setIs3D,
    onClear, onShare, onExport, onImport, onHidePanel
}) => {
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [isSearching, setIsSearching] = React.useState(false);
    const [activeGroup, setActiveGroup] = React.useState<string | null>(null);
    const [showUnitsMenu, setShowUnitsMenu] = React.useState(false);

    const toggleStyle = () => {
        onHidePanel?.();
        setMapStyle(
            mapStyle === 'mapbox://styles/mapbox/dark-v11'
                ? 'mapbox://styles/mapbox/satellite-v9'
                : 'mapbox://styles/mapbox/dark-v11'
        );
        setActiveGroup(null);
    };

    const handleImportClick = () => {
        onHidePanel?.();
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
        setActiveGroup(null);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onImport(file);
        }
    };

    const toggleGroup = (group: string) => {
        setActiveGroup(activeGroup === group ? null : group);
        setShowUnitsMenu(false);
    };

    // Listen for search completion or clicks outside to close UI
    React.useEffect(() => {
        const handleSearchClose = () => setIsSearching(false);
        window.addEventListener('close-search', handleSearchClose);

        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Element;
            if (activeGroup && !target.closest('.toolbar-group')) {
                // Defer so dropdown button onClick runs first
                setTimeout(() => {
                    setActiveGroup(null);
                    setShowUnitsMenu(false);
                }, 0);
            }
        };

        window.addEventListener('click', handleClickOutside);
        return () => {
            window.removeEventListener('close-search', handleSearchClose);
            window.removeEventListener('click', handleClickOutside);
        };
    }, [isSearching, activeGroup]);

    return (
        <div className={`toolbar ${isSearching ? 'searching' : ''}`}>
            <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept=".json"
                onChange={handleFileChange}
            />

            <button
                className="search-trigger-btn"
                onClick={() => { onHidePanel?.(); setIsSearching(!isSearching); }}
            >
                {isSearching ? <CloseIcon color="white" size={20} /> : <SearchIcon color="white" size={18} />}
            </button>

            <div className="search-input-container">
                <div id="geocoder-dock" className="geocoder-dock"></div>
                <button className="search-continue-btn" onClick={() => { onHidePanel?.(); setIsSearching(false); }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                </button>
            </div>

            {!isSearching && (
                <>
                    <div className="toolbar-group">
                        <button className="group-label" onClick={() => { onHidePanel?.(); toggleGroup('create'); }}>
                            CREATE
                        </button>
                        <div className={`group-dropdown ${activeGroup === 'create' ? 'open' : ''}`}>
                            <button
                                className={currentMode === 'ruler' ? 'active' : ''}
                                onClick={() => { onHidePanel?.(); setMode(currentMode === 'ruler' ? 'none' : 'ruler'); setActiveGroup(null); }}
                            >
                                <MeasureIcon width="16" height="16" /> MEASURE
                            </button>
                            <button
                                className={currentMode === 'polygon' ? 'active' : ''}
                                onClick={() => { onHidePanel?.(); setMode(currentMode === 'polygon' ? 'none' : 'polygon'); setActiveGroup(null); }}
                            >
                                <SetOutIcon width="16" height="16" /> SET OUT
                            </button>
                            <button onClick={() => { onHidePanel?.(); onClear(); setActiveGroup(null); }} className="clear-btn">
                                ✖ CLEAR
                            </button>
                        </div>
                    </div>

                    <div className="toolbar-group">
                        <button className="group-label" onClick={() => { onHidePanel?.(); toggleGroup('settings'); }}>
                            SETTINGS
                        </button>
                        <div className={`group-dropdown ${activeGroup === 'settings' ? 'open' : ''}`}>
                            {!showUnitsMenu ? (
                                <>
                                    <button onClick={toggleStyle}>
                                        {mapStyle.includes('satellite') ? <DarkmodeIcon width="16" height="16" /> : <SateliteIcon width="16" height="16" />}
                                        {mapStyle.includes('satellite') ? 'DARK MODE' : 'SATELLITE'}
                                    </button>
                                    <button onClick={() => setIs3D(!is3D)}>
                                        {is3D ? '2D' : '3D'}
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); setShowUnitsMenu(true); }} style={{ justifyContent: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <span className="unit-label-desktop"><span style={{ fontSize: '14px', marginRight: '12px' }}>📏</span>UNIT: {unit.toUpperCase()}</span>
                                            <span className="unit-label-mobile">UNIT</span>
                                        </div>
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button onClick={(e) => { e.stopPropagation(); setShowUnitsMenu(false); }} style={{ color: '#94a3b8', justifyContent: 'center' }}>
                                        BACK
                                    </button>
                                    {['mm', 'km', 'ft', 'mi'].map((u) => (
                                        <button 
                                            key={u}
                                            className={unit === u ? 'active' : ''}
                                            onClick={() => { 
                                                onHidePanel?.(); 
                                                setUnit(u as Unit); 
                                                setActiveGroup(null); 
                                                setShowUnitsMenu(false); 
                                            }}
                                        >
                                            <span className="unit-name-desktop">
                                                {u === 'mm' ? 'MILLIMETER' : u === 'km' ? 'KILOMETERS' : u === 'ft' ? 'FEET' : 'MILES'}
                                            </span>
                                            <span className="unit-name-mobile">{u.toUpperCase()}</span>
                                        </button>
                                    ))}
                                </>
                            )}
                        </div>
                    </div>

                    <div className="toolbar-group">
                        <button className="group-label" onClick={() => { onHidePanel?.(); toggleGroup('files'); }}>
                            FILES
                        </button>
                        <div className={`group-dropdown ${activeGroup === 'files' ? 'open' : ''}`}>
                            <button onClick={() => { onHidePanel?.(); onShare(); setActiveGroup(null); }}>
                                SHARE LINK
                            </button>
                            <button onClick={() => { onHidePanel?.(); onExport(); setActiveGroup(null); }}>
                                <ExportIcon width="16" height="16" /> EXPORT
                            </button>
                            <button onClick={handleImportClick}>
                                <ImportIcon width="16" height="16" /> IMPORT
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default Toolbar;
