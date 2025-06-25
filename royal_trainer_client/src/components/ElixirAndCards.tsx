// royal_trainer_client/src/components/ElixirAndCardsEnhanced.tsx
// Two‑row layout: first row = cards in hand, second row = grey cycle cards
// Now with integrated Clash Royale-style game timer

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Crown, Clock, RotateCcw, Minus } from 'lucide-react';
import { useElixirBar } from '../hooks/useElixirBar';
import { useCardCycle } from '../hooks/useCardCycle';
import { useGameTimer } from '../hooks/useGameTimer';

interface ElixirAndCardsEnhancedProps {
    className?: string;
    isPlayerCards?: boolean; // true for player, false for opponent
}

/* ---------------- util helpers ---------------- */
const getRarityColor = (rarity: string) => {
    switch (rarity) {
        case 'common':
            return 'from-gray-500 to-gray-700';
        case 'rare':
            return 'from-orange-500 to-orange-700';
        case 'epic':
            return 'from-purple-500 to-purple-700';
        case 'legendary':
            return 'from-yellow-400 to-yellow-600';
        case 'champion':
            return 'from-gold-400 to-gold-600';
        default:
            return 'from-gray-500 to-gray-700';
    }
};

const getRarityBorderColor = (rarity: string) => {
    switch (rarity) {
        case 'common':
            return 'border-gray-400';
        case 'rare':
            return 'border-orange-400';
        case 'epic':
            return 'border-purple-400';
        case 'legendary':
            return 'border-yellow-400';
        case 'champion':
            return 'border-gold-400';
        default:
            return 'border-gray-400';
    }
};

