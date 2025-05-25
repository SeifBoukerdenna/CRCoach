import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Brain,
    ChevronUp,
    Wifi,
    WifiOff,
    Signal,
    Settings,
    RefreshCw,
    Target,
    Eye,
    Filter
} from 'lucide-react';

// Import all the decoupled components
import DetectionCard from './inference/DetectionCard';
import DetectionFilters from './inference/DetectionFilters';
import PerformanceDashboard from './inference/PerformanceDashboard';

import DetectionSummary from './inference/DetectionSummary';
import PerformanceInsights from './inference/PerformanceInsights';
import OfflineState from './inference/OfflineState';
import type { Detection, InferenceData, InferenceStats } from '../types';
import AnnotatedFrameViewer from './inference/AnnotatedFrameViewer';

interface ExtendedInferenceStats extends InferenceStats {
    connectionAttempts?: number;
    isWebSocketConnected?: boolean;
    frameCount?: number;
    inferenceFPS?: number;
    lastInferenceTime?: number;
    networkLatency?: number;
    modelLoadTime?: number;
    totalFramesProcessed?: number;
}

interface InferencePanelProps {
    inferenceData: InferenceData | null;
    isActive: boolean;
    stats: ExtendedInferenceStats;
    sessionCode?: string;
}

interface ClassFilter {
    name: string;
    enabled: boolean;
    count: number;
    confidence: number;
}

