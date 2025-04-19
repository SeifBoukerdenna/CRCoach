/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef } from 'react';

// Add type definition for NetworkInformation
interface NetworkInformation {
    saveData?: boolean;
    // Add other properties if needed
    effectiveType?: string;
    downlink?: number;
}

// Extend Navigator to include connection property
interface ExtendedNavigator extends Navigator {
    connection?: NetworkInformation;
}

interface VideoPlayerProps {
    videoRef: React.RefObject<HTMLVideoElement | null>;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ videoRef }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    // Apply low-latency optimizations to video element
    useEffect(() => {
        if (!videoRef.current) return;

        const video = videoRef.current;

        // Set properties for lowest possible latency
        video.autoplay = true;        // Autoplay when stream is available
        video.muted = true;           // Muted to ensure autoplay works
        video.playsInline = true;     // For mobile support

        // Low latency settings
        if ('mozNoDeferredSrc' in video) {
            // Firefox-specific
            (video as any).mozNoDeferredSrc = true;
        }

        // Chrome/Safari specific settings
        video.setAttribute('playsinline', 'true');  // Ensure iOS plays inline

        // Lowest latency buffer settings
        if ('webkitLowLatencyEnabled' in video) {
            // Safari-specific
            (video as any).webkitLowLatencyEnabled = true;
        }

        // Set buffer mode to minimize latency
        video.preload = 'auto';

        // Disable picture-in-picture and remote playback for performance
        video.disablePictureInPicture = true;
        video.disableRemotePlayback = true;

        // Apply hardware acceleration where available
        video.style.transform = 'translateZ(0)';  // Force GPU acceleration

        // Set video to prefer performance over quality - using type casting for experimental API
        const extendedNavigator = navigator as ExtendedNavigator;
        if (extendedNavigator.connection && extendedNavigator.connection.saveData) {
            // Set low-res if in data-saving mode
            video.style.imageRendering = 'optimizeSpeed';
        }

        // Event listeners for performance monitoring
        video.addEventListener('waiting', () => {
            console.log('Video buffering detected');
        });

        video.addEventListener('stalled', () => {
            console.log('Video stalled - network issue');
        });

        // Force play on loadedmetadata
        video.addEventListener('loadedmetadata', () => {
            video.play().catch(err => console.warn('Auto-play failed:', err));
        });
    }, [videoRef]);

    return (
        <div className="video-container" ref={containerRef}>
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="video-element"
            />
        </div>
    );
};