// royal_trainer_client/src/components/VideoStream.tsx - Enhanced for new layout

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Maximize2,
    Minimize2,
    Monitor,
    Volume2,
    VolumeX,
    Signal,
    Wifi,
    Zap
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

    const [showStats, setShowStats] = useState(false);
    const [videoReady, setVideoReady] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [showControls, setShowControls] = useState(true);
    const [isHovering, setIsHovering] = useState(false);
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
        };

        const handlePause = () => {
        };

        const handleError = (e: Event) => {
            setVideoReady(false);
            console.error('Video error:', e);
        };

        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('play', handlePlay);
        video.addEventListener('pause', handlePause);
        video.addEventListener('error', handleError);

        return () => {
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('pause', handlePause);
            video.removeEventListener('error', handleError);
        };
    }, [videoRef]);

    // Auto-hide controls
    useEffect(() => {
        if (!isHovering && videoReady) {
            const timer = setTimeout(() => setShowControls(false), 3000);
            return () => clearTimeout(timer);
        } else {
            setShowControls(true);
        }
    }, [isHovering, videoReady]);

    // Connection quality monitoring
    useEffect(() => {
        if (streamStats?.fps) {
            const fps = streamStats.fps;
            if (fps >= 25) setConnectionQuality('excellent');
            else if (fps >= 15) setConnectionQuality('good');
            else if (fps >= 8) setConnectionQuality('fair');
            else setConnectionQuality('poor');
        }
    }, [streamStats?.fps]);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            videoRef.current?.requestFullscreen?.();
        } else {
            document.exitFullscreen?.();
        }
    };

    const toggleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !videoRef.current.muted;
            setIsMuted(videoRef.current.muted);
        }
    };

    const getQualityColor = () => {
        switch (connectionQuality) {
            case 'excellent': return 'text-green-400';
            case 'good': return 'text-blue-400';
            case 'fair': return 'text-yellow-400';
            case 'poor': return 'text-red-400';
            default: return 'text-gray-400';
        }
    };

    const getQualityIcon = () => {
        switch (connectionQuality) {
            case 'excellent': return <Wifi className="w-4 h-4" />;
            case 'good': return <Signal className="w-4 h-4" />;
            case 'fair': return <Zap className="w-4 h-4" />;
            case 'poor': return <Signal className="w-4 h-4" />;
            default: return <Signal className="w-4 h-4" />;
        }
    };

    return (
        <motion.div
            className={`relative group bg-black rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-700/50 hover:border-purple-500/30 transition-all duration-300 ${className}`}
            style={{ height: '100%' }}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
        >
            {/* Main Video Element */}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={isMuted}
                onClick={toggleFullscreen}
                className="w-full h-full object-contain cursor-pointer"
                style={{ backgroundColor: '#000' }}
            />

            {/* Top Control Bar */}
            <AnimatePresence>
                {(showControls || isHovering) && videoReady && (
                    <motion.div
                        className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 via-black/40 to-transparent p-4 z-10"
                        initial={{ y: -100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -100, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div className="flex items-center justify-between">
                            {/* Left side - Session info */}
                            <div className="flex items-center gap-3">
                                <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse">
                                    LIVE
                                </div>
                                <div className="text-white font-mono text-lg">
                                    {sessionCode}
                                </div>
                                <div className={`flex items-center gap-1 ${getQualityColor()}`}>
                                    {getQualityIcon()}
                                    <span className="text-sm font-medium capitalize">
                                        {connectionQuality}
                                    </span>
                                </div>
                            </div>

                            {/* Right side - Controls */}
                            <div className="flex items-center gap-2">
                                <motion.button
                                    onClick={toggleMute}
                                    className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                                </motion.button>

                                <motion.button
                                    onClick={() => setShowStats(!showStats)}
                                    className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    <Monitor className="w-5 h-5" />
                                </motion.button>

                                {onToggleSize && (
                                    <motion.button
                                        onClick={onToggleSize}
                                        className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                    >
                                        {isMinimized ? <Maximize2 className="w-5 h-5" /> : <Minimize2 className="w-5 h-5" />}
                                    </motion.button>
                                )}

                                <motion.button
                                    onClick={toggleFullscreen}
                                    className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    <Maximize2 className="w-5 h-5" />
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Stream Stats Overlay */}
            <AnimatePresence>
                {showStats && videoReady && (
                    <motion.div
                        className="absolute top-20 right-4 bg-black/90 backdrop-blur-md rounded-xl p-4 text-white z-20 min-w-64"
                        initial={{ x: 100, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 100, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <h4 className="font-bold mb-3 flex items-center gap-2">
                            <Monitor className="w-4 h-4" />
                            Stream Statistics
                        </h4>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-white/70">FPS:</span>
                                <span className="font-mono">{streamStats?.fps || 0}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-white/70">Resolution:</span>
                                <span className="font-mono">{streamStats?.resolution || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-white/70">Quality:</span>
                                <span className={`font-medium capitalize ${getQualityColor()}`}>
                                    {connectionQuality}
                                </span>
                            </div>
                            {videoRef.current && (
                                <>
                                    <div className="flex justify-between">
                                        <span className="text-white/70">Video Size:</span>
                                        <span className="font-mono">
                                            {videoRef.current.videoWidth}×{videoRef.current.videoHeight}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-white/70">Buffered:</span>
                                        <span className="font-mono">
                                            {videoRef.current.buffered.length > 0
                                                ? `${Math.round(videoRef.current.buffered.end(0))}s`
                                                : '0s'
                                            }
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Loading Overlay */}
            {!videoReady && (
                <motion.div
                    className="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-blue-900/95 to-purple-900/95 backdrop-blur-sm flex items-center justify-center z-20"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <div className="text-center">
                        <motion.div
                            className="w-20 h-20 border-4 border-purple-500/20 border-t-purple-500 rounded-full mx-auto mb-6"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        />
                        <div className="text-white text-2xl font-bold mb-3">Connecting to Stream</div>
                        <div className="text-white/60 text-lg mb-6">Session {sessionCode}</div>
                        <div className="flex items-center justify-center gap-2">
                            <motion.div
                                className="w-3 h-3 bg-purple-500 rounded-full"
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                            />
                            <motion.div
                                className="w-3 h-3 bg-blue-500 rounded-full"
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                            />
                            <motion.div
                                className="w-3 h-3 bg-green-500 rounded-full"
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                            />
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Bottom gradient overlay for better control visibility */}
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none z-5" />

            {/* Corner accent */}
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-purple-500/20 to-transparent rounded-bl-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-blue-500/20 to-transparent rounded-tr-2xl pointer-events-none" />
        </motion.div>
    );
};

export default VideoStream;