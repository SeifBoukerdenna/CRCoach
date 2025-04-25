import React, { useEffect, useState } from "react";
import { ClashRoyaleCrown, ElixirLoader } from "../../assets/icons";

interface VideoPlayerProps {
    /** Reference to the video element */
    videoRef: React.RefObject<HTMLVideoElement | null>;
    /** Whether currently connected to a stream */
    isConnected?: boolean;
    /** Custom loading icon component */
    LoadingIcon?: React.ComponentType;
    /** Custom crown icon component */
    CrownIcon?: React.ComponentType;
    /** Custom waiting text */
    waitingText?: string;
    /** Additional CSS class */
    className?: string;
}

/**
 * VideoPlayer component displays the broadcast video stream
 * with loading and waiting states
 */
export const VideoPlayer: React.FC<VideoPlayerProps> = ({
    videoRef,
    isConnected = false,
    LoadingIcon = ElixirLoader,
    CrownIcon = ClashRoyaleCrown,
    waitingText = "AWAITING CONNECTION",
    className = "",
}) => {
    // Track if we have active video
    const [hasVideo, setHasVideo] = useState(false);

    // Monitor video element for stream changes
    useEffect(() => {
        const videoElement = videoRef.current;
        if (!videoElement) return;

        // Configure video element
        videoElement.autoplay = true;
        videoElement.muted = true;
        videoElement.playsInline = true;
        videoElement.disablePictureInPicture = true;

        // Check if we have an active stream
        const checkVideoStatus = () => {
            setHasVideo(Boolean(videoElement.srcObject) && isConnected);
        };

        // Set up event listeners
        videoElement.addEventListener("loadedmetadata", checkVideoStatus);
        videoElement.addEventListener("emptied", checkVideoStatus);
        videoElement.addEventListener("pause", checkVideoStatus);

        // Check initial status
        checkVideoStatus();

        // Clean up on unmount
        return () => {
            videoElement.removeEventListener("loadedmetadata", checkVideoStatus);
            videoElement.removeEventListener("emptied", checkVideoStatus);
            videoElement.removeEventListener("pause", checkVideoStatus);
        };
    }, [videoRef, isConnected]);

    return (
        <div className={`video-container card-shell ${className}`}>
            {/* Video element */}
            <video ref={videoRef} className="video-element" />

            {/* Waiting overlay - shown when no video */}
            {!hasVideo && (
                <div className="waiting-overlay">
                    <CrownIcon />
                    <p className="waiting-text">{waitingText}</p>
                    <LoadingIcon />
                </div>
            )}
        </div>
    );
};

export default VideoPlayer;