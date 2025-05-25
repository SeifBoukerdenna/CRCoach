import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Maximize2, Minimize2, Settings, Zap, Monitor } from 'lucide-react';
import type { StreamStats } from '../types';

interface VideoStreamProps {
    videoRef: React.RefObject<HTMLVideoElement | null>; // Fix: Allow null
    sessionCode: string;
    streamStats: StreamStats | null;
}

const VideoStream: React.FC<VideoStreamProps> = ({
    videoRef,
    sessionCode,
    streamStats
}) => {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showStats, setShowStats] = useState(false);
    const [videoReady, setVideoReady] = useState(false);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleLoadedData = () => {
            setVideoReady(true);
        };

        const handlePlay = () => {
            setVideoReady(true);
        };

        const handleError = () => {
            setVideoReady(false);
        };

        video.addEventListener('loadeddata', handleLoadedData);
        video.addEventListener('play', handlePlay);
        video.addEventListener('error', handleError);

        return () => {
            video.removeEventListener('loadeddata', handleLoadedData);
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('error', handleError);
        };
    }, [videoRef]);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const toggleFullscreen = async () => {
        const videoContainer = videoRef.current?.parentElement;
        if (!videoContainer) return;

        try {
            if (!document.fullscreenElement) {
                await videoContainer.requestFullscreen();
            } else {
                await document.exitFullscreen();
            }
        } catch (error) {
            console.error('Fullscreen error:', error);
        }
    };

    const getQualityColor = (fps: number) => {
        if (fps >= 30) return 'text-green-400';
        if (fps >= 20) return 'text-yellow-400';
        return 'text-red-400';
    };

    const getLatencyColor = (latency: number) => {
        if (latency < 100) return 'text-green-400';
        if (latency < 300) return 'text-yellow-400';
        return 'text-red-400';
    };

    return (
        <motion.div
            className="relative bg-black rounded-2xl overflow-hidden border-4 border-cr-gold shadow-2xl"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
        >
            {/* Video Element */}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                controls={false}
                className="w-full h-auto block bg-black"
                style={{ aspectRatio: '16/9' }}
            />

            {/* Loading Overlay */}
            {!videoReady && (
                <motion.div
                    className="absolute inset-0 bg-black/80 flex items-center justify-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <div className="text-center">
                        <div className="w-16 h-16 border-4 border-cr-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-white text-lg font-medium">Connecting to stream...</p>
                        <p className="text-white/60 text-sm mt-2">Session: {sessionCode}</p>
                    </div>
                </motion.div>
            )}

            {/* Video Overlay Controls */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
                {/* Session Info */}
                <motion.div
                    className="bg-black/70 backdrop-blur-sm rounded-lg px-4 py-2 border border-cr-gold/30"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-white font-bold text-lg">LIVE</span>
                    </div>
                    <p className="text-white/80 text-sm">Session: {sessionCode}</p>
                </motion.div>

                {/* Control Buttons */}
                <motion.div
                    className="flex gap-2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <motion.button
                        onClick={() => setShowStats(!showStats)}
                        className="bg-black/70 backdrop-blur-sm border border-cr-gold/30 rounded-lg p-2 text-white hover:bg-black/90 transition-colors"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        title="Toggle Stats"
                    >
                        <Settings className="w-5 h-5" />
                    </motion.button>

                    <motion.button
                        onClick={toggleFullscreen}
                        className="bg-black/70 backdrop-blur-sm border border-cr-gold/30 rounded-lg p-2 text-white hover:bg-black/90 transition-colors"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                    >
                        {isFullscreen ? (
                            <Minimize2 className="w-5 h-5" />
                        ) : (
                            <Maximize2 className="w-5 h-5" />
                        )}
                    </motion.button>
                </motion.div>
            </div>

            {/* Stats Overlay */}
            {showStats && streamStats && (
                <motion.div
                    className="absolute bottom-4 left-4 bg-black/80 backdrop-blur-sm rounded-lg p-4 border border-cr-gold/30"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                >
                    <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                        <Monitor className="w-4 h-4 text-cr-gold" />
                        Stream Statistics
                    </h4>

                    <div className="space-y-2 text-sm">
                        {streamStats.fps !== undefined && (
                            <div className="flex justify-between gap-4">
                                <span className="text-white/70">Frame Rate:</span>
                                <span className={`font-bold ${getQualityColor(streamStats.fps)}`}>
                                    {streamStats.fps} FPS
                                </span>
                            </div>
                        )}

                        {streamStats.resolution && (
                            <div className="flex justify-between gap-4">
                                <span className="text-white/70">Resolution:</span>
                                <span className="text-white font-medium">{streamStats.resolution}</span>
                            </div>
                        )}

                        {streamStats.bitrate !== undefined && (
                            <div className="flex justify-between gap-4">
                                <span className="text-white/70">Bitrate:</span>
                                <span className="text-white font-medium">{streamStats.bitrate} kbps</span>
                            </div>
                        )}

                        {streamStats.latency !== undefined && (
                            <div className="flex justify-between gap-4">
                                <span className="text-white/70">Latency:</span>
                                <span className={`font-bold ${getLatencyColor(streamStats.latency)}`}>
                                    {streamStats.latency}ms
                                </span>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}

            {/* Quality Indicator */}
            {streamStats?.fps !== undefined && (
                <motion.div
                    className="absolute bottom-4 right-4"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 }}
                >
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${streamStats.fps >= 30
                        ? 'bg-green-900/70 border border-green-500/50'
                        : streamStats.fps >= 20
                            ? 'bg-yellow-900/70 border border-yellow-500/50'
                            : 'bg-red-900/70 border border-red-500/50'
                        }`}>
                        <Zap className={`w-4 h-4 ${getQualityColor(streamStats.fps)}`} />
                        <span className={`text-sm font-bold ${getQualityColor(streamStats.fps)}`}>
                            {streamStats.fps >= 30 ? 'HD' : streamStats.fps >= 20 ? 'SD' : 'LOW'}
                        </span>
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
};

export default VideoStream;