import React, { useState } from 'react';
import ToolshedLogo from '../assets/icons/Mides Toolshed Logo.svg?react';
import LockIcon from '../assets/icons/Lock Icon.svg?react';
import LeftButtonIcon from '../assets/icons/Left Button.svg?react';
import RightButtonIcon from '../assets/icons/Right Button.svg?react';
import LandingGlobe from './LandingGlobe';

interface LandingPageProps {
    onSelectTool: (toolId: string) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onSelectTool }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isGlobeHovered, setIsGlobeHovered] = useState(false);

    const tools = [
        {
            id: 'geo-planner',
            name: 'GEO / SITE PLANNER',
            nameLine1: 'GEO / SITE',
            nameLine2: 'PLANNER',
            description: 'Site analysis and spatial planning tool.',
            locked: false,
            image: '/globe-placeholder.png'
        },
        {
            id: 'hdri-burner',
            name: 'HDRI BURNER [LOCKED]',
            nameLine1: 'HDRI BURNER',
            nameLine2: '[LOCKED]',
            description: 'Advanced illumination and HDRI processing.',
            locked: true,
            image: '/lock-placeholder.png'
        }
    ];

    const handleNext = () => setCurrentIndex((prev) => (prev + 1) % tools.length);
    const handlePrev = () => setCurrentIndex((prev) => (prev - 1 + tools.length) % tools.length);

    const currentTool = tools[currentIndex];

    return (
        <div className="landing-page">
            {/* SVG Filter for grainy noise */}
            <svg style={{ position: 'absolute', width: 0, height: 0 }}>
                <filter id="landingNoise">
                    <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="4" stitchTiles="stitch" seed="123" />
                    <feColorMatrix type="saturate" values="0" />
                    <feComponentTransfer>
                        <feFuncA type="linear" slope="0.15" />
                    </feComponentTransfer>
                </filter>
            </svg>
            <div className="landing-noise-overlay" />

            <header className="landing-header">
                <div className="brand-text-left">
                    <span className="brand-line1">MIDE/S\</span>{' '}
                    <span className="brand-line2">TOOLSHED</span>
                </div>
                <div
                    className="mides-toolshed-logo-center clickable"
                    onClick={() => onSelectTool('landing')}
                    style={{ cursor: 'pointer' }}
                >
                    <ToolshedLogo className="logo-svg" style={{ width: '48px', height: '48px' }} />
                </div>
            </header>

            <main className="landing-main">
                <div className="orbit-container">
                    <div className="ellipse-frame"></div>

                    <button className="nav-btn prev" onClick={handlePrev}>
                        <LeftButtonIcon style={{ width: '60px', height: '60px' }} />
                    </button>

                    <div className="tool-display">
                        <div className={`tool-visual locked ${currentTool.locked ? 'active' : 'inactive'}`}>
                            <LockIcon style={{ width: '80px', height: '80px', color: '#615CE5' }} />
                        </div>

                        <div
                            className={`tool-visual globe-container ${!currentTool.locked ? 'active' : 'inactive'}`}
                            onClick={() => !currentTool.locked && onSelectTool(currentTool.id)}
                            onMouseEnter={() => setIsGlobeHovered(true)}
                            onMouseLeave={() => setIsGlobeHovered(false)}
                            onTouchStart={() => setIsGlobeHovered(true)}
                            onTouchEnd={() => setIsGlobeHovered(false)}
                        >
                            <div className="globe-3d">
                                <LandingGlobe isHovered={isGlobeHovered} />
                                <div className="globe-shadow"></div>
                            </div>
                            <div className="globe-atmosphere"></div>
                        </div>
                    </div>

                    <button className="nav-btn next" onClick={handleNext}>
                        <RightButtonIcon style={{ width: '60px', height: '60px' }} />
                    </button>
                </div>

                <div className="tool-info">
                    <h2 className="tool-name">
                        <span className="tool-name-line1">{currentTool.nameLine1}</span>{' '}
                        <span className="tool-name-line2">{currentTool.nameLine2}</span>
                    </h2>
                </div>
            </main>
        </div>
    );
};

export default LandingPage;
