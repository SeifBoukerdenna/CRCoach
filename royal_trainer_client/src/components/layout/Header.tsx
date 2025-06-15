import React from 'react';
import { motion } from 'framer-motion';

const Header: React.FC = () => (
    <motion.div
        className="text-center mb-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
    >
        <div className="flex items-center justify-center gap-3 mb-2">
            <div className="text-3xl">👑</div>
            <h1 className="text-2xl font-black bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-600 bg-clip-text text-transparent tracking-tight">
                Obelisk Tormentor
            </h1>
            <div className="text-xs bg-red-600/20 border border-red-500/40 rounded-full px-2 py-1 text-red-300 font-bold">
                BETA
            </div>
        </div>
    </motion.div>
);

export default Header;
