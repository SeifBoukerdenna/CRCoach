import React from 'react';

interface VideoPlayerProps {
    videoRef: React.RefObject<HTMLVideoElement | null>;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ videoRef }) => (
    <div className="video-container">
        <video ref={videoRef} autoPlay playsInline className="video-element" />
    </div>
);