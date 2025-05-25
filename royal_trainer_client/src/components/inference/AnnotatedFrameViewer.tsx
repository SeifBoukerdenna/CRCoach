import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Camera,
    Download,
    Maximize2,
    Minimize2,
    Eye,
    Target,
    Clock
} from 'lucide-react';

interface AnnotatedFrameViewerProps {
    annotatedFrame: string;
    detectionCount: number;
    inferenceTime: number;
    sessionCode: string;
    isVisible: boolean;
    onToggleVisibility: () => void;
    onDownload: () => void;
    onFullscreen: () => void;
}

const AnnotatedFrameViewer: React.FC<AnnotatedFrameViewerProps> = ({
    annotatedFrame,
    detectionCount,
    inferenceTime,
    sessionCode,
    isVisible,
    onToggleVisibility,
    onDownload,
    onFullscreen
}) => {
    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-xl font-bold text-white flex items-center gap-2">
                    <Camera className="w-6 h-6 text-cr-gold" />
                    Annotated Frame
                    <span className="text-sm font-normal text-white/60 bg-black/30 px-2 py-1 rounded">
                        {detectionCount} objects marked
                    </span>
                </h4>

                <div className="flex items-center gap-2">
                    <motion.button
                        onClick={onDownload}
                        className="px-3 py-2 bg-cr-purple/20 border border-cr-purple/40 rounded-lg text-white text-sm font-medium hover:bg-cr-purple/30 transition-colors flex items-center gap-2"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <Download className="w-4 h-4" />
                        Download
                    </motion.button>

                    <motion.button
                        onClick={onFullscreen}
                        className="px-3 py-2 bg-cr-gold/20 border border-cr-gold/40 rounded-lg text-white text-sm font-medium hover:bg-cr-gold/30 transition-colors flex items-center gap-2"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <Maximize2 className="w-4 h-4" />
                        Fullscreen
                    </motion.button>

                    <motion.button
                        onClick={onToggleVisibility}
                        className="px-4 py-2 bg-cr-purple rounded-lg text-white font-medium hover:bg-cr-purple/80 transition-colors"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        {isVisible ? (
                            <>
                                <Minimize2 className="w-4 h-4 mr-2" />
                                Hide Frame
                            </>
                        ) : (
                            <>
                                <Eye className="w-4 h-4 mr-2" />
                                Show Frame
                            </>
                        )}
                    </motion.button>
                </div>
            </div>

            <AnimatePresence>
                {isVisible && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="rounded-xl overflow-hidden border-2 border-cr-purple shadow-lg"
                    >
                        <div className="relative">
                            <img
                                src={`data:image/jpeg;base64,${annotatedFrame}`}
                                alt="Annotated frame with AI detections"
                                className="w-full h-auto max-h-96 object-contain bg-black cursor-pointer"
                                onClick={onFullscreen}
                                onLoad={() => console.log('Annotated frame loaded successfully')}
                                onError={() => console.error('Failed to load annotated frame')}
                            />

                            {/* Image overlay info */}
                            <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-sm rounded-lg px-3 py-2 text-white text-sm">
                                <div className="flex items-center gap-2">
                                    <Target className="w-4 h-4 text-cr-gold" />
                                    <span>{detectionCount} detections</span>
                                    <span className="text-white/60">•</span>
                                    <Clock className="w-4 h-4 text-cr-purple" />
                                    <span>{Math.round(inferenceTime)}ms</span>
                                </div>
                            </div>

                            {/* Session and timestamp */}
                            <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-sm rounded-lg px-3 py-2 text-white text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="text-cr-gold font-medium">Session {sessionCode}</span>
                                    <span className="text-white/60">•</span>
                                    <span>{new Date().toLocaleTimeString()}</span>
                                </div>
                            </div>

                            {/* Click hint */}
                            <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1 text-white/70 text-xs">
                                Click for fullscreen
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AnnotatedFrameViewer;