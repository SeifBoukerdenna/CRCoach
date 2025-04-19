import React, { useEffect, useRef, useState } from "react";

interface VideoPlayerProps {
    videoRef: React.RefObject<HTMLVideoElement | null>;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ videoRef }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [hasVideo, setHasVideo] = useState(false);

    useEffect(() => {
        if (!videoRef.current) return;

        const video = videoRef.current;

        // config
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;
        video.disablePictureInPicture = true;
        video.disableRemotePlayback = true;
        video.preload = "auto";

        video.style.transform = "translateZ(0)";

        const checkStream = () => {
            setHasVideo(!!video.srcObject);
        };

        video.addEventListener("loadedmetadata", checkStream);
        video.addEventListener("emptied", checkStream);
        video.addEventListener("pause", checkStream);

        return () => {
            video.removeEventListener("loadedmetadata", checkStream);
            video.removeEventListener("emptied", checkStream);
            video.removeEventListener("pause", checkStream);
        };
    }, [videoRef]);

    return (
        <div className="video-container" ref={containerRef}>
            <video ref={videoRef} className="video-element" />
            {!hasVideo && (
                <div className="waiting-overlay">
                    <p className="waiting-text">Waiting for Connection…</p>
                </div>
            )}
        </div>
    );
};
