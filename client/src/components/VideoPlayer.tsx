import React, { useEffect, useRef, useState } from "react";

interface Props {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    isConnected: boolean;
    CrownIcon: React.FC;
}

export const VideoPlayer: React.FC<Props> = ({
    videoRef,
    isConnected,
    CrownIcon,
}) => {
    const [hasVideo, setHasVideo] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    /* check stream -------------------- */
    useEffect(() => {
        const vid = videoRef.current;
        if (!vid) return;

        vid.autoplay = true;
        vid.muted = true;
        vid.playsInline = true;
        vid.disablePictureInPicture = true;

        const check = () => setHasVideo(Boolean(vid.srcObject) && isConnected);
        vid.addEventListener("loadedmetadata", check);
        vid.addEventListener("emptied", check);
        vid.addEventListener("pause", check);
        check();

        return () => {
            vid.removeEventListener("loadedmetadata", check);
            vid.removeEventListener("emptied", check);
            vid.removeEventListener("pause", check);
        };
    }, [videoRef, isConnected]);

    /* UI -------------------------------- */
    return (
        <div className="video-container card-shell" ref={containerRef}>
            <video ref={videoRef} className="video-element" />

            {!hasVideo && (
                <div className="waiting-overlay">
                    <CrownIcon />
                    <p className="waiting-text">AWAITING&nbsp;CONNECTION</p>
                    {/* tiny elixir drop for fun */}
                    <div className="elixir-loader">
                        <svg viewBox="0 0 50 80" fill="#a34cff">
                            <path d="M25,5 Q40,20 40,50 Q40,70 25,75 Q10,70 10,50 Q10,20 25,5 Z" />
                        </svg>
                    </div>
                </div>
            )}
        </div>
    );
};
