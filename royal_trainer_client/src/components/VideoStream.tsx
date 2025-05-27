import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Maximize2,
    Minimize2,
    Settings,
    Zap,
    Monitor,
    Volume2,
    VolumeX,
    Camera,
    Signal,
    Wifi
} from 'lucide-react';
import type { StreamStats } from '../types';

interface VideoStreamProps {
    videoRef: React.RefObject<HTMLVideoElement>;
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
    const [isMuted, setIsMuted] = useState(true);
    const [showControls, setShowControls] = useState(true);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleLoadedMetadata = () => {
            setVideoReady(true);
        };

        const handlePlay = () => {
            setVideoReady(true);
        };

        const handleError = () => {
            setVideoReady(false);
        };

        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('play', handlePlay);
        video.addEventListener('error', handleError);

        return () => {
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
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

    // Auto-hide controls after inactivity
    useEffect(() => {
        let timeout: NodeJS.Timeout;

        const resetTimeout = () => {
            setShowControls(true);
            clearTimeout(timeout);
            timeout = setTimeout(() => setShowControls(false), 3000);
        };

        const handleMouseMove = () => resetTimeout();
        const handleMouseLeave = () => {
            clearTimeout(timeout);
            setShowControls(false);
        };

        if (videoRef.current) {
            videoRef.current.addEventListener('mousemove', handleMouseMove);
            videoRef.current.addEventListener('mouseleave', handleMouseLeave);
            videoRef.current.addEventListener('mouseenter', resetTimeout);
        }

        return () => {
            clearTimeout(timeout);
            if (videoRef.current) {
                videoRef.current.removeEventListener('mousemove', handleMouseMove);
                videoRef.current.removeEventListener('mouseleave', handleMouseLeave);
                videoRef.current.removeEventListener('mouseenter', resetTimeout);
            }
        };
    }, [videoRef]);

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

    const toggleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !videoRef.current.muted;
            setIsMuted(videoRef.current.muted);
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

    const getSignalStrength = () => {
        if (!streamStats?.fps) return 0;
        if (streamStats.fps >= 30) return 3;
        if (streamStats.fps >= 20) return 2;
        return 1;
    };

    return (
        <motion.div
            className="relative bg-gradient-to-br from-black via-slate-900 to-black rounded-3xl overflow-hidden border-2 border-slate-700/50 shadow-2xl w-full"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
        >
            {/* Enhanced Video Element - Larger */}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={isMuted}
                controls={false}
                className="w-full h-auto max-h-[75vh] object-contain bg-black cursor-pointer"
                onClick={toggleFullscreen}
                onLoadedMetadata={() => console.log("Video metadata loaded successfully")}
                onError={() => console.error("Failed to load video")}
            />

            {/* Elegant gradient overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/20 pointer-events-none" />

            {/* Top Left - Session Info - Compact */}
            <AnimatePresence>
                {showControls && (
                    <motion.div
                        className="absolute top-4 left-4"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div className="bg-black/70 backdrop-blur-xl rounded-xl px-4 py-3 border border-white/20 shadow-xl">
                            <div className="flex items-center gap-2 mb-1">
                                <motion.div
                                    className="w-3 h-3 bg-red-500 rounded-full"
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                />
                                <span className="text-white font-bold text-base tracking-wider">LIVE</span>
                                <div className="flex items-center gap-1">
                                    {[...Array(3)].map((_, i) => (
                                        <div
                                            key={i}
                                            className={`w-1 h-2 rounded-full ${i < getSignalStrength() ? 'bg-green-400' : 'bg-gray-600'
                                                }`}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="text-white/90 text-sm font-medium mb-1">
                                Session: <span className="text-yellow-400 font-mono">{sessionCode}</span>
                            </div>
                            {videoReady && videoRef.current && (
                                <div className="text-green-400 text-xs font-medium">
                                    {videoRef.current.videoWidth}×{videoRef.current.videoHeight}
                                    {streamStats?.fps && (
                                        <span className="ml-2">• {streamStats.fps} FPS</span>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Top Right - Control Buttons - Compact */}
            <AnimatePresence>
                {showControls && (
                    <motion.div
                        className="absolute top-4 right-4 flex gap-2"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.3 }}
                    >
                        {/* Audio Toggle */}
                        <motion.button
                            onClick={toggleMute}
                            className="bg-black/70 backdrop-blur-xl border border-white/20 rounded-lg p-2 text-white hover:bg-black/90 transition-all duration-200 shadow-lg"
                            whileHover={{ scale: 1.1, y: -2 }}
                            whileTap={{ scale: 0.9 }}
                            title={isMuted ? "Unmute" : "Mute"}
                        >
                            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                        </motion.button>

                        {/* Stats Toggle */}
                        <motion.button
                            onClick={() => setShowStats(!showStats)}
                            className={`backdrop-blur-xl border rounded-lg p-2 text-white transition-all duration-200 shadow-lg ${showStats
                                ? 'bg-blue-600/70 border-blue-400/50'
                                : 'bg-black/70 border-white/20 hover:bg-black/90'
                                }`}
                            whileHover={{ scale: 1.1, y: -2 }}
                            whileTap={{ scale: 0.9 }}
                            title="Toggle Statistics"
                        >
                            <Settings className="w-4 h-4" />
                        </motion.button>

                        {/* Fullscreen Toggle */}
                        <motion.button
                            onClick={toggleFullscreen}
                            className="bg-black/70 backdrop-blur-xl border border-white/20 rounded-lg p-2 text-white hover:bg-black/90 transition-all duration-200 shadow-lg"
                            whileHover={{ scale: 1.1, y: -2 }}
                            whileTap={{ scale: 0.9 }}
                            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                        >
                            {isFullscreen ? (
                                <Minimize2 className="w-4 h-4" />
                            ) : (
                                <Maximize2 className="w-4 h-4" />
                            )}
                        </motion.button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Enhanced Stats Overlay */}
            <AnimatePresence>
                {showStats && streamStats && (
                    <motion.div
                        className="absolute bottom-6 left-6 bg-black/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-2xl min-w-80"
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        transition={{ duration: 0.3 }}
                    >
                        <h4 className="text-white font-bold text-lg mb-4 flex items-center gap-3">
                            <Monitor className="w-5 h-5 text-blue-400" />
                            Stream Analytics
                        </h4>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                            {streamStats.fps !== undefined && (
                                <div className="bg-slate-800/50 rounded-xl p-3">
                                    <div className="text-white/70 text-xs mb-1">Frame Rate</div>
                                    <div className={`font-bold text-lg flex items-center gap-2 ${getQualityColor(streamStats.fps)}`}>
                                        <Zap className="w-4 h-4" />
                                        {streamStats.fps} FPS
                                    </div>
                                </div>
                            )}

                            {streamStats.resolution && (
                                <div className="bg-slate-800/50 rounded-xl p-3">
                                    <div className="text-white/70 text-xs mb-1">Resolution</div>
                                    <div className="text-white font-bold text-lg flex items-center gap-2">
                                        <Camera className="w-4 h-4" />
                                        {streamStats.resolution}
                                    </div>
                                </div>
                            )}

                            {streamStats.bitrate !== undefined && (
                                <div className="bg-slate-800/50 rounded-xl p-3">
                                    <div className="text-white/70 text-xs mb-1">Bitrate</div>
                                    <div className="text-white font-bold text-lg flex items-center gap-2">
                                        <Signal className="w-4 h-4" />
                                        {Math.round(streamStats.bitrate / 1000)}K
                                    </div>
                                </div>
                            )}

                            {streamStats.latency !== undefined && (
                                <div className="bg-slate-800/50 rounded-xl p-3">
                                    <div className="text-white/70 text-xs mb-1">Latency</div>
                                    <div className={`font-bold text-lg flex items-center gap-2 ${getLatencyColor(streamStats.latency)}`}>
                                        <Wifi className="w-4 h-4" />
                                        {streamStats.latency}ms
                                    </div>
                                </div>
                            )}

                            <div className="bg-slate-800/50 rounded-xl p-3">
                                <div className="text-white/70 text-xs mb-1">Status</div>
                                <div className="text-green-400 font-bold text-lg">
                                    {videoReady ? "📺 Playing" : "⏳ Loading"}
                                </div>
                            </div>

                            <div className="bg-slate-800/50 rounded-xl p-3">
                                <div className="text-white/70 text-xs mb-1">Quality</div>
                                <div className={`font-bold text-lg ${streamStats.fps && streamStats.fps >= 30 ? 'text-green-400' :
                                    streamStats.fps && streamStats.fps >= 20 ? 'text-yellow-400' : 'text-red-400'
                                    }`}>
                                    {streamStats.fps && streamStats.fps >= 30 ? "🟢 Excellent" :
                                        streamStats.fps && streamStats.fps >= 20 ? "🟡 Good" : "🔴 Poor"}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Quality Indicator Badge */}
            <motion.div
                className="absolute bottom-6 right-6"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
            >
                <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl backdrop-blur-xl border shadow-xl ${streamStats?.fps && streamStats.fps >= 30
                    ? 'bg-green-900/70 border-green-500/50 text-green-400'
                    : streamStats?.fps && streamStats.fps >= 20
                        ? 'bg-yellow-900/70 border-yellow-500/50 text-yellow-400'
                        : 'bg-red-900/70 border-red-500/50 text-red-400'
                    }`}>
                    <Zap className="w-5 h-5" />
                    <span className="font-bold text-lg">
                        {streamStats?.fps && streamStats.fps >= 30 ? 'HD' :
                            streamStats?.fps && streamStats.fps >= 20 ? 'SD' : 'LOW'}
                    </span>
                    {streamStats?.fps && (
                        <span className="text-sm opacity-80">
                            {streamStats.fps} FPS
                        </span>
                    )}
                </div>
            </motion.div>

            {/* Loading Overlay */}
            {!videoReady && (
                <motion.div
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <div className="text-center">
                        <motion.div
                            className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full mx-auto mb-4"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        />
                        <div className="text-white text-xl font-medium">Loading stream...</div>
                        <div className="text-white/60 text-sm mt-2">Establishing connection</div>
                    </div>
                </motion.div>
            )}

            {/* Subtle border glow effect */}
            <div className="absolute inset-0 rounded-3xl pointer-events-none">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse" />
            </div>
        </motion.div>
    );
};

export default VideoStream;