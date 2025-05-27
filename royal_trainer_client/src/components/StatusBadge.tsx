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
                backdrop-blur-xl shadow-lg transition-all duration-150
                ${styles.bg} ${styles.border} ${styles.text} ${styles.shadow}
                ${isAnimated ? `animate-pulse ${styles.glow}` : ''}
            `}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.15 }}
        >
            <div>
                <Icon className="w-4 h-4" />
            </div>

            <span className="font-black tracking-wider">
                {text}
            </span>

            {/* Simplified visual effects */}
            {variant === 'live' && (
                <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse" />
            )}

            {variant === 'inference' && (
                <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                        <div
                            key={i}
                            className="w-1 h-4 bg-current rounded-full animate-pulse"
                            style={{
                                animationDelay: `${i * 0.2}s`
                            }}
                        />
                    ))}
                </div>
            )}

            {variant === 'connecting' && (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            )}
        </motion.div>
    );
};

export default StatusBadge;