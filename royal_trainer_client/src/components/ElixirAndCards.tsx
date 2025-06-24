// royal_trainer_client/src/components/ElixirAndCardsEnhanced.tsx
// Example of how to use the new hooks with the ElixirAndCards component

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Crown } from 'lucide-react';
import { useElixirBar } from '../hooks/useElixirBar';
import { useCardCycle } from '../hooks/useCardCycle';

interface ElixirAndCardsEnhancedProps {
    className?: string;
    isPlayerCards?: boolean; // true for player, false for opponent
}

const getRarityColor = (rarity: string) => {
    switch (rarity) {
        case 'common': return 'from-gray-500 to-gray-700';
        case 'rare': return 'from-orange-500 to-orange-700';
        case 'epic': return 'from-purple-500 to-purple-700';
        case 'legendary': return 'from-yellow-400 to-yellow-600';
        default: return 'from-gray-500 to-gray-700';
    }
};

const getRarityBorderColor = (rarity: string) => {
    switch (rarity) {
        case 'common': return 'border-gray-400';
        case 'rare': return 'border-orange-400';
        case 'epic': return 'border-purple-400';
        case 'legendary': return 'border-yellow-400';
        default: return 'border-gray-400';
    }
};

const ElixirAndCardsEnhanced: React.FC<ElixirAndCardsEnhancedProps> = ({
    className = "",
    isPlayerCards = false
}) => {
    // Use the real hooks
    const elixir = useElixirBar();
    const cardCycle = useCardCycle();

    const elixirPercentage = (elixir.current / elixir.max) * 100;

    // Handle card play for player cards
    const handleCardPlay = (card: any, index: number) => {
        if (!isPlayerCards || index >= 4) return; // Only allow playing cards in hand

        const canPlay = elixir.spendElixir(card.cost);
        if (canPlay) {
            const playedCard = cardCycle.playCard(card.id);
            console.log(`Played: ${playedCard?.name} (${card.cost} elixir)`);
        } else {
            console.log(`Not enough elixir to play ${card.name} (need ${card.cost}, have ${elixir.current.toFixed(1)})`);
        }
    };

    // For demonstration, we'll show current hand + cycle queue as "opponent cards"
    // In a real implementation, this would come from AI detection of opponent's cards
    const displayCards = isPlayerCards ? cardCycle.hand : [...cardCycle.hand, ...cardCycle.cycleQueue];

    return (
        <motion.div
            className={`bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-xl p-4 ${className}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Crown className="w-5 h-5 text-purple-400" />
                    {isPlayerCards ? 'Your Cards' : 'Opponent Analysis'}
                </h3>
                <div className="text-sm text-white/60">
                    Live Detection • {elixir.multiplier}x Speed
                </div>
            </div>

            {/* Elixir Bar */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white/80 flex items-center gap-1">
                        <Zap className="w-4 h-4 text-purple-400" />
                        Elixir
                    </span>
                    <span className="text-sm font-bold text-purple-300">
                        {elixir.current.toFixed(1)}/{elixir.max}
                    </span>
                </div>

                <div className="relative">
                    {/* Background */}
                    <div className="h-4 bg-gradient-to-r from-slate-700 to-slate-800 rounded-full border border-slate-600 overflow-hidden">
                        {/* Elixir Fill */}
                        <motion.div
                            className="h-full bg-gradient-to-r from-purple-500 via-purple-400 to-pink-400 shadow-lg relative overflow-hidden"
                            style={{ width: `${elixirPercentage}%` }}
                            transition={{ duration: 0.1 }}
                        >
                            {/* Animated shine effect */}
                            <motion.div
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                                animate={{ x: [-100, 200] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            />
                        </motion.div>
                    </div>

                    {/* Elixir segments indicators */}
                    <div className="absolute inset-0 flex justify-between items-center px-1">
                        {[...Array(elixir.max)].map((_, i) => (
                            <div
                                key={i}
                                className="w-px h-2 bg-slate-600"
                                style={{ opacity: i === 0 || i === elixir.max - 1 ? 0 : 0.7 }}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Cards Section */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-white/80">
                        {isPlayerCards ? 'Your Hand' : 'Opponent Cards'}
                    </span>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-xs text-green-400">In Hand</span>
                        {!isPlayerCards && (
                            <>
                                <div className="w-2 h-2 bg-yellow-400 rounded-full ml-2"></div>
                                <span className="text-xs text-yellow-400">Next</span>
                            </>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-8 gap-2">
                    {displayCards.map((card, index) => {
                        const isInHand = index < 4;
                        const isNext = !isPlayerCards && index === 4; // First card in cycle queue
                        const canPlay = isPlayerCards && cardCycle.isCardPlayable(card.id, elixir.current);

                        return (
                            <motion.div
                                key={`${card.id}-${index}`}
                                className="relative group"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.3, delay: index * 0.05 }}
                                whileHover={{ scale: 1.05 }}
                            >
                                {/* Card Container */}
                                <div
                                    onClick={() => handleCardPlay(card, index)}
                                    className={`
                                        relative aspect-[3/4] rounded-lg border-2 overflow-hidden cursor-pointer
                                        transition-all duration-200
                                        ${isInHand
                                            ? `${getRarityBorderColor(card.rarity)} shadow-lg shadow-green-500/30 bg-gradient-to-b ${getRarityColor(card.rarity)}`
                                            : 'border-slate-600 bg-gradient-to-b from-slate-700 to-slate-800 opacity-60'
                                        }
                                        ${isPlayerCards && !canPlay ? 'opacity-50' : ''}
                                        ${isPlayerCards && isInHand && canPlay ? 'hover:scale-105' : ''}
                                    `}
                                >
                                    {/* Card Background Pattern */}
                                    <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-black/30" />

                                    {/* Card Content */}
                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-1">
                                        <div className="text-xs font-bold text-white text-center leading-tight">
                                            {card.name}
                                        </div>
                                        <div className="text-xs text-white/80 font-medium">
                                            Lv.{card.level}
                                        </div>
                                    </div>

                                    {/* Elixir Cost */}
                                    <div className="absolute top-1 left-1 w-4 h-4 bg-purple-600 rounded-full flex items-center justify-center border border-purple-400">
                                        <span className="text-xs font-bold text-white">{card.cost}</span>
                                    </div>

                                    {/* In Hand Indicator */}
                                    {isInHand && (
                                        <motion.div
                                            className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border border-white shadow-lg"
                                            animate={{ scale: [1, 1.2, 1] }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                        />
                                    )}

                                    {/* Next Card Indicator */}
                                    {isNext && (
                                        <motion.div
                                            className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 px-1 py-0.5 bg-yellow-400 text-black text-xs font-bold rounded-sm"
                                            animate={{ y: [0, -2, 0] }}
                                            transition={{ duration: 1.5, repeat: Infinity }}
                                        >
                                            NEXT
                                        </motion.div>
                                    )}

                                    {/* Playable Indicator for Player Cards */}
                                    {isPlayerCards && canPlay && isInHand && (
                                        <motion.div
                                            className="absolute inset-0 border-2 border-green-400 rounded-lg"
                                            animate={{ opacity: [0.5, 1, 0.5] }}
                                            transition={{ duration: 1.5, repeat: Infinity }}
                                        />
                                    )}

                                    {/* Hover Tooltip */}
                                    <AnimatePresence>
                                        <motion.div
                                            className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/90 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10"
                                        >
                                            {card.name} ({card.cost} elixir, Lv.{card.level})
                                        </motion.div>
                                    </AnimatePresence>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Additional Info for Player Cards */}
                {isPlayerCards && (
                    <div className="mt-3 text-xs text-white/60 text-center">
                        Next Card: <span className="text-yellow-400 font-semibold">{cardCycle.nextCard.name}</span>
                        {' • '}
                        <span className={elixir.isRegenerating ? 'text-green-400' : 'text-red-400'}>
                            Elixir {elixir.isRegenerating ? 'Regenerating' : 'Paused'}
                        </span>
                        <br />
                        <span className="text-white/40">
                            Click any card in hand to play • Cards cycle through your 8-card deck
                        </span>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default ElixirAndCardsEnhanced;