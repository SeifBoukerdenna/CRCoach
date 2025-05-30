// royal_trainer_client/src/components/InferencePanel.tsx - Enhanced for new layout

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Brain,
    ChevronUp,
    Target,
    Eye,
    Filter,
    Download,
    Maximize2,
    Camera,
    BarChart3,
} from 'lucide-react';

// Import all the decoupled components
import DetectionCard from './inference/DetectionCard';
import DetectionSummary from './inference/DetectionSummary';
import PerformanceInsights from './inference/PerformanceInsights';
import OfflineState from './inference/OfflineState';
import type { Detection, InferenceData, InferenceStats } from '../types';

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
    const [autoRefresh,] = useState(true);
    const [activeTab, setActiveTab] = useState<'detections' | 'frame' | 'stats'>('detections');

    // Detection Management
    const [selectedDetection, setSelectedDetection] = useState<Detection | null>(null);
    const [detectionFilters, setDetectionFilters] = useState<ClassFilter[]>([]);
    const [confidenceThreshold, setConfidenceThreshold] = useState(0.5);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy,] = useState<'confidence' | 'size' | 'class'>('confidence');
    const [sortOrder,] = useState<'asc' | 'desc'>('desc');

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
            className="bg-gradient-to-br from-cr-navy/95 to-cr-purple/25 backdrop-blur-xl border-2 border-cr-purple/40 rounded-2xl overflow-hidden shadow-2xl h-full flex flex-col"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            {/* Compact Header */}
            <div className="p-4 border-b border-cr-purple/30 bg-gradient-to-r from-cr-purple/20 to-cr-gold/10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Brain className="w-6 h-6 text-cr-purple" />
                            {isActive && (
                                <motion.div
                                    className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                />
                            )}
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-cr-purple">AI Analysis</h3>
                            <div className="flex items-center gap-2 text-xs">
                                <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-500'}`} />
                                <span className={`${getConnectionStatusColor()}`}>
                                    {getConnectionStatusText()}
                                </span>
                                {isActive && inferenceData && (
                                    <>
                                        <span className="text-white/60">•</span>
                                        <span className="text-cr-gold font-medium">
                                            Session {sessionCode}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Quick Stats */}
                        {isActive && inferenceData && (
                            <div className="flex gap-4 mr-4">
                                <div className="text-center">
                                    <div className="text-xl font-bold text-cr-gold">
                                        {filteredDetections.length}
                                    </div>
                                    <div className="text-xs text-white/60">Objects</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-xl font-bold text-green-400">
                                        {Math.round(inferenceData.inference_time)}
                                    </div>
                                    <div className="text-xs text-white/60">ms</div>
                                </div>
                                {stats.inferenceFPS && (
                                    <div className="text-center">
                                        <div className="text-xl font-bold text-cr-purple">
                                            {stats.inferenceFPS.toFixed(1)}
                                        </div>
                                        <div className="text-xs text-white/60">FPS</div>
                                    </div>
                                )}
                            </div>
                        )}

                        <motion.button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 transition-colors"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            title="Toggle Panel"
                        >
                            <motion.div
                                animate={{ rotate: isExpanded ? 180 : 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <ChevronUp className="w-4 h-4 text-white/70" />
                            </motion.div>
                        </motion.button>
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
                        className="flex-1 flex flex-col min-h-0"
                    >
                        {isActive && inferenceData ? (
                            <div className="flex-1 flex flex-col p-4 space-y-4 min-h-0">
                                {/* Compact Performance Dashboard */}
                                <div className="bg-black/20 rounded-xl p-3 border border-cr-purple/20">
                                    <div className="grid grid-cols-4 gap-3">
                                        <div className="text-center">
                                            <div className="text-lg font-bold text-green-400">
                                                {Math.round(stats.avgInferenceTime || 0)}ms
                                            </div>
                                            <div className="text-xs text-white/60">Avg Time</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-lg font-bold text-cr-gold">
                                                {stats.detectionsPerSecond.toFixed(1)}/s
                                            </div>
                                            <div className="text-xs text-white/60">Rate</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-lg font-bold text-cr-purple">
                                                {(stats.inferenceFPS || 0).toFixed(1)}
                                            </div>
                                            <div className="text-xs text-white/60">FPS</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-lg font-bold text-white">
                                                {Math.round(stats.accuracy || 0)}%
                                            </div>
                                            <div className="text-xs text-white/60">Accuracy</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Tab Navigation */}
                                <div className="flex gap-1 bg-black/20 rounded-lg p-1">
                                    {[
                                        { id: 'detections', label: 'Detections', icon: Target },
                                        { id: 'frame', label: 'Frame', icon: Eye },
                                        { id: 'stats', label: 'Stats', icon: BarChart3 }
                                    ].map(({ id, label, icon: Icon }) => (
                                        <motion.button
                                            key={id}
                                            onClick={() => setActiveTab(id as any)}
                                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === id
                                                ? 'bg-cr-purple text-white'
                                                : 'text-white/70 hover:bg-white/10'
                                                }`}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <Icon className="w-4 h-4" />
                                            {label}
                                        </motion.button>
                                    ))}
                                </div>

                                {/* Tab Content */}
                                <div className="flex-1 min-h-0">
                                    <AnimatePresence mode="wait">
                                        {activeTab === 'detections' && (
                                            <motion.div
                                                key="detections"
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 20 }}
                                                className="h-full flex flex-col"
                                            >
                                                {/* Quick Filters */}
                                                <div className="mb-3">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-sm font-bold text-white">
                                                            Live Detections ({filteredDetections.length}/{inferenceData.detections.length})
                                                        </span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-white/60">
                                                                Confidence: {Math.round(confidenceThreshold * 100)}%
                                                            </span>
                                                            <input
                                                                type="range"
                                                                min="0"
                                                                max="1"
                                                                step="0.05"
                                                                value={confidenceThreshold}
                                                                onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                                                                className="w-16 h-1 bg-black/30 rounded-lg appearance-none cursor-pointer slider"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Detections List */}
                                                <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                                    {filteredDetections.length > 0 ? (
                                                        filteredDetections.map((detection, index) => (
                                                            <DetectionCard
                                                                key={`${detection.class}-${detection.bbox.x1}-${detection.bbox.y1}-${index}`}
                                                                detection={detection}
                                                                index={index}
                                                                isSelected={selectedDetection === detection}
                                                                onSelect={setSelectedDetection}
                                                                imageShape={inferenceData.image_shape}
                                                            />
                                                        ))
                                                    ) : inferenceData.detections.length > 0 ? (
                                                        <div className="text-center py-8">
                                                            <Filter className="w-12 h-12 text-white/30 mx-auto mb-3" />
                                                            <h4 className="text-lg font-bold text-white/60 mb-2">No Objects Match Filters</h4>
                                                            <p className="text-white/40">
                                                                {inferenceData.detections.length} objects detected but filtered out
                                                            </p>
                                                            <motion.button
                                                                onClick={resetFilters}
                                                                className="mt-3 px-3 py-2 bg-cr-purple rounded-lg text-white hover:bg-cr-purple/80 transition-colors"
                                                                whileHover={{ scale: 1.05 }}
                                                                whileTap={{ scale: 0.95 }}
                                                            >
                                                                Reset Filters
                                                            </motion.button>
                                                        </div>
                                                    ) : (
                                                        <div className="text-center py-8">
                                                            <Eye className="w-16 h-16 text-white/20 mx-auto mb-4" />
                                                            <h4 className="text-lg font-bold text-white/60 mb-2">No Objects Detected</h4>
                                                            <p className="text-white/40">AI is actively scanning for game elements</p>
                                                            <div className="mt-4 flex items-center justify-center gap-4 text-sm text-white/30">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                                                    <span>Inference Active</span>
                                                                </div>
                                                                <span>•</span>
                                                                <span>Processing: {Math.round(inferenceData.inference_time)}ms</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Detection Summary */}
                                                {filteredDetections.length > 0 && (
                                                    <DetectionSummary detections={filteredDetections} />
                                                )}
                                            </motion.div>
                                        )}

                                        {activeTab === 'frame' && (
                                            <motion.div
                                                key="frame"
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 20 }}
                                                className="h-full flex flex-col"
                                            >
                                                {inferenceData.annotated_frame ? (
                                                    <div className="h-full flex flex-col">
                                                        <div className="flex items-center justify-between mb-3">
                                                            <h4 className="text-lg font-bold text-white flex items-center gap-2">
                                                                <Camera className="w-5 h-5 text-cr-gold" />
                                                                Annotated Frame
                                                            </h4>
                                                            <div className="flex items-center gap-2">
                                                                <motion.button
                                                                    onClick={downloadAnnotatedFrame}
                                                                    className="px-3 py-1 bg-cr-purple/20 border border-cr-purple/40 rounded-lg text-white text-sm font-medium hover:bg-cr-purple/30 transition-colors flex items-center gap-2"
                                                                    whileHover={{ scale: 1.05 }}
                                                                    whileTap={{ scale: 0.95 }}
                                                                >
                                                                    <Download className="w-3 h-3" />
                                                                    Save
                                                                </motion.button>
                                                                <motion.button
                                                                    onClick={openAnnotatedFrameFullscreen}
                                                                    className="px-3 py-1 bg-cr-gold/20 border border-cr-gold/40 rounded-lg text-white text-sm font-medium hover:bg-cr-gold/30 transition-colors flex items-center gap-2"
                                                                    whileHover={{ scale: 1.05 }}
                                                                    whileTap={{ scale: 0.95 }}
                                                                >
                                                                    <Maximize2 className="w-3 h-3" />
                                                                    Expand
                                                                </motion.button>
                                                            </div>
                                                        </div>

                                                        <div className="flex-1 rounded-xl overflow-hidden border border-cr-purple/30">
                                                            <img
                                                                src={`data:image/jpeg;base64,${inferenceData.annotated_frame}`}
                                                                alt="Annotated frame with AI detections"
                                                                className="w-full h-full object-contain bg-black cursor-pointer"
                                                                onClick={openAnnotatedFrameFullscreen}
                                                                onLoad={() => console.log('Annotated frame loaded successfully')}
                                                                onError={() => console.error('Failed to load annotated frame')}
                                                            />
                                                        </div>

                                                        <div className="mt-3 text-center">
                                                            <div className="text-sm text-white/60">
                                                                {inferenceData.detections.length} detections • {Math.round(inferenceData.inference_time)}ms • {new Date().toLocaleTimeString()}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="h-full flex items-center justify-center">
                                                        <div className="text-center">
                                                            <Camera className="w-16 h-16 text-white/20 mx-auto mb-4" />
                                                            <h4 className="text-lg font-bold text-white/60 mb-2">No Frame Available</h4>
                                                            <p className="text-white/40">Waiting for annotated frame data</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </motion.div>
                                        )}

                                        {activeTab === 'stats' && (
                                            <motion.div
                                                key="stats"
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 20 }}
                                                className="h-full overflow-y-auto custom-scrollbar"
                                            >
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
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        ) : (
                            <div className="p-6">
                                <OfflineState
                                    sessionCode={sessionCode}
                                    connectionStatus={getConnectionStatusText()}
                                />
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Custom Styles */}
            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(177, 84, 255, 0.5);
                    border-radius: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(177, 84, 255, 0.7);
                }
                .slider::-webkit-slider-thumb {
                    appearance: none;
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    background: #b154ff;
                    cursor: pointer;
                    border: 2px solid #ffffff;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                }
                .slider::-webkit-slider-track {
                    width: 100%;
                    height: 4px;
                    cursor: pointer;
                    background: rgba(255,255,255,0.2);
                    border-radius: 2px;
                }
            `}</style>
        </motion.div>
    );
};

export default InferencePanel;