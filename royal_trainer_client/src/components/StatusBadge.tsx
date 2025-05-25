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
                return 'bg-gray-600 text-white border-gray-500';
            case 'connecting':
                return 'bg-orange-600 text-white border-orange-500 animate-pulse';
            case 'live':
                return 'bg-red-600 text-white border-red-500 animate-pulse';
            case 'inference':
                return 'bg-purple-gradient text-white border-cr-purple';
            case 'info':
                return 'bg-cr-navy/80 text-cr-gold border-cr-gold/50';
            default:
                return 'bg-gray-600 text-white border-gray-500';
        }
    };

    return (
        <motion.div
            className={`
        inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 font-bold text-sm uppercase tracking-wider shadow-lg backdrop-blur-sm
        ${getVariantStyles()}
      `}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
            <Icon className="w-4 h-4" />
            <span>{text}</span>
        </motion.div>
    );
};

export default StatusBadge;