const InferencePanel: React.FC<InferencePanelProps> = ({
    inferenceData,
    isActive,
    stats,
    sessionCode = '0000'
}) => {
    // Panel State
    const [isExpanded, setIsExpanded] = useState(true);
    const [showAnnotatedFrame, setShowAnnotatedFrame] = useState(false);
    const [showAdvancedStats, setShowAdvancedStats] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(true);

    // Detection Management
    const [selectedDetection, setSelectedDetection] = useState<Detection | null>(null);
    const [detectionFilters, setDetectionFilters] = useState<ClassFilter[]>([]);
    const [confidenceThreshold, setConfidenceThreshold] = useState(0.5);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'confidence' | 'size' | 'class'>('confidence');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    // Performance Tracking
    const [performanceHistory, setPerformanceHistory] = useState<{
        timestamps: number[];
        inferenceTimes: number[];
        detectionCounts: number[];
        fps: number[];
    }>({
        timestamps: [],
        inferenceTimes: [],
        detectionCounts: [],
        fps: []
    });

    const lastUpdateRef = useRef<number>(Date.now());
    const performanceIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Update tracking
    useEffect(() => {
        if (inferenceData) {
            lastUpdateRef.current = Date.now();

            // Update performance history
            setPerformanceHistory(prev => {
                const now = Date.now();
                const newTimestamps = [...prev.timestamps, now];
                const newInferenceTimes = [...prev.inferenceTimes, inferenceData.inference_time];
                const newDetectionCounts = [...prev.detectionCounts, inferenceData.detections.length];
                const newFps = [...prev.fps, stats.inferenceFPS || 0];

                // Keep only last 100 data points
                const maxPoints = 100;
                return {
                    timestamps: newTimestamps.slice(-maxPoints),
                    inferenceTimes: newInferenceTimes.slice(-maxPoints),
                    detectionCounts: newDetectionCounts.slice(-maxPoints),
                    fps: newFps.slice(-maxPoints)
                };
            });
        }
    }, [inferenceData, stats.inferenceFPS]);

    // Initialize class filters when detections change
    useEffect(() => {
        if (inferenceData?.detections) {
            const classMap = new Map<string, { count: number; totalConfidence: number }>();

            inferenceData.detections.forEach(detection => {
                const existing = classMap.get(detection.class) || { count: 0, totalConfidence: 0 };
                classMap.set(detection.class, {
                    count: existing.count + 1,
                    totalConfidence: existing.totalConfidence + detection.confidence
                });
            });

            const newFilters: ClassFilter[] = Array.from(classMap.entries()).map(([name, data]) => ({
                name,
                enabled: true,
                count: data.count,
                confidence: data.totalConfidence / data.count
            }));

            setDetectionFilters(newFilters);
        }
    }, [inferenceData]);

    // Performance monitoring
    useEffect(() => {
        if (isActive && autoRefresh) {
            performanceIntervalRef.current = setInterval(() => {
                setPerformanceHistory(prev => ({ ...prev }));
            }, 1000);

            return () => {
                if (performanceIntervalRef.current) {
                    clearInterval(performanceIntervalRef.current);
                }
            };
        }
    }, [isActive, autoRefresh]);

    // Utility functions
    const getConnectionStatusColor = useCallback(() => {
        if (!isActive) return 'text-gray-400';
        if (stats.isWebSocketConnected) return 'text-green-400';
        return 'text-yellow-400';
    }, [isActive, stats.isWebSocketConnected]);

    const getConnectionStatusText = useCallback(() => {
        if (!isActive) return 'Offline';
        if (stats.isWebSocketConnected) return 'WebSocket';
        return 'HTTP Polling';
    }, [isActive, stats.isWebSocketConnected]);

    const formatTimeAgo = useCallback((timestamp: number) => {
        const secondsAgo = Math.round((Date.now() - timestamp) / 1000);
        if (secondsAgo < 60) return `${secondsAgo}s ago`;
        if (secondsAgo < 3600) return `${Math.round(secondsAgo / 60)}m ago`;
        return `${Math.round(secondsAgo / 3600)}h ago`;
    }, []);

    // Action handlers
    const downloadAnnotatedFrame = useCallback(() => {
        if (!inferenceData?.annotated_frame) return;

        const link = document.createElement('a');
        link.href = `data:image/jpeg;base64,${inferenceData.annotated_frame}`;
        link.download = `clash_royale_analysis_${sessionCode}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [inferenceData?.annotated_frame, sessionCode]);

    const openAnnotatedFrameFullscreen = useCallback(() => {
        if (!inferenceData?.annotated_frame) return;

        const newWindow = window.open('', '_blank', 'width=1200,height=800');
        if (newWindow) {
            newWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Clash Royale AI Analysis - Session ${sessionCode}</title>
            <style>
              body {
                margin: 0;
                background: #0b162d;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                font-family: Arial, sans-serif;
              }
              .container {
                max-width: 95vw;
                max-height: 95vh;
                position: relative;
              }
              img {
                max-width: 100%;
                max-height: 100%;
                object-fit: contain;
                border: 3px solid #ffd700;
                border-radius: 15px;
              }
              .info {
                position: absolute;
                top: 10px;
                left: 10px;
                background: rgba(0,0,0,0.8);
                color: white;
                padding: 10px;
                border-radius: 8px;
                font-size: 14px;
              }
              .close {
                position: absolute;
                top: 10px;
                right: 10px;
                background: #ff4444;
                color: white;
                border: none;
                padding: 8px 12px;
                border-radius: 6px;
                cursor: pointer;
                font-weight: bold;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="info">
                Session: ${sessionCode} | ${inferenceData.detections.length} objects detected | ${Math.round(inferenceData.inference_time)}ms processing
              </div>
              <button class="close" onclick="window.close()">Close</button>
              <img src="data:image/jpeg;base64,${inferenceData.annotated_frame}" alt="AI Analysis" />
            </div>
          </body>
        </html>
      `);
        }
    }, [inferenceData, sessionCode]);

    const toggleClassFilter = useCallback((className: string) => {
        setDetectionFilters(prev =>
            prev.map(filter =>
                filter.name === className
                    ? { ...filter, enabled: !filter.enabled }
                    : filter
            )
        );
    }, []);

    const resetFilters = useCallback(() => {
        setDetectionFilters(prev => prev.map(filter => ({ ...filter, enabled: true })));
        setConfidenceThreshold(0.5);
        setSearchQuery('');
    }, []);

    // Filter and sort detections
    const filteredDetections = React.useMemo(() => {
        if (!inferenceData?.detections) return [];

        const filtered = inferenceData.detections.filter(detection => {
            if (detection.confidence < confidenceThreshold) return false;

            const classFilter = detectionFilters.find(f => f.name === detection.class);
            if (classFilter && !classFilter.enabled) return false;

            if (searchQuery && !detection.class.toLowerCase().includes(searchQuery.toLowerCase())) {
                return false;
            }

            return true;
        });

        filtered.sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case 'confidence':
                    comparison = a.confidence - b.confidence;
                    break;
                case 'size':
                    comparison = (a.bbox.width * a.bbox.height) - (b.bbox.width * b.bbox.height);
                    break;
                case 'class':
                    comparison = a.class.localeCompare(b.class);
                    break;
            }
            return sortOrder === 'desc' ? -comparison : comparison;
        });

        return filtered;
    }, [inferenceData?.detections, confidenceThreshold, detectionFilters, searchQuery, sortBy, sortOrder]);

    // Calculate performance metrics
    const performanceMetrics = React.useMemo(() => {
        if (performanceHistory.timestamps.length === 0) {
            return {
                avgInferenceTime: 0,
                maxInferenceTime: 0,
                minInferenceTime: 0,
                avgDetections: 0,
                totalFrames: 0,
                uptime: 0
            };
        }

        const times = performanceHistory.inferenceTimes;
        const detections = performanceHistory.detectionCounts;
        const timestamps = performanceHistory.timestamps;

        return {
            avgInferenceTime: times.reduce((a, b) => a + b, 0) / times.length,
            maxInferenceTime: Math.max(...times),
            minInferenceTime: Math.min(...times),
            avgDetections: detections.reduce((a, b) => a + b, 0) / detections.length,
            totalFrames: times.length,
            uptime: timestamps.length > 0 ? (Date.now() - timestamps[0]) / 1000 : 0
        };
    }, [performanceHistory]);

    return (
        <motion.div
            className="bg-gradient-to-br from-cr-navy/95 to-cr-purple/25 backdrop-blur-xl border-4 border-cr-purple rounded-3xl overflow-hidden shadow-2xl"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            {/* Header */}
            <div
                className="p-6 border-b border-cr-purple/30 cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Brain className="w-8 h-8 text-cr-purple" />
                            {isActive && (
                                <motion.div
                                    className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full"
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                />
                            )}
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-cr-purple flex items-center gap-3">
                                AI Analysis
                                <div className="flex items-center gap-1">
                                    <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-500'}`} />
                                    {stats.isWebSocketConnected ? (
                                        <Wifi className="w-4 h-4 text-green-400" />
                                    ) : isActive ? (
                                        <Signal className="w-4 h-4 text-yellow-400" />
                                    ) : (
                                        <WifiOff className="w-4 h-4 text-gray-400" />
                                    )}
                                </div>
                            </h3>
                            <div className="flex items-center gap-4 text-sm">
                                <span className={`flex items-center gap-1 ${getConnectionStatusColor()}`}>
                                    <div className="w-1.5 h-1.5 rounded-full bg-current" />
                                    {getConnectionStatusText()}
                                </span>
                                {isActive && inferenceData && (
                                    <>
                                        <span className="text-white/60">•</span>
                                        <span className="text-white/70">
                                            {formatTimeAgo(lastUpdateRef.current)}
                                        </span>
                                        <span className="text-white/60">•</span>
                                        <span className="text-cr-gold font-medium">
                                            Session {sessionCode}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        {/* Quick Stats */}
                        {isActive && inferenceData && (
                            <div className="flex gap-6">
                                <motion.div
                                    className="text-center"
                                    whileHover={{ scale: 1.05 }}
                                >
                                    <div className="text-3xl font-bold text-cr-gold">
                                        {filteredDetections.length}
                                    </div>
                                    <div className="text-xs text-white/60 uppercase tracking-wider">
                                        Objects
                                    </div>
                                </motion.div>
                                <motion.div
                                    className="text-center"
                                    whileHover={{ scale: 1.05 }}
                                >
                                    <div className="text-3xl font-bold text-green-400">
                                        {Math.round(inferenceData.inference_time)}
                                    </div>
                                    <div className="text-xs text-white/60 uppercase tracking-wider">ms</div>
                                </motion.div>
                                {stats.inferenceFPS && (
                                    <motion.div
                                        className="text-center"
                                        whileHover={{ scale: 1.05 }}
                                    >
                                        <div className="text-3xl font-bold text-cr-purple">
                                            {stats.inferenceFPS.toFixed(1)}
                                        </div>
                                        <div className="text-xs text-white/60 uppercase tracking-wider">FPS</div>
                                    </motion.div>
                                )}
                                <motion.div
                                    className="text-center"
                                    whileHover={{ scale: 1.05 }}
                                >
                                    <div className="text-3xl font-bold text-white">
                                        {Math.round(stats.accuracy || 0)}
                                    </div>
                                    <div className="text-xs text-white/60 uppercase tracking-wider">%</div>
                                </motion.div>
                            </div>
                        )}

                        {/* Controls */}
                        <div className="flex items-center gap-2">
                            {isActive && (
                                <motion.button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setAutoRefresh(!autoRefresh);
                                    }}
                                    className={`p-2 rounded-lg border transition-colors ${autoRefresh
                                        ? 'bg-green-500/20 border-green-500/40 text-green-400'
                                        : 'bg-white/10 border-white/20 text-white/70'
                                        }`}
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    title={autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
                                >
                                    <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                                </motion.button>
                            )}

                            <motion.button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowAdvancedStats(!showAdvancedStats);
                                }}
                                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 transition-colors"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                title="Advanced Statistics"
                            >
                                <Settings className="w-5 h-5 text-white/70" />
                            </motion.button>

                            <motion.div
                                animate={{ rotate: isExpanded ? 180 : 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <ChevronUp className="w-6 h-6 text-white/70" />
                            </motion.div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Expandable Content */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        {isActive && inferenceData ? (
                            <div className="p-6 space-y-6">
                                {/* Performance Dashboard */}
                                <PerformanceDashboard
                                    stats={stats}
                                    currentInferenceTime={inferenceData.inference_time}
                                    currentDetectionCount={inferenceData.detections.length}
                                    showAdvanced={showAdvancedStats}
                                    performanceMetrics={performanceMetrics}
                                />

                                {/* Detection Filters */}
                                {inferenceData.detections.length > 0 && (
                                    <DetectionFilters
                                        filters={detectionFilters}
                                        onToggleFilter={toggleClassFilter}
                                        onResetFilters={resetFilters}
                                        searchQuery={searchQuery}
                                        onSearchChange={setSearchQuery}
                                        confidenceThreshold={confidenceThreshold}
                                        onConfidenceChange={setConfidenceThreshold}
                                        sortBy={sortBy}
                                        onSortByChange={setSortBy}
                                        sortOrder={sortOrder}
                                        onSortOrderChange={setSortOrder}
                                    />
                                )}

                                {/* Current Detections */}
                                {filteredDetections.length > 0 ? (
                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="text-xl font-bold text-white flex items-center gap-2">
                                                <Target className="w-6 h-6 text-cr-gold" />
                                                Live Detections ({filteredDetections.length}/{inferenceData.detections.length})
                                            </h4>

                                            <div className="flex items-center gap-4">
                                                <span className="text-sm text-white/60">
                                                    Image: {inferenceData.image_shape?.width || 'Unknown'}×{inferenceData.image_shape?.height || 'Unknown'}
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                                    <span className="text-xs text-green-400">Real-time</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid gap-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                                            {filteredDetections.map((detection, index) => (
                                                <DetectionCard
                                                    key={`${detection.class}-${detection.bbox.x1}-${detection.bbox.y1}-${index}`}
                                                    detection={detection}
                                                    index={index}
                                                    isSelected={selectedDetection === detection}
                                                    onSelect={setSelectedDetection}
                                                    imageShape={inferenceData.image_shape}
                                                />
                                            ))}
                                        </div>

                                        {/* Detection Summary */}
                                        <DetectionSummary detections={filteredDetections} />
                                    </div>
                                ) : inferenceData.detections.length > 0 ? (
                                    <motion.div
                                        className="text-center py-8"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                    >
                                        <Filter className="w-16 h-16 text-white/30 mx-auto mb-4" />
                                        <h4 className="text-xl font-bold text-white/60 mb-2">No Objects Match Filters</h4>
                                        <p className="text-white/40 text-lg">
                                            {inferenceData.detections.length} objects detected but filtered out
                                        </p>
                                        <motion.button
                                            onClick={resetFilters}
                                            className="mt-4 px-4 py-2 bg-cr-purple rounded-lg text-white hover:bg-cr-purple/80 transition-colors"
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            Reset Filters
                                        </motion.button>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        className="text-center py-12"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                    >
                                        <Eye className="w-20 h-20 text-white/20 mx-auto mb-6" />
                                        <h4 className="text-xl font-bold text-white/60 mb-2">No Objects Detected</h4>
                                        <p className="text-white/40 text-lg">AI is actively scanning for game elements</p>
                                        <div className="mt-6 flex items-center justify-center gap-6 text-sm text-white/30">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                                <span>Inference Active</span>
                                            </div>
                                            <span>•</span>
                                            <span>Confidence Threshold: {Math.round(confidenceThreshold * 100)}%</span>
                                            <span>•</span>
                                            <span>Processing: {Math.round(inferenceData.inference_time)}ms</span>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Annotated Frame Section */}
                                {inferenceData.annotated_frame && (
                                    <AnnotatedFrameViewer
                                        annotatedFrame={inferenceData.annotated_frame}
                                        detectionCount={inferenceData.detections.length}
                                        inferenceTime={inferenceData.inference_time}
                                        sessionCode={sessionCode}
                                        isVisible={showAnnotatedFrame}
                                        onToggleVisibility={() => setShowAnnotatedFrame(!showAnnotatedFrame)}
                                        onDownload={downloadAnnotatedFrame}
                                        onFullscreen={openAnnotatedFrameFullscreen}
                                    />
                                )}

                                {/* Performance Insights */}
                                <PerformanceInsights
                                    inferenceTime={inferenceData.inference_time}
                                    inferenceFPS={stats.inferenceFPS || 0}
                                    accuracy={stats.accuracy || 0}
                                    isWebSocketConnected={stats.isWebSocketConnected || false}
                                    connectionAttempts={stats.connectionAttempts || 0}
                                    uptime={performanceMetrics.uptime}
                                    totalFrames={performanceMetrics.totalFrames}
                                    minInferenceTime={performanceMetrics.minInferenceTime}
                                    maxInferenceTime={performanceMetrics.maxInferenceTime}
                                />
                            </div>
                        ) : (
                            <OfflineState
                                sessionCode={sessionCode}
                                connectionStatus={getConnectionStatusText()}
                            />
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Custom Styles */}
            <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(177, 84, 255, 0.5);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(177, 84, 255, 0.7);
        }
      `}</style>
        </motion.div>
    );
};

export default InferencePanel;