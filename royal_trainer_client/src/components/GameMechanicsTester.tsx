// royal_trainer_client/src/components/GameMechanicsTester.tsx - Enhanced with Champion support

import React from 'react';
import { motion } from 'framer-motion';
import {
    Zap,
    RotateCcw,
    Play,
    Pause,
    Plus,
    Crown,
    Timer,
    Target,
    Info,
    Sword,
    Skull
} from 'lucide-react';
import { useElixirBar, type ElixirMultiplier } from '../hooks/useElixirBar';
import { useCardCycle, type Card } from '../hooks/useCardCycle';

const GameMechanicsTester: React.FC = () => {
    const elixir = useElixirBar(5);
    const cardCycle = useCardCycle();

    // Handle card play
    const handlePlayCard = (card: Card) => {
        console.log(`🎯 Attempting to play ${card.name} (${card.cost} elixir)`);
        console.log(`📊 Current elixir: ${elixir.current.toFixed(1)}`);

        // Check if we can afford it BEFORE spending
        const canAfford = elixir.current >= card.cost;
        console.log(`🔍 Can afford? ${canAfford ? 'YES' : 'NO'}`);

        if (!canAfford) {
            console.log(`❌ Not enough elixir to play ${card.name} (need ${card.cost}, have ${elixir.current.toFixed(1)})`);
            return;
        }

        // We can afford it, so spend the elixir
        elixir.spendElixir(card.cost);
        console.log(`✅ Elixir spent successfully!`);

        // Play the card
        const playedCard = cardCycle.playCard(card.id);
        if (playedCard) {
            if (playedCard.rarity === "champion") {
                console.log(`🏆 Champion ${playedCard.name} deployed and ready for battle!`);
            } else {
                console.log(`✅ Card ${playedCard.name} played and moved to back of cycle`);
            }
        } else {
            console.log(`❌ Failed to play card: ${card.name}`);
        }

        console.log(`📊 New elixir: ${elixir.current.toFixed(1)}`);
        console.log(`---`);
    };

    // Handle champion ability
    const handleChampionAbility = () => {
        const abilityCost = cardCycle.championState.abilityCost;
        console.log(`⚡ Attempting to use ${cardCycle.championState.activeChampion?.name} ability (${abilityCost} elixir)`);

        if (elixir.current < abilityCost) {
            console.log(`❌ Not enough elixir for ability (need ${abilityCost}, have ${elixir.current.toFixed(1)})`);
            return;
        }

        // Spend elixir for ability
        elixir.spendElixir(abilityCost);
        const success = cardCycle.playChampionAbility();

        if (success) {
            console.log(`⚡ ${cardCycle.championState.activeChampion?.name} ability activated!`);
        } else {
            console.log(`❌ Failed to activate ability`);
        }
    };

    // Handle champion death
    const handleKillChampion = () => {
        console.log(`💀 Killing champion ${cardCycle.championState.activeChampion?.name}`);
        cardCycle.killChampion();
    };

    // Get rarity colors including champion
    const getRarityColor = (rarity: string) => {
        switch (rarity) {
            case 'common': return 'from-gray-500 to-gray-700';
            case 'rare': return 'from-orange-500 to-orange-700';
            case 'epic': return 'from-purple-500 to-purple-700';
            case 'legendary': return 'from-yellow-400 to-yellow-600';
            case 'champion': return 'from-red-500 via-pink-500 to-purple-600';
            default: return 'from-gray-500 to-gray-700';
        }
    };

    const getRarityBorderColor = (rarity: string) => {
        switch (rarity) {
            case 'common': return 'border-gray-400';
            case 'rare': return 'border-orange-400';
            case 'epic': return 'border-purple-400';
            case 'legendary': return 'border-yellow-400';
            case 'champion': return 'border-red-400';
            default: return 'border-gray-400';
        }
    };

    const elixirPercentage = (elixir.current / elixir.max) * 100;

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-8">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-4"
            >
                <h2 className="text-3xl font-black bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent mb-2">
                    🎮 Game Mechanics Tester
                </h2>
                <p className="text-white/60 mb-2">
                    Test advanced elixir regeneration, card cycling, and champion mechanics
                </p>
                <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-3 max-w-4xl mx-auto">
                    <p className="text-sm text-blue-200">
                        ⚡ <strong>Elixir:</strong> Regenerates at real CR rates (2.8s per elixir, affected by 2x/3x multipliers)<br />
                        🃏 <strong>Cards:</strong> 4 cards in hand + 4 in cycle queue. Play any hand card → goes to back of 8-card cycle → next queued card enters hand<br />
                        🏆 <strong>Champions:</strong> When deployed, hand becomes 3 cards. Use ability (2 elixir) or kill champion to return to normal cycle
                    </p>
                </div>
            </motion.div>

            {/* Controls Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Elixir Controls */}
                <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-xl p-4"
                >
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Zap className="w-5 h-5 text-purple-400" />
                        Elixir Controls
                    </h3>

                    <div className="space-y-3">
                        {/* Multiplier Buttons */}
                        <div>
                            <p className="text-sm text-white/70 mb-2">Elixir Speed:</p>
                            <div className="flex gap-2">
                                {([1, 2, 3] as ElixirMultiplier[]).map(mult => (
                                    <button
                                        key={mult}
                                        onClick={() => elixir.setMultiplier(mult)}
                                        className={`px-3 py-1 rounded-lg text-sm font-semibold transition-all ${elixir.multiplier === mult
                                            ? 'bg-purple-500 text-white'
                                            : 'bg-slate-700 text-white/70 hover:bg-slate-600'
                                            }`}
                                    >
                                        {mult}x
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                            <button
                                onClick={elixir.isRegenerating ? elixir.pauseRegeneration : elixir.resumeRegeneration}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-semibold transition-all"
                            >
                                {elixir.isRegenerating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                {elixir.isRegenerating ? 'Pause' : 'Resume'}
                            </button>
                            <button
                                onClick={elixir.resetElixir}
                                className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-sm font-semibold transition-all"
                            >
                                <RotateCcw className="w-4 h-4" />
                                Reset
                            </button>
                        </div>

                        <button
                            onClick={() => elixir.addElixir(2)}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-semibold transition-all"
                        >
                            <Plus className="w-4 h-4" />
                            +2 Elixir
                        </button>
                    </div>
                </motion.div>

                {/* Champion Controls */}
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-xl p-4"
                >
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Crown className="w-5 h-5 text-red-400" />
                        Champion Controls
                    </h3>

                    {cardCycle.championState.isChampionDeployed ? (
                        <div className="space-y-3">
                            <div className="text-sm text-white/70">
                                <p>Active: <span className="text-red-400 font-semibold">{cardCycle.championState.activeChampion?.name}</span></p>
                                <p>Cycle Queue: <span className="text-blue-400">3 cards</span> (champion on field)</p>
                                <p className="text-xs text-white/50 mt-1">🏆 Champion mechanics active!</p>
                            </div>

                            <div className="space-y-2">
                                <button
                                    onClick={handleChampionAbility}
                                    disabled={!cardCycle.championState.canUseAbility || elixir.current < cardCycle.championState.abilityCost}
                                    className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${cardCycle.championState.canUseAbility && elixir.current >= cardCycle.championState.abilityCost
                                        ? 'bg-red-600 hover:bg-red-700'
                                        : 'bg-gray-600 opacity-50 cursor-not-allowed'
                                        }`}
                                >
                                    <Sword className="w-4 h-4" />
                                    Use Ability ({cardCycle.championState.abilityCost} elixir)
                                </button>

                                <button
                                    onClick={handleKillChampion}
                                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-semibold transition-all"
                                >
                                    <Skull className="w-4 h-4" />
                                    Kill Champion
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="text-sm text-white/70">
                                <p>Status: <span className="text-green-400 font-semibold">Normal Cycle</span></p>
                                <p>Cycle Queue: <span className="text-blue-400">4 cards</span></p>
                                <p className="text-xs text-white/50 mt-1">🃏 Deploy a champion to activate special mechanics</p>
                            </div>

                            <div className="text-center py-4">
                                <div className="text-white/40 text-sm">No champion deployed</div>
                            </div>
                        </div>
                    )}
                </motion.div>

                {/* Stats */}
                <motion.div
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-xl p-4"
                >
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Info className="w-5 h-5 text-green-400" />
                        Live Stats
                    </h3>

                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-white/70">Current Elixir:</span>
                            <span className="text-purple-400 font-bold">{elixir.current.toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-white/70">Speed:</span>
                            <span className="text-blue-400 font-bold">{elixir.multiplier}x</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-white/70">Regenerating:</span>
                            <span className={`font-bold ${elixir.isRegenerating ? 'text-green-400' : 'text-red-400'}`}>
                                {elixir.isRegenerating ? 'Yes' : 'No'}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-white/70">Cards in Hand:</span>
                            <span className="text-yellow-400 font-bold">
                                {cardCycle.hand.length}/4
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-white/70">Cycle Queue:</span>
                            <span className="text-blue-400 font-bold">
                                {cardCycle.cycleQueue.length}/{cardCycle.championState.isChampionDeployed ? 3 : 4}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-white/70">Champion:</span>
                            <span className={`font-bold ${cardCycle.championState.isChampionDeployed ? 'text-red-400' : 'text-gray-500'}`}>
                                {cardCycle.championState.isChampionDeployed ? 'Active' : 'None'}
                            </span>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Elixir Bar */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6"
            >
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Zap className="w-6 h-6 text-purple-400" />
                        Elixir Bar ({elixir.multiplier}x Speed)
                    </h3>
                    <div className="text-lg font-bold text-purple-300">
                        {elixir.current.toFixed(1)}/{elixir.max}
                    </div>
                </div>

                <div className="relative h-6">
                    <div className="h-full bg-gradient-to-r from-slate-700 to-slate-800 rounded-full border border-slate-600 overflow-hidden">
                        <motion.div
                            className="h-full bg-gradient-to-r from-purple-500 via-purple-400 to-pink-400 shadow-lg relative overflow-hidden"
                            style={{ width: `${elixirPercentage}%` }}
                            transition={{ duration: 0.1 }}
                        >
                            <motion.div
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                                animate={{ x: [-100, 200] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            />
                        </motion.div>
                    </div>

                    <div className="absolute inset-0 flex justify-between items-center px-2">
                        {[...Array(elixir.max)].map((_, i) => (
                            <div
                                key={i}
                                className="w-px h-3 bg-slate-500"
                                style={{ opacity: i === 0 || i === elixir.max - 1 ? 0 : 0.8 }}
                            />
                        ))}
                    </div>
                </div>
            </motion.div>

            {/* Card Hand */}
            <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6"
            >
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Target className="w-6 h-6 text-yellow-400" />
                        Current Hand (4 Cards)
                    </h3>
                    <div className="text-sm text-white/60">
                        {cardCycle.championState.isChampionDeployed ? (
                            <div>
                                <div className="text-red-400 font-semibold">🏆 {cardCycle.championState.activeChampion?.name} Active</div>
                                <div className="text-xs text-white/40 mt-1">
                                    Champion on field - cycle queue reduced to 3 cards
                                </div>
                            </div>
                        ) : (
                            <div>
                                Next: <span className="text-yellow-400 font-semibold">{cardCycle.nextCard?.name || 'None'}</span>
                                <div className="text-xs text-white/40 mt-1">
                                    Play any card from hand → cycles to back → next card enters hand
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                    {cardCycle.hand.map((card, index) => {
                        const canPlay = cardCycle.isCardPlayable(card.id, elixir.current);

                        return (
                            <motion.div
                                key={`${card.id}-${index}`}
                                className="relative group"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <button
                                    onClick={() => handlePlayCard(card)}
                                    disabled={!canPlay}
                                    className={`
                                        w-full aspect-[3/4] rounded-xl border-2 overflow-hidden transition-all duration-200
                                        ${canPlay
                                            ? `${getRarityBorderColor(card.rarity)} bg-gradient-to-b ${getRarityColor(card.rarity)} hover:shadow-lg cursor-pointer`
                                            : 'border-slate-600 bg-gradient-to-b from-slate-700 to-slate-800 opacity-50 cursor-not-allowed'
                                        }
                                    `}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-black/30" />

                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
                                        <div className="text-sm font-bold text-white text-center leading-tight mb-1">
                                            {card.name}
                                        </div>
                                        <div className="text-xs text-white/80">
                                            Lv.{card.level}
                                        </div>
                                        {/* Champion indicator */}
                                        {card.rarity === "champion" && (
                                            <div className="text-xs text-red-300 mt-1">
                                                👑 CHAMPION
                                            </div>
                                        )}
                                        {/* Position indicator for testing */}
                                        <div className="text-xs text-white/50 mt-1">
                                            #{index + 1}
                                        </div>
                                    </div>

                                    <div className="absolute top-2 left-2 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center border border-purple-400">
                                        <span className="text-xs font-bold text-white">{card.cost}</span>
                                    </div>

                                    {canPlay && (
                                        <motion.div
                                            className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border border-white shadow-lg"
                                            animate={{ scale: [1, 1.2, 1] }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                        />
                                    )}

                                    {/* Champion special effects */}
                                    {card.rarity === "champion" && (
                                        <motion.div
                                            className="absolute inset-0 bg-red-500/20 rounded-xl"
                                            animate={{ opacity: [0.3, 0.6, 0.3] }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                        />
                                    )}
                                </button>

                                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                                    <div className="bg-black/90 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                                        {card.name} ({card.cost} elixir, Lv.{card.level}) - {card.rarity} - Position #{index + 1}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </motion.div>

            {/* Cycle Queue Preview */}
            {!cardCycle.championState.isChampionDeployed && (
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6"
                >
                    <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
                        <Timer className="w-6 h-6 text-blue-400" />
                        Cycle Queue (Next 4 Cards)
                    </h3>

                    <div className="grid grid-cols-4 gap-4">
                        {cardCycle.cycleQueue.map((card, index) => (
                            <motion.div
                                key={`queue-${card.id}-${cardCycle.getCardPosition(card.id)}`}
                                className="relative"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                layout
                            >
                                <div className={`
                                    aspect-[3/4] rounded-xl border-2 overflow-hidden opacity-70
                                    ${getRarityBorderColor(card.rarity)} bg-gradient-to-b ${getRarityColor(card.rarity)}
                                `}>
                                    <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-black/30" />

                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
                                        <div className="text-sm font-bold text-white text-center leading-tight mb-1">
                                            {card.name}
                                        </div>
                                        <div className="text-xs text-white/80">
                                            Lv.{card.level}
                                        </div>
                                        {card.rarity === "champion" && (
                                            <div className="text-xs text-red-300 mt-1">
                                                👑 CHAMPION
                                            </div>
                                        )}
                                        <div className="text-xs text-white/50 mt-1">
                                            #{index + 5}
                                        </div>
                                    </div>

                                    <div className="absolute top-2 left-2 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center border border-purple-400">
                                        <span className="text-xs font-bold text-white">{card.cost}</span>
                                    </div>

                                    {index === 0 && (
                                        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-yellow-400 text-black text-xs font-bold rounded">
                                            NEXT
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Champion Mode Queue Preview */}
            {cardCycle.championState.isChampionDeployed && (
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6"
                >
                    <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
                        <Timer className="w-6 h-6 text-red-400" />
                        Champion Mode Queue (3 Cards - Champion on Field)
                    </h3>

                    <div className="grid grid-cols-3 gap-4">
                        {cardCycle.cycleQueue.map((card, index) => (
                            <motion.div
                                key={`champion-queue-${card.id}-${index}`}
                                className="relative"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                layout
                            >
                                <div className={`
                                    aspect-[3/4] rounded-xl border-2 overflow-hidden opacity-70
                                    ${getRarityBorderColor(card.rarity)} bg-gradient-to-b ${getRarityColor(card.rarity)}
                                `}>
                                    <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-black/30" />

                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
                                        <div className="text-sm font-bold text-white text-center leading-tight mb-1">
                                            {card.name}
                                        </div>
                                        <div className="text-xs text-white/80">
                                            Lv.{card.level}
                                        </div>
                                        <div className="text-xs text-white/50 mt-1">
                                            #{index + 5}
                                        </div>
                                    </div>

                                    <div className="absolute top-2 left-2 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center border border-purple-400">
                                        <span className="text-xs font-bold text-white">{card.cost}</span>
                                    </div>

                                    {index === 0 && (
                                        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-yellow-400 text-black text-xs font-bold rounded">
                                            NEXT
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default GameMechanicsTester;