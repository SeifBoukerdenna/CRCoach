import React from 'react';
import { motion } from 'framer-motion';

/* ── CONFIDENTIAL BETA BANNER ─────────────────────────────────────── */
const BetaBanner: React.FC = () => (
    <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="h-full flex items-stretch"
    >
        <div className="flex-1 bg-red-900/30 border border-red-500/50 rounded-xl p-4 flex flex-col justify-center">
            <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-red-300 font-bold">CONFIDENTIAL&nbsp;BETA&nbsp;SOFTWARE</span>
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            </div>
            <p className="text-red-200 text-sm mb-2 text-center">
                This software is protected by anti-piracy measures. All usage is monitored and logged.
                Unauthorized distribution is strictly prohibited.
            </p>
            <div className="bg-orange-900/40 border border-orange-500/40 rounded-lg p-2">
                <p className="text-orange-200 text-xs font-bold text-center">
                    ⚠️ SINGLE VIEWER LIMIT: Only one viewer per broadcast session allowed
                </p>
            </div>
        </div>
    </motion.div>
);

export default BetaBanner;