/* ---------------- Timer Display Component ---------------- */
const GameTimerDisplay: React.FC<{
    timer: any;
    onResetTimer: () => void;
    onResetElixir: () => void;
}> = ({ timer, onResetTimer, onResetElixir }) => {
    const getTimerColor = () => {
        if (timer.isGameFinished) return 'text-red-500';
        if (timer.currentPhase === 'overtime_triple') return 'text-red-400';
        if (timer.currentPhase === 'regular_double' || timer.currentPhase === 'overtime_double') return 'text-orange-400';
        return 'text-white';
    };

    const getPhaseText = () => {
        switch (timer.currentPhase) {
            case 'regular': return 'BATTLE TIME';
            case 'regular_double': return 'DOUBLE ELIXIR!';
            case 'overtime_double': return 'DOUBLE ELIXIR!';
            case 'overtime_triple': return 'TRIPLE ELIXIR!';
            case 'finished': return 'GAME OVER';
            default: return 'BATTLE TIME';
        }
    };

    const getPhaseColor = () => {
        switch (timer.currentPhase) {
            case 'regular_double':
            case 'overtime_double': return 'text-orange-400';
            case 'overtime_triple': return 'text-red-400';
            case 'finished': return 'text-red-500';
            default: return 'text-purple-400';
        }
    };

    return (
        <div className="flex items-center justify-between mb-6">
            {/* Timer Display */}
            <div className="flex items-center gap-4">
                <div className="relative">
                    {/* Main Timer */}
                    <div className="bg-gradient-to-r from-slate-900 to-slate-800 border-2 border-slate-600 rounded-xl px-6 py-3 shadow-lg">
                        <div className="flex items-center gap-3">
                            <Clock className="w-6 h-6 text-blue-400" />
                            <div className="text-center">
                                <div className={`text-2xl font-black font-mono ${getTimerColor()}`}>
                                    {String(timer.minutes).padStart(2, '0')}:{String(timer.seconds).padStart(2, '0')}
                                </div>
                                {/* Phase Indicator - moved inside timer box */}
                                <motion.div
                                    className="mt-1"
                                    animate={timer.currentPhase.includes('double') || timer.currentPhase.includes('triple') ?
                                        { scale: [1, 1.05, 1] } : {}}
                                    transition={{ duration: 1, repeat: Infinity }}
                                >
                                    <div className={`text-xs font-bold ${getPhaseColor()}`}>
                                        {getPhaseText()}
                                    </div>
                                </motion.div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Overtime Indicator */}
                {timer.isOvertime && (
                    <motion.div
                        className="bg-gradient-to-r from-red-600 to-orange-600 border border-red-400 rounded-lg px-4 py-2"
                        animate={{ opacity: [0.7, 1, 0.7] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                    >
                        <div className="text-white font-bold text-sm">OVERTIME</div>
                    </motion.div>
                )}
            </div>

            {/* Debug Controls */}
            <div className="flex items-center gap-3">
                <button
                    onClick={onResetTimer}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 border border-blue-500 rounded-lg text-sm font-semibold text-white transition-all shadow-lg"
                    title="Reset Timer"
                >
                    <RotateCcw className="w-4 h-4" />
                    Reset Timer
                </button>
                <button
                    onClick={onResetElixir}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 border border-purple-500 rounded-lg text-sm font-semibold text-white transition-all shadow-lg"
                    title="Reset Elixir to 0"
                >
                    <Minus className="w-4 h-4" />
                    Reset Elixir
                </button>
            </div>
        </div>
    );
};

/* ---------------- main component ---------------- */
const ElixirAndCardsEnhanced: React.FC<ElixirAndCardsEnhancedProps> = ({
    className = '',
    isPlayerCards = false,
}) => {
    /* hooks */
    const elixir = useElixirBar();
    const cardCycle = useCardCycle();
    const gameTimer = useGameTimer();

    /* track elixir changes for animation */
    const [lastElixirValue, setLastElixirValue] = React.useState(elixir.current);
    const [isElixirSpending, setIsElixirSpending] = React.useState(false);

    /* sync elixir multiplier with game timer */
    useEffect(() => {
        elixir.setMultiplier(gameTimer.elixirMultiplier);
    }, [gameTimer.elixirMultiplier, elixir.setMultiplier]);

    /* track elixir spending vs regenerating for animation */
    useEffect(() => {
        if (elixir.current < lastElixirValue) {
            // Elixir decreased - spending
            setIsElixirSpending(true);
            // Reset to regenerating mode after a short delay
            setTimeout(() => setIsElixirSpending(false), 200);
        }
        setLastElixirValue(elixir.current);
    }, [elixir.current, lastElixirValue]);

    /* derived */
    const elixirPercentage = (elixir.current / elixir.max) * 100;

    // build display deck (hand first, then cycle queue)
    const displayCards = isPlayerCards
        ? [...cardCycle.hand, ...cardCycle.cycleQueue]
        : [...cardCycle.hand, ...cardCycle.cycleQueue]; // opponent mocked the same way for now

    const handCards = displayCards.slice(0, 4);
    const cycleCards = displayCards.slice(4);

    /* debug handlers */
    const handleResetElixir = () => {
        elixir.setElixirToZero();
    };

    /* card renderer */
    const renderCard = (
        card: any,
        opts: { index: number; isHand: boolean; isNextInCycle: boolean }
    ) => {
        const canPlay =
            isPlayerCards && opts.isHand && cardCycle.isCardPlayable(card.id, elixir.current);

        return (
            <motion.div
                key={`${card.id}-${opts.index}`}
                className="relative group"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: opts.index * 0.05 }}
                whileHover={{ scale: 1.05 }}
            >
                <div
                    onClick={() => {
                        if (isPlayerCards && opts.isHand) {
                            if (elixir.spendElixir(card.cost)) cardCycle.playCard(card.id);
                        }
                    }}
                    className={`relative aspect-[3/4] rounded-xl border-3 overflow-hidden cursor-pointer h-24 w-18 transition-all duration-200
            ${opts.isHand ? `${getRarityBorderColor(card.rarity)} shadow-lg shadow-green-500/30` : 'border-slate-600 opacity-60 grayscale'}
            ${isPlayerCards && !canPlay ? 'opacity-50' : ''}
            ${isPlayerCards && opts.isHand && canPlay ? 'hover:scale-105' : ''}`}
                >
                    {/* image */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <img
                            src={`/cards/${card.cardKey}.png`}
                            alt={card.name}
                            className="w-full h-full object-cover rounded-lg"
                            onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                if (target.src.endsWith('.png')) {
                                    target.src = `/cards/${card.cardKey}.webp`;
                                } else {
                                    target.style.display = 'none';
                                    const parent = target.parentElement;
                                    if (parent) {
                                        parent.innerHTML = `
                      <div class='absolute inset-0 bg-gradient-to-b ${getRarityColor(card.rarity)} flex flex-col items-center justify-center p-1'>
                        <div class='text-xs font-bold text-white text-center leading-tight'>${card.name}</div>
                        <div class='text-xs text-white/80 font-medium'>Lv.${card.level}</div>
                      </div>`;
                                    }
                                }
                            }}
                        />
                    </div>

                    {/* gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                    {/* level */}
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 bg-black/70 px-1.5 py-0.5 rounded-md">
                        <span className="text-xs font-bold text-white">{card.level}</span>
                    </div>

                    {/* cost */}
                    <div className="absolute top-1 left-1 w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center border border-purple-400 shadow-lg">
                        <span className="text-xs font-bold text-white">{card.cost}</span>
                    </div>

                    {/* hand pulse */}
                    {opts.isHand && (
                        <motion.div
                            className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border border-white shadow-lg"
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        />
                    )}

                    {/* next badge */}
                    {opts.isNextInCycle && (
                        <motion.div
                            className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-yellow-400 text-black text-xs font-bold rounded-sm shadow-lg"
                            animate={{ y: [0, -2, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                        >
                            NEXT
                        </motion.div>
                    )}

                    {/* playable border */}
                    {isPlayerCards && canPlay && opts.isHand && (
                        <motion.div
                            className="absolute inset-0 border-2 border-green-400 rounded-xl shadow-lg shadow-green-400/50"
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                        />
                    )}

                    {/* champion crown */}
                    {card.rarity === 'champion' && (
                        <div className="absolute top-1 right-1 w-4 h-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center border border-yellow-300 shadow-lg">
                            <Crown className="w-2.5 h-2.5 text-white" />
                        </div>
                    )}

                    {/* tooltip */}
                    <AnimatePresence>
                        <motion.div
                            className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black/90 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10 shadow-lg"
                        >
                            {card.name} ({card.cost} elixir, Lv.{card.level})
                        </motion.div>
                    </AnimatePresence>
                </div>
            </motion.div>
        );
    };

    /* ---------------- render ---------------- */
    return (
        <motion.div
            className={`bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 min-h-[300px] ${className}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
        >
            {/* header */}
            <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                    <Crown className="w-7 h-7 text-purple-400" />
                    {isPlayerCards ? 'Your Cards' : 'Opponent Analysis'}
                </h3>
                <div className="text-base text-white/60">Live Detection • {elixir.multiplier}x Speed</div>
            </div>

            {/* Game Timer */}
            <GameTimerDisplay
                timer={gameTimer}
                onResetTimer={gameTimer.resetTimer}
                onResetElixir={handleResetElixir}
            />

            {/* elixir bar */}
            <div className="mb-10">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-lg font-medium text-white/80 flex items-center gap-3">
                        <Zap className="w-6 h-6 text-purple-400" /> Elixir
                    </span>
                    <span className="text-lg font-bold text-purple-300">
                        {elixir.current.toFixed(1)}/{elixir.max}
                    </span>
                </div>
                <div className="relative">
                    <div className="h-6 bg-gradient-to-r from-slate-700 to-slate-800 rounded-full border border-slate-600 overflow-hidden">
                        <motion.div
                            className={`h-full shadow-lg relative overflow-hidden ${elixir.multiplier === 3 ? 'bg-gradient-to-r from-red-500 via-red-400 to-orange-400' :
                                elixir.multiplier === 2 ? 'bg-gradient-to-r from-orange-500 via-orange-400 to-yellow-400' :
                                    'bg-gradient-to-r from-purple-500 via-purple-400 to-pink-400'
                                }`}
                            style={{ width: `${elixirPercentage}%` }}
                            transition={{
                                duration: isElixirSpending ? 0 : 0.1, // Instant when spending, smooth when regenerating
                                ease: isElixirSpending ? 'linear' : 'easeOut'
                            }}
                        >
                            <motion.div
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                                animate={{ x: [-100, 200] }}
                                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                            />
                        </motion.div>
                    </div>
                    <div className="absolute inset-0 flex justify-between items-center px-1">
                        {[...Array(elixir.max)].map((_, i) => (
                            <div key={i} className="w-px h-4 bg-slate-600" style={{ opacity: i === 0 || i === elixir.max - 1 ? 0 : 0.7 }} />
                        ))}
                    </div>
                </div>
            </div>

            {/* legend */}
            <div className="flex items-center justify-between mb-6">
                <span className="text-lg font-medium text-white/80">
                    {isPlayerCards ? 'Your Hand' : 'Opponent Cards'}
                </span>
                <div className="flex items-center gap-4">
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-base text-green-400">In Hand</span>
                    {!isPlayerCards && (
                        <>
                            <div className="w-3 h-3 bg-yellow-400 rounded-full ml-4" />
                            <span className="text-base text-yellow-400">Next</span>
                        </>
                    )}
                </div>
            </div>

            {/* card rows */}
            <div className="space-y-4">
                {/* hand row */}
                <div className="grid grid-cols-4 gap-5">
                    {handCards.map((card, idx) => renderCard(card, { index: idx, isHand: true, isNextInCycle: false }))}
                </div>
                {/* cycle row */}
                <div className="grid grid-cols-4 gap-5">
                    {cycleCards.map((card, idx) =>
                        renderCard(card, {
                            index: idx + 4,
                            isHand: false,
                            isNextInCycle: !isPlayerCards && idx === 0,
                        })
                    )}
                </div>
            </div>

            {/* footer for player */}
            {isPlayerCards && (
                <div className="mt-6 text-base text-white/60 text-center space-y-2">
                    <div>
                        Next Card: <span className="text-yellow-400 font-semibold">{cardCycle.nextCard.name}</span> •{' '}
                        <span className={elixir.isRegenerating ? 'text-green-400' : 'text-red-400'}>
                            Elixir {elixir.isRegenerating ? 'Regenerating' : 'Paused'}
                        </span>
                    </div>
                    <div className="text-white/40">Click any card in hand to play • Cards cycle through your 8‑card deck</div>
                </div>
            )}
        </motion.div>
    );
};

export default ElixirAndCardsEnhanced;