import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap, Crown, Swords, Clock } from 'lucide-react';

interface ElixirAndCardsProps {
    isConnected: boolean;
}

// Placeholder card data - you can replace with actual card data later
const PLACEHOLDER_CARDS = [
    { id: 1, name: 'Knight', cost: 3, rarity: 'common' },
    { id: 2, name: 'Arrows', cost: 3, rarity: 'common' },
    { id: 3, name: 'Giant', cost: 5, rarity: 'rare' },
    { id: 4, name: 'Wizard', cost: 5, rarity: 'rare' },
    { id: 5, name: 'Fireball', cost: 4, rarity: 'rare' },
    { id: 6, name: 'Minion Horde', cost: 5, rarity: 'common' },
    { id: 7, name: 'Hog Rider', cost: 4, rarity: 'rare' },
    { id: 8, name: 'Baby Dragon', cost: 4, rarity: 'epic' }
];

const getRarityColor = (rarity: string) => {
    switch (rarity) {
        case 'common': return 'from-gray-600 to-gray-700 border-gray-500';
        case 'rare': return 'from-orange-600 to-orange-700 border-orange-500';
        case 'epic': return 'from-purple-600 to-purple-700 border-purple-500';
        case 'legendary': return 'from-yellow-600 to-yellow-700 border-yellow-500';
        default: return 'from-gray-600 to-gray-700 border-gray-500';
    }
};

