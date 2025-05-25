import React from 'react';
import { motion } from 'framer-motion';
import { Target, Layers, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import type { Detection } from '../../types';


interface DetectionCardProps {
    detection: Detection;
    index: number;
    isSelected: boolean;
    onSelect: (detection: Detection | null) => void;
    imageShape?: { width: number; height: number };
}

const DetectionCard: React.FC<DetectionCardProps> = ({
    detection,
    index,
    isSelected,
    onSelect,
    imageShape
}) => {
    const getConfidenceColor = (confidence: number) => {
        if (confidence >= 0.8) return 'text-green-400 bg-green-900/20 border-green-500/30';
        if (confidence >= 0.6) return 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30';
        return 'text-red-400 bg-red-900/20 border-red-500/30';
    };

    const getClassIcon = (className: string) => {
        const iconMap: Record<string, string> = {
            'tower': '🏰', 'knight': '⚔️', 'archer': '🏹', 'giant': '👾',
            'wizard': '🔮', 'dragon': '🐲', 'fireball': '🔥', 'lightning': '⚡',
            'freeze': '🧊', 'elixir': '💧', 'crown': '👑', 'bridge': '🌉',
            'king': '👑', 'princess': '👸', 'hog': '🐗', 'balloon': '🎈',
            'golem': '🗿', 'pekka': '🤖', 'barbarian': '🪓', 'minion': '👹',
            'skeleton': '💀', 'goblin': '👺', 'spear': '🗡️', 'cannon': '💣',
            'mortar': '🎯', 'tesla': '⚡', 'inferno': '🔥', 'xbow': '🏹',
            'bomb': '💥', 'rocket': '🚀', 'arrow': '➡️', 'zap': '⚡',
            'poison': '☠️', 'heal': '❤️', 'rage': '😡', 'clone': '👥',
            'mirror': '🪞', 'graveyard': '⚰️', 'tornado': '🌪️',
            'default': '🎯'
        };
        return iconMap[className.toLowerCase()] || iconMap.default;
    };

    const formatDetectionBBox = (bbox: Detection['bbox']) => {
        return `${bbox.width}×${bbox.height} at (${bbox.x1}, ${bbox.y1})`;
    };

    const getPositionText = (bbox: Detection['bbox'], imageShape?: { width: number; height: number }) => {
        if (!imageShape) return 'Unknown';
        const centerY = bbox.y1 + bbox.height / 2;
        const relativeY = centerY / imageShape.height;

        if (relativeY < 0.33) return 'Top';
        if (relativeY > 0.66) return 'Bottom';
        return 'Middle';
    };

    const handleClick = () => {
        onSelect(isSelected ? null : detection);
    };

    return (
        <motion.div
            className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${isSelected
                ? `${getConfidenceColor(detection.confidence)} scale-102 shadow-lg`
                : `${getConfidenceColor(detection.confidence)} hover:scale-102 hover:shadow-md`
                }`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.03 }}
            onClick={handleClick}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
        >
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                    <div className="text-3xl">
                        {getClassIcon(detection.class)}
                    </div>
                    <div>
                        <div className="font-bold text-lg capitalize flex items-center gap-2">
                            {detection.class}
                            <span className="text-xs bg-white/20 px-2 py-1 rounded flex items-center gap-1">
                                <Layers className="w-3 h-3" />
                                ID: {detection.class_id}
                            </span>
                        </div>
                        <div className="text-sm opacity-80 flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            {formatDetectionBBox(detection.bbox)}
                        </div>
                        {isSelected && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="mt-3 text-xs space-y-2 bg-black/20 p-3 rounded-lg"
                            >
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <span className="text-white/60">Center:</span>
                                        <span className="ml-2 text-white">
                                            ({Math.round(detection.bbox.x1 + detection.bbox.width / 2)}, {Math.round(detection.bbox.y1 + detection.bbox.height / 2)})
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-white/60">Area:</span>
                                        <span className="ml-2 text-white">
                                            {(detection.bbox.width * detection.bbox.height).toLocaleString()} px²
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-white/60">Aspect:</span>
                                        <span className="ml-2 text-white">
                                            {(detection.bbox.width / detection.bbox.height).toFixed(2)}:1
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-white/60">Position:</span>
                                        <span className="ml-2 text-white">
                                            {getPositionText(detection.bbox, imageShape)}
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-bold">
                        {Math.round(detection.confidence * 100)}%
                    </div>
                    <div className="text-xs opacity-60 mb-1">
                        Confidence
                    </div>
                    <div className="text-xs mt-1 opacity-80 flex items-center gap-1">
                        {detection.confidence >= 0.8 ? (
                            <>
                                <CheckCircle className="w-3 h-3 text-green-400" />
                                <span className="text-green-400">High</span>
                            </>
                        ) : detection.confidence >= 0.6 ? (
                            <>
                                <AlertTriangle className="w-3 h-3 text-yellow-400" />
                                <span className="text-yellow-400">Medium</span>
                            </>
                        ) : (
                            <>
                                <XCircle className="w-3 h-3 text-red-400" />
                                <span className="text-red-400">Low</span>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default DetectionCard;