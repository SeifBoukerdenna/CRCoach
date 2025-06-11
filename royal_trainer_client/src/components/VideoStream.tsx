// royal_trainer_client/src/components/VideoStream.tsx - Complete optimized component

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
    Wifi,
    Play,
    Pause,
    RotateCcw,
    Download,
    Share,
    Info
} from 'lucide-react';
import { useVideoStream } from '../hooks/useVideoStream';
import type { StreamStats } from '../types';

interface VideoStreamProps {
    videoRef: React.RefObject<HTMLVideoElement>;
    sessionCode: string;
    streamStats: StreamStats | null;
    remoteStream?: MediaStream | null | undefined;
    isMinimized?: boolean;
    onToggleSize?: () => void;
    className?: string;
}

const VideoStream: React.FC<VideoStreamProps> = ({
    videoRef,
    sessionCode,
    streamStats,
    remoteStream,
    isMinimized = false,
    onToggleSize,
    className = ''
}) => {
    // Use the video stream hook to handle stream attachment
    useVideoStream(videoRef, remoteStream);

    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showStats, setShowStats] = useState(false);
    const [videoReady, setVideoReady] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [showControls, setShowControls] = useState(true);
    const [isHovering, setIsHovering] = useState(false);
    const [showAdvancedStats, setShowAdvancedStats] = useState(false);
    const [isPlaying, setIsPlaying] = useState(true);
    const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'fair' | 'poor'>('good');

    // Video state tracking
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleLoadedMetadata = () => {
            setVideoReady(true);
            console.log(`Video loaded: ${video.videoWidth}x${video.videoHeight}`);
        };

        const handlePlay = () => {
            setVideoReady(true);
            setIsPlaying(true);
        };

        const handlePause = () => {
            setIsPlaying(false);
        };

        const handleError = (e: Event) => {
            setVideoReady(false);
            console.error('Video error:', e);
        };

        const handleWaiting = () => {
            console.log('Video buffering...');
        };

        const handleCanPlay = () => {
            setVideoReady(true);
        };

        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('play', handlePlay);
        video.addEventListener('pause', handlePause);
        video.addEventListener('error', handleError);
        video.addEventListener('waiting', handleWaiting);
        video.addEventListener('canplay', handleCanPlay);

        return () => {
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('pause', handlePause);
            video.removeEventListener('error', handleError);
            video.removeEventListener('waiting', handleWaiting);
            video.removeEventListener('canplay', handleCanPlay);
        };
    }, [videoRef]);

    // Fullscreen handling
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Connection quality assessment
    useEffect(() => {
        if (!streamStats?.fps) {
            setConnectionQuality('poor');
        } else if (streamStats.fps >= 30) {
            setConnectionQuality('excellent');
        } else if (streamStats.fps >= 20) {
            setConnectionQuality('good');
        } else if (streamStats.fps >= 10) {
            setConnectionQuality('fair');
        } else {
            setConnectionQuality('poor');
        }
    }, [streamStats]);

    // Auto-hide controls after inactivity
    useEffect(() => {
        if (isMinimized) {
            setShowControls(true);
            return;
        }

        let timeout: NodeJS.Timeout;

        const resetTimeout = () => {
            setShowControls(true);
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                if (!isHovering) setShowControls(false);
            }, 3000);
        };

        const handleMouseMove = () => resetTimeout();
        const handleMouseLeave = () => {
            clearTimeout(timeout);
            setShowControls(false);
        };
        const handleMouseEnter = () => resetTimeout();

        if (videoRef.current) {
            videoRef.current.addEventListener('mousemove', handleMouseMove);
            videoRef.current.addEventListener('mouseleave', handleMouseLeave);
            videoRef.current.addEventListener('mouseenter', handleMouseEnter);
        }

        resetTimeout(); // Initialize timeout

        return () => {
            clearTimeout(timeout);
            if (videoRef.current) {
                videoRef.current.removeEventListener('mousemove', handleMouseMove);
                videoRef.current.removeEventListener('mouseleave', handleMouseLeave);
                videoRef.current.removeEventListener('mouseenter', handleMouseEnter);
            }
        };
    }, [videoRef, isMinimized, isHovering]);

    // Action handlers
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

    const togglePlayPause = () => {
        if (videoRef.current) {
            if (videoRef.current.paused) {
                videoRef.current.play();
            } else {
                videoRef.current.pause();
            }
        }
    };

    const refreshStream = () => {
        if (videoRef.current) {
            videoRef.current.load();
        }
    };

    const downloadFrame = () => {
        if (!videoRef.current) return;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        ctx.drawImage(videoRef.current, 0, 0);

        const link = document.createElement('a');
        link.download = `clash_royale_frame_${sessionCode}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
        link.href = canvas.toDataURL();
        link.click();
    };

    const shareStream = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Royal Trainer AI - Live Clash Royale Analysis',
                    text: `Watching AI-powered Clash Royale analysis for session ${sessionCode}`,
                    url: window.location.href
                });
            } catch (error) {
                console.log('Share cancelled');
            }
        } else {
            // Fallback: copy to clipboard
            await navigator.clipboard.writeText(window.location.href);
            alert('Stream link copied to clipboard!');
        }
    };

    // Utility functions
    const getQualityColor = (fps: number) => {
        if (fps >= 30) return 'text-green-400';
        if (fps >= 20) return 'text-yellow-400';
        if (fps >= 10) return 'text-orange-400';
        return 'text-red-400';
    };

    const getLatencyColor = (latency: number) => {
        if (latency < 50) return 'text-green-400';
        if (latency < 100) return 'text-yellow-400';
        if (latency < 200) return 'text-orange-400';
        return 'text-red-400';
    };

    const getSignalStrength = () => {
        if (!streamStats?.fps) return 0;
        if (streamStats.fps >= 30) return 3;
        if (streamStats.fps >= 20) return 2;
        if (streamStats.fps >= 10) return 1;
        return 0;
    };

    const getConnectionQualityText = () => {
        switch (connectionQuality) {
            case 'excellent': return '🟢 Excellent';
            case 'good': return '🟡 Good';
            case 'fair': return '🟠 Fair';
            case 'poor': return '🔴 Poor';
        }
    };

    return (
        <motion.div
            className={`relative bg-gradient-to-br from-black via-slate-900 to-black rounded-2xl overflow-hidden border-2 border-slate-700/50 shadow-2xl w-full h-full ${className}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
        >
            {/* Video Element */}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={isMuted}
                controls={false}
                className="w-full h-full object-contain bg-black cursor-pointer"
                onClick={isMinimized ? undefined : toggleFullscreen}
                onLoadedMetadata={() => console.log("Video metadata loaded successfully")}
                onError={() => console.error("Failed to load video")}
            />

            {/* Gradient overlays for better text visibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/20 pointer-events-none" />

            {/* Top overlay - Session info and controls */}
            <AnimatePresence>
                {(showControls || isHovering || isMinimized) && (
                    <motion.div
                        className="absolute top-3 left-3 right-3 flex justify-between items-start z-10"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        {/* Session Info */}
                        <div className="bg-black/80 backdrop-blur-xl rounded-xl px-4 py-2 border border-white/20 shadow-xl max-w-xs">
                            <div className="flex items-center gap-2 mb-1">
                                <motion.div
                                    className="w-2 h-2 bg-red-500 rounded-full"
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                />
                                <span className="text-white font-bold text-sm tracking-wider">LIVE</span>
                                <div className="flex items-center gap-1">
                                    {[...Array(3)].map((_, i) => (
                                        <div
                                            key={i}
                                            className={`w-1 h-2 rounded-full transition-all duration-300 ${i < getSignalStrength() ? 'bg-green-400' : 'bg-gray-600'
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

                        {/* Control Buttons */}
                        <div className="flex gap-2">
                            {/* Audio Toggle */}
                            <motion.button
                                onClick={toggleMute}
                                className="bg-black/80 backdrop-blur-xl border border-white/20 rounded-lg p-2 text-white hover:bg-black/90 transition-all duration-200 shadow-lg"
                                whileHover={{ scale: 1.1, y: -2 }}
                                whileTap={{ scale: 0.9 }}
                                title={isMuted ? "Unmute" : "Mute"}
                            >
                                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                            </motion.button>

                            {/* Play/Pause Toggle */}
                            <motion.button
                                onClick={togglePlayPause}
                                className="bg-black/80 backdrop-blur-xl border border-white/20 rounded-lg p-2 text-white hover:bg-black/90 transition-all duration-200 shadow-lg"
                                whileHover={{ scale: 1.1, y: -2 }}
                                whileTap={{ scale: 0.9 }}
                                title={isPlaying ? "Pause" : "Play"}
                            >
                                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            </motion.button>

                            {/* Stats Toggle */}
                            <motion.button
                                onClick={() => setShowStats(!showStats)}
                                className={`backdrop-blur-xl border rounded-lg p-2 text-white transition-all duration-200 shadow-lg ${showStats
                                    ? 'bg-blue-600/80 border-blue-400/50'
                                    : 'bg-black/80 border-white/20 hover:bg-black/90'
                                    }`}
                                whileHover={{ scale: 1.1, y: -2 }}
                                whileTap={{ scale: 0.9 }}
                                title="Toggle Statistics"
                            >
                                <Settings className="w-4 h-4" />
                            </motion.button>

                            {/* Download Frame */}
                            <motion.button
                                onClick={downloadFrame}
                                className="bg-black/80 backdrop-blur-xl border border-white/20 rounded-lg p-2 text-white hover:bg-black/90 transition-all duration-200 shadow-lg"
                                whileHover={{ scale: 1.1, y: -2 }}
                                whileTap={{ scale: 0.9 }}
                                title="Download Frame"
                            >
                                <Download className="w-4 h-4" />
                            </motion.button>

                            {/* Share Stream */}
                            <motion.button
                                onClick={shareStream}
                                className="bg-black/80 backdrop-blur-xl border border-white/20 rounded-lg p-2 text-white hover:bg-black/90 transition-all duration-200 shadow-lg"
                                whileHover={{ scale: 1.1, y: -2 }}
                                whileTap={{ scale: 0.9 }}
                                title="Share Stream"
                            >
                                <Share className="w-4 h-4" />
                            </motion.button>

                            {/* Size Toggle (if callback provided) */}
                            {onToggleSize && (
                                <motion.button
                                    onClick={onToggleSize}
                                    className="bg-black/80 backdrop-blur-xl border border-white/20 rounded-lg p-2 text-white hover:bg-black/90 transition-all duration-200 shadow-lg"
                                    whileHover={{ scale: 1.1, y: -2 }}
                                    whileTap={{ scale: 0.9 }}
                                    title={isMinimized ? "Expand Video" : "Minimize Video"}
                                >
                                    {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                                </motion.button>
                            )}

                            {/* Fullscreen Toggle */}
                            {!isMinimized && (
                                <motion.button
                                    onClick={toggleFullscreen}
                                    className="bg-black/80 backdrop-blur-xl border border-white/20 rounded-lg p-2 text-white hover:bg-black/90 transition-all duration-200 shadow-lg"
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
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Bottom Quality Indicator - Always visible */}
            <motion.div
                className="absolute bottom-3 right-3 z-10"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
            >
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl backdrop-blur-xl border shadow-xl transition-all ${connectionQuality === 'excellent'
                    ? 'bg-green-900/80 border-green-500/50 text-green-400'
                    : connectionQuality === 'good'
                        ? 'bg-yellow-900/80 border-yellow-500/50 text-yellow-400'
                        : connectionQuality === 'fair'
                            ? 'bg-orange-900/80 border-orange-500/50 text-orange-400'
                            : 'bg-red-900/80 border-red-500/50 text-red-400'
                    }`}>
                    <Zap className="w-4 h-4" />
                    <span className="font-bold text-sm">
                        {connectionQuality === 'excellent' ? 'HD' :
                            connectionQuality === 'good' ? 'SD' :
                                connectionQuality === 'fair' ? 'LD' : 'OFF'}
                    </span>
                    {streamStats?.fps && (
                        <span className="text-xs opacity-80">
                            {streamStats.fps} FPS
                        </span>
                    )}
                </div>
            </motion.div>

            {/* Enhanced Stats Overlay */}
            <AnimatePresence>
                {showStats && streamStats && (
                    <motion.div
                        className="absolute inset-x-3 bottom-16 bg-black/95 backdrop-blur-xl rounded-xl p-4 border border-white/20 shadow-2xl z-10"
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-white font-bold text-lg flex items-center gap-2">
                                <Monitor className="w-5 h-5 text-blue-400" />
                                Stream Analytics
                            </h4>
                            <div className="flex items-center gap-2">
                                <motion.button
                                    onClick={() => setShowAdvancedStats(!showAdvancedStats)}
                                    className="text-sm text-white/70 hover:text-white transition-colors"
                                >
                                    {showAdvancedStats ? 'Basic' : 'Advanced'}
                                </motion.button>
                                <motion.button
                                    onClick={refreshStream}
                                    className="p-1 rounded bg-white/10 hover:bg-white/20 transition-colors"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    title="Refresh Stream"
                                >
                                    <RotateCcw className="w-3 h-3 text-white" />
                                </motion.button>
                            </div>
                        </div>

                        {showAdvancedStats ? (
                            /* Advanced Stats Grid */
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                {streamStats.fps !== undefined && (
                                    <div className="bg-slate-800/50 rounded-lg p-3">
                                        <div className="text-white/70 text-xs mb-1">Frame Rate</div>
                                        <div className={`font-bold text-lg flex items-center gap-2 ${getQualityColor(streamStats.fps)}`}>
                                            <Zap className="w-4 h-4" />
                                            {streamStats.fps} FPS
                                        </div>
                                    </div>
                                )}

                                {streamStats.resolution && (
                                    <div className="bg-slate-800/50 rounded-lg p-3">
                                        <div className="text-white/70 text-xs mb-1">Resolution</div>
                                        <div className="text-white font-bold text-lg flex items-center gap-2">
                                            <Camera className="w-4 h-4" />
                                            {streamStats.resolution}
                                        </div>
                                    </div>
                                )}

                                {streamStats.bitrate !== undefined && (
                                    <div className="bg-slate-800/50 rounded-lg p-3">
                                        <div className="text-white/70 text-xs mb-1">Bitrate</div>
                                        <div className="text-white font-bold text-lg flex items-center gap-2">
                                            <Signal className="w-4 h-4" />
                                            {Math.round(streamStats.bitrate / 1000)}K
                                        </div>
                                    </div>
                                )}

                                {streamStats.latency !== undefined && (
                                    <div className="bg-slate-800/50 rounded-lg p-3">
                                        <div className="text-white/70 text-xs mb-1">Latency</div>
                                        <div className={`font-bold text-lg flex items-center gap-2 ${getLatencyColor(streamStats.latency)}`}>
                                            <Wifi className="w-4 h-4" />
                                            {streamStats.latency}ms
                                        </div>
                                    </div>
                                )}

                                <div className="bg-slate-800/50 rounded-lg p-3">
                                    <div className="text-white/70 text-xs mb-1">Quality</div>
                                    <div className={`font-bold text-lg ${connectionQuality === 'excellent' ? 'text-green-400' :
                                        connectionQuality === 'good' ? 'text-yellow-400' :
                                            connectionQuality === 'fair' ? 'text-orange-400' : 'text-red-400'
                                        }`}>
                                        {getConnectionQualityText()}
                                    </div>
                                </div>

                                <div className="bg-slate-800/50 rounded-lg p-3">
                                    <div className="text-white/70 text-xs mb-1">Status</div>
                                    <div className="text-white font-bold text-lg">
                                        {videoReady ? (isPlaying ? "▶️ Playing" : "⏸️ Paused") : "⏳ Loading"}
                                    </div>
                                </div>

                                {videoRef.current && (
                                    <div className="bg-slate-800/50 rounded-lg p-3">
                                        <div className="text-white/70 text-xs mb-1">Video Size</div>
                                        <div className="text-white font-bold text-lg">
                                            {videoRef.current.videoWidth}×{videoRef.current.videoHeight}
                                        </div>
                                    </div>
                                )}

                                <div className="bg-slate-800/50 rounded-lg p-3">
                                    <div className="text-white/70 text-xs mb-1">Audio</div>
                                    <div className="text-white font-bold text-lg">
                                        {isMuted ? "🔇 Muted" : "🔊 Active"}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* Basic Stats */
                            <div className="grid grid-cols-4 gap-3 text-center text-sm">
                                {streamStats.fps !== undefined && (
                                    <div>
                                        <div className="text-white/70 text-xs mb-1">FPS</div>
                                        <div className={`font-bold text-xl ${getQualityColor(streamStats.fps)}`}>
                                            {streamStats.fps}
                                        </div>
                                    </div>
                                )}

                                {streamStats.resolution && (
                                    <div>
                                        <div className="text-white/70 text-xs mb-1">Resolution</div>
                                        <div className="text-white font-bold text-xl">
                                            {streamStats.resolution.split('x')[1]}p
                                        </div>
                                    </div>
                                )}

                                {streamStats.bitrate !== undefined && (
                                    <div>
                                        <div className="text-white/70 text-xs mb-1">Quality</div>
                                        <div className="text-white font-bold text-xl">
                                            {Math.round(streamStats.bitrate / 1000)}K
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <div className="text-white/70 text-xs mb-1">Status</div>
                                    <div className="text-white font-bold text-xl">
                                        {videoReady ? (isPlaying ? "▶️" : "⏸️") : "⏳"}
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Loading Overlay */}
            {!videoReady && (
                <motion.div
                    className="absolute inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-20"
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
                        <div className="text-white text-xl font-medium mb-2">Loading stream...</div>
                        <div className="text-white/60 text-sm">Establishing connection to session {sessionCode}</div>
                        <div className="mt-4 flex items-center justify-center gap-2">
                            <div className="w-2 h-2 bg-white/40 rounded-full animate-pulse" />
                            <div className="w-2 h-2 bg-white/40 rounded-full animate-pulse delay-75" />
                            <div className="w-2 h-2 bg-white/40 rounded-full animate-pulse delay-150" />
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Click hint for fullscreen */}
            {!isMinimized && !isFullscreen && (showControls || isHovering) && videoReady && (
                <motion.div
                    className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1 text-white/70 text-xs z-10"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <Info className="w-3 h-3 inline mr-1" />
                    Click for fullscreen
                </motion.div>
            )}

            {/* Subtle border glow effect */}
            <div className="absolute inset-0 rounded-2xl pointer-events-none">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse" />
            </div>
        </motion.div>
    );
};

export default VideoStream;