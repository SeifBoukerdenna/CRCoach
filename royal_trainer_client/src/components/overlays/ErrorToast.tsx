import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ErrorInfo {
    message: string;
    timestamp: Date;
}

interface Props {
    error: ErrorInfo | null;
}

const ErrorToast: React.FC<Props> = ({ error }) => (
    <AnimatePresence>
        {error && (
            <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 50, scale: 0.9 }}
                className="fixed bottom-6 right-6 bg-gradient-to-r from-red-600 to-red-700 backdrop-blur-xl border border-red-500/50 rounded-2xl p-6 shadow-2xl max-w-md z-[9995]"
            >
                <div className="text-white">
                    <div className="font-bold text-lg mb-2">Connection Error</div>
                    <div className="text-red-100">{error.message}</div>
                    <div className="text-xs text-red-200 mt-2">
                        {error.timestamp.toLocaleTimeString()}
                    </div>
                </div>
            </motion.div>
        )}
    </AnimatePresence>
);

export default ErrorToast;
