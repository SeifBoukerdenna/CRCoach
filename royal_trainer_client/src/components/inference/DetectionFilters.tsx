import React from 'react';
import { motion } from 'framer-motion';
import { Filter, Search } from 'lucide-react';

interface ClassFilter {
    name: string;
    enabled: boolean;
    count: number;
    confidence: number;
}

interface DetectionFiltersProps {
    filters: ClassFilter[];
    onToggleFilter: (className: string) => void;
    onResetFilters: () => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    confidenceThreshold: number;
    onConfidenceChange: (threshold: number) => void;
    sortBy: 'confidence' | 'size' | 'class';
    onSortByChange: (sortBy: 'confidence' | 'size' | 'class') => void;
    sortOrder: 'asc' | 'desc';
    onSortOrderChange: (order: 'asc' | 'desc') => void;
}

const DetectionFilters: React.FC<DetectionFiltersProps> = ({
    filters,
    onToggleFilter,
    onResetFilters,
    searchQuery,
    onSearchChange,
    confidenceThreshold,
    onConfidenceChange,
    sortBy,
    onSortByChange,
    sortOrder,
    onSortOrderChange
}) => {
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

    return (
        <div className="bg-black/20 rounded-xl p-4 border border-cr-gold/20">
            <div className="flex items-center justify-between mb-4">
                <h5 className="font-bold text-white flex items-center gap-2">
                    <Filter className="w-5 h-5 text-cr-gold" />
                    Detection Filters
                </h5>
                <motion.button
                    onClick={onResetFilters}
                    className="px-3 py-1 text-sm bg-cr-purple/20 border border-cr-purple/40 rounded-lg text-white hover:bg-cr-purple/30 transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    Reset Filters
                </motion.button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
                {/* Search and Confidence */}
                <div className="space-y-3">
                    <div>
                        <label className="text-sm text-white/70 mb-1 block">Search Objects</label>
                        <div className="relative">
                            <Search className="w-4 h-4 text-white/50 absolute left-3 top-1/2 transform -translate-y-1/2" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => onSearchChange(e.target.value)}
                                placeholder="Search by class name..."
                                className="w-full pl-10 pr-4 py-2 bg-black/30 border border-white/20 rounded-lg text-white placeholder-white/50 focus:border-cr-gold focus:outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-sm text-white/70 mb-1 block">
                            Confidence Threshold: {Math.round(confidenceThreshold * 100)}%
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={confidenceThreshold}
                            onChange={(e) => onConfidenceChange(parseFloat(e.target.value))}
                            className="w-full h-2 bg-black/30 rounded-lg appearance-none cursor-pointer slider"
                        />
                    </div>
                </div>

                {/* Sort Controls */}
                <div className="space-y-3">
                    <div>
                        <label className="text-sm text-white/70 mb-1 block">Sort By</label>
                        <div className="flex gap-2">
                            {(['confidence', 'size', 'class'] as const).map((option) => (
                                <motion.button
                                    key={option}
                                    onClick={() => onSortByChange(option)}
                                    className={`px-3 py-1 text-sm rounded-lg border transition-colors ${sortBy === option
                                        ? 'bg-cr-gold/20 border-cr-gold/40 text-cr-gold'
                                        : 'bg-black/20 border-white/20 text-white/70 hover:bg-white/10'
                                        }`}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    {option.charAt(0).toUpperCase() + option.slice(1)}
                                </motion.button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-sm text-white/70 mb-1 block">Order</label>
                        <div className="flex gap-2">
                            {(['desc', 'asc'] as const).map((option) => (
                                <motion.button
                                    key={option}
                                    onClick={() => onSortOrderChange(option)}
                                    className={`px-3 py-1 text-sm rounded-lg border transition-colors ${sortOrder === option
                                        ? 'bg-cr-purple/20 border-cr-purple/40 text-cr-purple'
                                        : 'bg-black/20 border-white/20 text-white/70 hover:bg-white/10'
                                        }`}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    {option === 'desc' ? 'High → Low' : 'Low → High'}
                                </motion.button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Class Filters */}
            {filters.length > 0 && (
                <div className="mt-4">
                    <label className="text-sm text-white/70 mb-2 block">Object Classes</label>
                    <div className="flex flex-wrap gap-2">
                        {filters.map((filter) => (
                            <motion.button
                                key={filter.name}
                                onClick={() => onToggleFilter(filter.name)}
                                className={`px-3 py-1 text-sm rounded-lg border transition-colors flex items-center gap-2 ${filter.enabled
                                    ? 'bg-green-500/20 border-green-500/40 text-green-400'
                                    : 'bg-red-500/20 border-red-500/40 text-red-400'
                                    }`}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <span>{getClassIcon(filter.name)}</span>
                                <span>{filter.name}</span>
                                <span className="text-xs">({filter.count})</span>
                            </motion.button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DetectionFilters;