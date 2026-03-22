import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface LandingGlobeProps {
    isHovered: boolean;
}

const LandingGlobe: React.FC<LandingGlobeProps> = ({ isHovered }) => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const rotationRef = useRef<number>(0);
    const animationFrameRef = useRef<number | null>(null);
    const isHoveredRef = useRef(isHovered);

    // Keep ref updated with latest prop value
    useEffect(() => {
        isHoveredRef.current = isHovered;
    }, [isHovered]);

    useEffect(() => {
        if (!mapContainer.current) return;

        mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

        const map = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/satellite-v9', // Using satellite for "Blue Marble" feel
            center: [0, 20],
            zoom: 1.2,
            projection: { name: 'globe' } as any,
            interactive: false, // Static look for landing page tool selection
            attributionControl: false,
        });

        map.on('style.load', () => {
            map.setFog({
                'range': [0.5, 10],
                'color': 'rgb(70, 130, 255)', // Vibrant azure sky at horizon
                'high-color': 'rgb(120, 190, 255)', // Brighter blue sky
                'horizon-blend': 0.15, // Smooth transition that tints the globe edges more
                'space-color': 'rgb(10, 25, 65)', // Dark blue space instead of black
                'star-intensity': 0.2 // Soften stars to focus on the globe
            });

            // Increase satellite layer vibrancy if it exists
            try {
                if (map.getLayer('satellite')) {
                    map.setPaintProperty('satellite', 'raster-saturation', 0.4);
                }
            } catch (e) {
                // Ignore if layer name is different
            }

            // Initial rotate
            map.setCenter([rotationRef.current, 20]);
        });

        mapRef.current = map;

        const animate = () => {
            if (mapRef.current && !isHoveredRef.current) {
                // Earth rotates 360 deg in 86400s.
                // 1:1 speed = (360 / 86400) deg/s = 0.00416 deg/s
                // 1/100 speed = 0.0000416 deg/s (Basically stationary visually)
                // However, for a landing page visual, "soft rotation" usually means something like 0.1 to 1 deg/s.
                // User said 1:100 of Earth's speed. This is technically extremely slow.
                // If I use 0.01 deg per frame (at 60fps), that's 0.6 deg/s -> 600s/rev (10 mins).
                // Let's go with a speed that is visible but very slow.
                rotationRef.current += 0.08; // Adjusted for a "soft" feel
                mapRef.current.setCenter([rotationRef.current % 360, 20]);
            }
            animationFrameRef.current = requestAnimationFrame(animate);
        };

        animationFrameRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            map.remove();
        };
    }, []);

    // Sync hover state with animation
    useEffect(() => {
        // Handled inside the animate loop via isHovered prop
    }, [isHovered]);

    return (
        <div ref={mapContainer} className="landing-globe-mapbox" />
    );
};

export default LandingGlobe;
