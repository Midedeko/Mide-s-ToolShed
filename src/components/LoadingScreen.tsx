import React, { useEffect, useState } from 'react';
import LogoIcon from '../assets/icons/Mides Toolshed Logo.svg?react';

interface LoadingScreenProps {
    onFadeComplete: () => void;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ onFadeComplete }) => {
    const [isFadingOut, setIsFadingOut] = useState(false);
    const [showLogo, setShowLogo] = useState(false);

    // Typewriter effect state
    const [text1, setText1] = useState('');
    const [text2, setText2] = useState('');
    const fullText1 = 'MIDE/S\\';
    const fullText2 = 'TOOLSHED';

    useEffect(() => {
        let currentIndex1 = 0;
        let currentIndex2 = 0;

        // Typing speed controls
        const typeSpeed = 80;

        const typeText1 = () => {
            if (currentIndex1 <= fullText1.length) {
                setText1(fullText1.slice(0, currentIndex1));
                currentIndex1++;
                setTimeout(typeText1, typeSpeed);
            } else {
                // Once line 1 is done, start line 2
                setTimeout(typeText2, typeSpeed);
            }
        };

        const typeText2 = () => {
            if (currentIndex2 <= fullText2.length) {
                setText2(fullText2.slice(0, currentIndex2));
                currentIndex2++;
                setTimeout(typeText2, typeSpeed);
            }
        };

        // Sequencing timeouts
        let fadeOutTimer: ReturnType<typeof setTimeout>;

        const startSequence = () => {
            // Step 1: Blank blue background is active.
            // Step 2: Fade in Logo at 500ms
            setTimeout(() => {
                setShowLogo(true);
            }, 500);

            // Step 3: Start typewriter at 1500ms
            setTimeout(() => {
                typeText1();
            }, 1500);

            // Step 4: Fade out everything at 4500ms
            fadeOutTimer = setTimeout(() => {
                setIsFadingOut(true);
                setTimeout(onFadeComplete, 800); // Wait for CSS transition
            }, 4500);
        };

        startSequence();

        return () => clearTimeout(fadeOutTimer);
    }, [onFadeComplete]);

    return (
        <div className={`loading-screen ${isFadingOut ? 'fade-out' : ''}`}>
            {/* SVG Filter for grainy noise */}
            <svg style={{ position: 'absolute', width: 0, height: 0 }}>
                <filter id="noiseFilter">
                    <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="4" stitchTiles="stitch" seed="42" />
                    <feColorMatrix type="saturate" values="0" />
                    <feComponentTransfer>
                        <feFuncA type="linear" slope="0.2" />
                    </feComponentTransfer>
                </filter>
            </svg>
            <div className="noise-overlay" />

            <div className="loading-content">
                <div className="logo-overlay-container">
                    <LogoIcon
                        className="loading-logo"
                        style={{
                            opacity: showLogo ? 1 : 0,
                            transition: 'opacity 1s ease-in-out'
                        }}
                    />
                    <div className="loading-text-overlay">
                        <h1 className="loading-text-line line-1">{text1}</h1>
                        <h1 className="loading-text-line line-2">{text2}</h1>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoadingScreen;
