import React from 'react';
import { motion } from 'framer-motion';
import {
    CheckCircle,
    AlertTriangle,
    XCircle,
    PieChart,
    Target
} from 'lucide-react';
import type { Detection } from '../../types';

interface DetectionSummaryProps {
    detections: Detection[];
}

const DetectionSummary: React.FC<DetectionSummaryProps> = ({ detections }) => {
    const highConfidence = detections.filter(d => d.confidence >= 0.8);
    const mediumConfidence = detections.filter(d => d.confidence >= 0.6 && d.confidence < 0.8);
    const lowConfidence = detections.filter(d => d.confidence < 0.6);
    const avgConfidence = detections.length > 0
        ? detections.reduce((sum, d) => sum + d.confidence, 0) / detections.length
        : 0;
    const uniqueClasses = new Set(detections.map(d => d.class)).size;

    return (
        <motion.div
            className="mt-4 p-4 bg-black/30 rounded-lg border border-cr-gold/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
        >
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div>
                    <div className="text-white/60 flex items-center gap-1 mb-1">
                        <CheckCircle className="w-3 h-3" />
                        High Confidence
                    </div>
                    <div className="text-green-400 font-bold text-lg">
                        {highConfidence.length}
                    </div>
                    <div className="text-xs text-white/40">
                        ≥80% confidence
                    </div>
                </div>

                <div>
                    <div className="text-white/60 flex items-center gap-1 mb-1">
                        <AlertTriangle className="w-3 h-3" />
                        Medium Confidence
                    </div>
                    <div className="text-yellow-400 font-bold text-lg">
                        {mediumConfidence.length}
                    </div>
                    <div className="text-xs text-white/40">
                        60-79% confidence
                    </div>
                </div>

                <div>
                    <div className="text-white/60 flex items-center gap-1 mb-1">
                        <XCircle className="w-3 h-3" />
                        Low Confidence
                    </div>
                    <div className="text-red-400 font-bold text-lg">
                        {lowConfidence.length}
                    </div>
                    <div className="text-xs text-white/40">
                        &lt;60% confidence
                    </div>
                </div>

                <div>
                    <div className="text-white/60 flex items-center gap-1 mb-1">
                        <PieChart className="w-3 h-3" />
                        Avg Confidence
                    </div>
                    <div className="text-white font-bold text-lg">
                        {Math.round(avgConfidence * 100)}%
                    </div>
                    <div className="text-xs text-white/40">
                        Overall accuracy
                    </div>
                </div>

                <div>
                    <div className="text-white/60 flex items-center gap-1 mb-1">
                        <Target className="w-3 h-3" />
                        Classes Found
                    </div>
                    <div className="text-cr-purple font-bold text-lg">
                        {uniqueClasses}
                    </div>
                    <div className="text-xs text-white/40">
                        Unique objects
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default DetectionSummary;