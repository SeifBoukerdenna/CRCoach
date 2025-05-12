import React, { useEffect, useState } from "react";
import ImprovedGameInfoOverlay from "./gameInfoOverlay/GameInfoOverlay";
import { useBroadcast } from "../../context/BroadcastContext";
import "./ImprovedElixirDisplay.css";
import GameTimerDisplay from "./gameTimerDisplay/GameTimerDisplay";
import StreamMetrics from "./performance/streamMetrics/StreamMetrics";


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
    /** Game data for overlay */
    gameData?: {
        opponentCards: string[];
        playerCards?: string[];
        opponentElixir: number;
        elixirRate: "normal" | "2x" | "3x";
        opponentName: string;
        gameTime: string;
        currentCard: number;
    };
}

/**
 * VideoPlayer component displays the broadcast video stream
 * with loading and waiting states, and the enhanced game overlay
 */
export const VideoPlayer: React.FC<VideoPlayerProps> = ({
    videoRef,
    isConnected = false,
    LoadingIcon,
    CrownIcon,
    waitingText = "AWAITING CONNECTION",
    className = "",
    gameData,
}) => {
    // Get session code from broadcast context
    const { sessionCode } = useBroadcast();

    // Track if we have active video
    const [hasVideo, setHasVideo] = useState(false);

    // Configure video element
    useEffect(() => {
        const videoElement = videoRef.current;
        if (!videoElement) return;

        // Configure video element
        videoElement.autoplay = true;
        videoElement.muted = true;
        videoElement.playsInline = true;
        videoElement.disablePictureInPicture = true;
        videoElement.style.objectFit = "contain";

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
            <div className="video-wrapper">
                <video ref={videoRef} className="video-element" />

                {/* Game timer display - shown when connected */}
                {isConnected && sessionCode && (
                    <GameTimerDisplay
                        sessionCode={sessionCode}
                        className="video-overlay-timer"
                    />
                )}

                {/* Game info overlay - shown only when connected */}
                {isConnected && gameData && (
                    <ImprovedGameInfoOverlay
                        isConnected={isConnected}
                        opponentElixir={gameData.opponentElixir}
                        currentElixirRate={gameData.elixirRate}
                        playerCards={gameData.playerCards || ["hogrider", "musketeer", "valkyrie", "skeletons", "zap", "fireball", "log", "infernotower"]}
                        currentCard={gameData.currentCard}
                        opponentName={gameData.opponentName}
                        gameTime={gameData.gameTime}
                    />
                )}

                {/* Stream Metrics - only show when connected */}
                {isConnected && (
                    <StreamMetrics />
                )}
            </div>

            {/* Waiting overlay - shown when no video */}
            {!hasVideo && (
                <div className="waiting-overlay">
                    {CrownIcon && <CrownIcon />}
                    <p className="waiting-text">{waitingText}</p>
                    {LoadingIcon && <LoadingIcon />}
                </div>
            )}
        </div>
    );
};

export default VideoPlayer;