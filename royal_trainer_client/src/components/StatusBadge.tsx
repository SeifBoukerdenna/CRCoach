import React from 'react';
import { motion } from 'framer-motion';
import type { LucideProps } from 'lucide-react';

interface StatusBadgeProps {
    icon: React.ComponentType<LucideProps>;
    text: string;
    variant: 'offline' | 'connecting' | 'live' | 'inference' | 'info';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ icon: Icon, text, variant }) => {
    const getVariantStyles = () => {
        switch (variant) {
            case 'offline':
                return {
                    bg: 'bg-gradient-to-r from-gray-700 to-gray-800',
                    border: 'border-gray-600',
                    text: 'text-gray-300',
                    shadow: 'shadow-gray-900/50',
                    glow: ''
                };
            case 'connecting':
                return {
                    bg: 'bg-gradient-to-r from-orange-600 to-red-600',
                    border: 'border-orange-500',
                    text: 'text-white',
                    shadow: 'shadow-orange-900/50',
                    glow: 'shadow-orange-500/25'
                };
            case 'live':
                return {
                    bg: 'bg-gradient-to-r from-red-600 to-red-700',
                    border: 'border-red-500',
                    text: 'text-white',
                    shadow: 'shadow-red-900/50',
                    glow: 'shadow-red-500/25'
                };
            case 'inference':
                return {
                    bg: 'bg-gradient-to-r from-purple-600 to-blue-600',
                    border: 'border-purple-500',
                    text: 'text-white',
                    shadow: 'shadow-purple-900/50',
                    glow: 'shadow-purple-500/25'
                };
            case 'info':
                return {
                    bg: 'bg-gradient-to-r from-blue-800 to-slate-800',
                    border: 'border-blue-600',
                    text: 'text-blue-200',
                    shadow: 'shadow-blue-900/50',
                    glow: 'shadow-blue-500/25'
                };
            default:
                return {
                    bg: 'bg-gradient-to-r from-gray-700 to-gray-800',
                    border: 'border-gray-600',
                    text: 'text-gray-300',
                    shadow: 'shadow-gray-900/50',
                    glow: ''
                };
        }
    };

    const styles = getVariantStyles();
    const isAnimated = variant === 'connecting' || variant === 'live' || variant === 'inference';

    return (
        <motion.div
            className={`
                inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 font-bold text-sm uppercase tracking-wider
                backdrop-blur-xl shadow-lg
                ${styles.bg} ${styles.border} ${styles.text} ${styles.shadow}
                ${isAnimated ? `animate-pulse ${styles.glow}` : ''}
            `}
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            whileHover={{
                scale: 1.05,
                y: -2,
                boxShadow: isAnimated ? `0 20px 40px ${styles.glow}` : '0 10px 30px rgba(0,0,0,0.3)'
            }}
            transition={{
                type: "spring",
                stiffness: 300,
                damping: 30,
                duration: 0.3
            }}
        >
            <motion.div
                animate={isAnimated ? {
                    scale: [1, 1.2, 1],
                    rotate: variant === 'connecting' ? [0, 360] : [0, 10, -10, 0]
                } : {}}
                transition={isAnimated ? {
                    duration: variant === 'connecting' ? 2 : 3,
                    repeat: Infinity,
                    ease: variant === 'connecting' ? "linear" : "easeInOut"
                } : {}}
            >
                <Icon className="w-5 h-5" />
            </motion.div>

            <span className="font-black tracking-wider">
                {text}
            </span>

            {/* Additional visual effects for certain variants */}
            {variant === 'live' && (
                <motion.div
                    className="w-3 h-3 bg-red-400 rounded-full"
                    animate={{
                        scale: [1, 1.3, 1],
                        opacity: [1, 0.7, 1]
                    }}
                    transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />
            )}

            {variant === 'inference' && (
                <motion.div
                    className="flex gap-1"
                >
                    {[0, 1, 2].map((i) => (
                        <motion.div
                            key={i}
                            className="w-1 h-4 bg-current rounded-full"
                            animate={{
                                scaleY: [1, 2, 1],
                                opacity: [0.5, 1, 0.5]
                            }}
                            transition={{
                                duration: 1,
                                repeat: Infinity,
                                delay: i * 0.2,
                                ease: "easeInOut"
                            }}
                        />
                    ))}
                </motion.div>
            )}

            {variant === 'connecting' && (
                <motion.div
                    className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear"
                    }}
                />
            )}
        </motion.div>
    );
};

export default StatusBadge;