const ElixirBar: React.FC<{ currentElixir: number; maxElixir: number; label: string }> = ({
    currentElixir,
    maxElixir,
    label
}) => {
    const percentage = (currentElixir / maxElixir) * 100;

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-white/80 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-pink-400" />
                    {label}
                </span>
                <span className="text-xs font-bold text-white">
                    {currentElixir.toFixed(1)}/{maxElixir}
                </span>
            </div>

            <div className="relative h-3 bg-slate-700/60 rounded-full overflow-hidden border border-slate-600/50">
                <motion.div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full"
                    style={{ width: `${percentage}%` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                />

                {/* Elixir segments */}
                <div className="absolute inset-0 flex">
                    {Array.from({ length: maxElixir }, (_, i) => (
                        <div
                            key={i}
                            className="flex-1 border-r border-slate-600/30 last:border-r-0"
                        />
                    ))}
                </div>

                {/* Glowing effect when near full */}
                {percentage > 80 && (
                    <motion.div
                        className="absolute inset-0 bg-pink-400/20 rounded-full"
                        animate={{ opacity: [0.2, 0.6, 0.2] }}
                        transition={{ duration: 1, repeat: Infinity }}
                    />
                )}
            </div>
        </div>
    );
};

const CardSlot: React.FC<{
    card: typeof PLACEHOLDER_CARDS[0] | null;
    isAvailable: boolean;
    index: number;
    isOpponent?: boolean;
}> = ({ card, isAvailable, index, isOpponent = false }) => {
    if (!card) {
        return (
            <div className="aspect-[2/3] bg-slate-700/40 border-2 border-dashed border-slate-600/40 rounded-lg flex items-center justify-center">
                <div className="text-xs text-white/30">Empty</div>
            </div>
        );
    }

    return (
        <motion.div
            className={`
        aspect-[2/3] relative rounded-lg overflow-hidden border-2 transition-all duration-300
        ${isAvailable
                    ? `bg-gradient-to-b ${getRarityColor(card.rarity)} shadow-lg`
                    : 'bg-slate-700/60 border-slate-600/60 grayscale opacity-60'
                }
        ${!isOpponent && isAvailable ? 'hover:scale-105 cursor-pointer' : ''}
      `}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            whileHover={!isOpponent && isAvailable ? { scale: 1.05 } : {}}
        >
            {/* Card Background */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />

            {/* Card Content */}
            <div className="relative h-full flex flex-col justify-between p-2">
                {/* Elixir Cost */}
                <div className="flex justify-between items-start">
                    <div className={`
            w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
            ${isAvailable ? 'bg-pink-500 text-white' : 'bg-slate-600 text-slate-400'}
          `}>
                        {card.cost}
                    </div>
                    {!isOpponent && isAvailable && (
                        <motion.div
                            className="w-2 h-2 bg-green-400 rounded-full"
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                        />
                    )}
                </div>

                {/* Card Name */}
                <div className="text-center">
                    <div className={`text-xs font-bold ${isAvailable ? 'text-white' : 'text-slate-400'}`}>
                        {card.name}
                    </div>
                </div>
            </div>

            {/* Availability Overlay */}
            {!isAvailable && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="text-xs text-white/60 font-medium">Not Ready</div>
                </div>
            )}

            {/* Selection Glow for Available Cards */}
            {!isOpponent && isAvailable && (
                <motion.div
                    className="absolute inset-0 border-2 border-green-400/50 rounded-lg"
                    animate={{ opacity: [0.3, 0.7, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                />
            )}
        </motion.div>
    );
};

const ElixirAndCards: React.FC<ElixirAndCardsProps> = ({ isConnected }) => {
    const [opponentElixir, setOpponentElixir] = useState(3.0);
    const [gameTime, setGameTime] = useState(180); // 3 minutes in seconds

    // Simulate elixir generation (normal game speed: +1 elixir per 2.8 seconds)
    useEffect(() => {
        if (!isConnected) return;

        const interval = setInterval(() => {
            setOpponentElixir(prev => Math.min(10, prev + (1 / 2.8)));
        }, 1000);

        return () => clearInterval(interval);
    }, [isConnected]);

    // Game timer countdown
    useEffect(() => {
        if (!isConnected) return;

        const interval = setInterval(() => {
            setGameTime(prev => {
                if (prev <= 0) {
                    return 180; // Reset to 3 minutes when it reaches 0
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [isConnected]);

    // Format time as MM:SS
    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    const availableOpponentCards = [0, 2, 4, 6]; // Example pattern for opponent

    if (!isConnected) {
        return (
            <motion.div
                className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Swords className="w-5 h-5 text-purple-400/50" />
                        <h3 className="text-lg font-bold text-white/50">Battle Deck</h3>
                    </div>

                    {/* Placeholder Timer */}
                    <div className="flex items-center gap-2 bg-slate-700/20 px-4 py-2 rounded-lg border border-slate-600/20">
                        <div className="w-3 h-3 rounded-full bg-slate-500/50" />
                        <span className="text-xl font-bold font-mono text-white/50">--:--</span>
                        <span className="text-xs text-white/40">WAITING</span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-white/40">
                        <Crown className="w-4 h-4" />
                        Disconnected
                    </div>
                </div>

                <div className="flex items-center justify-center h-32 text-white/50">
                    <div className="text-center">
                        <Swords className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm font-medium">Connect to view battle deck</p>
                    </div>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Swords className="w-5 h-5 text-purple-400" />
                        <h3 className="text-lg font-bold text-white">Battle Deck</h3>
                    </div>

                    {/* Game Timer in the middle */}
                    <div className="flex items-center gap-2 bg-slate-700/40 px-4 py-2 rounded-lg border border-slate-600/30">
                        <motion.div
                            className={`w-3 h-3 rounded-full ${gameTime <= 30 ? 'bg-red-500' : gameTime <= 60 ? 'bg-yellow-500' : 'bg-green-500'
                                }`}
                            animate={{
                                scale: gameTime <= 30 ? [1, 1.2, 1] : 1,
                                opacity: gameTime <= 10 ? [1, 0.5, 1] : 1
                            }}
                            transition={{
                                duration: gameTime <= 30 ? 0.8 : 0,
                                repeat: gameTime <= 30 ? Infinity : 0
                            }}
                        />
                        <span className={`text-xl font-bold font-mono ${gameTime <= 30 ? 'text-red-400' : gameTime <= 60 ? 'text-yellow-400' : 'text-white'
                            }`}>
                            {formatTime(gameTime)}
                        </span>
                        <span className="text-xs text-white/60">
                            {gameTime <= 60 ? 'OVERTIME' : 'MATCH TIME'}
                        </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-white/60">
                        <Crown className="w-4 h-4" />
                        Live Match Data
                    </div>
                </div>

                {/* Opponent Section */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-red-400">Opponent</h4>
                        <div className="text-xs text-white/60">4/8 cards ready</div>
                    </div>

                    <ElixirBar
                        currentElixir={opponentElixir}
                        maxElixir={10}
                        label="Opponent Elixir"
                    />

                    <div className="grid grid-cols-8 gap-2">
                        {PLACEHOLDER_CARDS.map((card, index) => (
                            <CardSlot
                                key={`opponent-${card.id}`}
                                card={card}
                                isAvailable={availableOpponentCards.includes(index)}
                                index={index}
                                isOpponent={true}
                            />
                        ))}
                    </div>
                </div>

                {/* Divider */}
                <div className="border-t border-slate-600/30" />

                {/* Status Indicators */}
                <div className="flex items-center justify-between text-xs text-white/50">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                            Real-time sync
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-blue-400 rounded-full" />
                            Auto-tracking
                        </div>
                        <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-purple-400" />
                            <span className={gameTime <= 30 ? 'text-red-400' : 'text-white/50'}>
                                {gameTime <= 60 ? 'Overtime phase' : 'Regular time'}
                            </span>
                        </div>
                    </div>
                    <div>
                        Next elixir in 2.8s
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default ElixirAndCards;