import React from 'react';
import { motion } from 'framer-motion';

const Footer: React.FC = () => (
    <motion.div
        className="mt-3 text-center text-white/30 text-xs"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
    >
        <div className="flex items-center justify-center gap-3">
            <span>🏆 Royal Trainer AI</span>
            <span>•</span>
            <span>🧠 YOLOv8 Detection</span>
            <span>•</span>
            <span>⚡ Real-time Analysis</span>
            <span>•</span>
            <span>📊 Frame History</span>
            <span>•</span>
            <span>🛡️ Anti-Piracy Protected</span>
        </div>
    </motion.div>
);

export default Footer;
