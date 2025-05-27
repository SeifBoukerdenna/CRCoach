import React from "react";
import { motion } from "framer-motion";

/**
 * Gold-rimmed Clash-Royale-ish spinner
 */
const LoadingSpinner: React.FC<{ size?: number }> = ({ size = 64 }) => (
    <motion.div
        className="rounded-full border-4 border-cr-gold/80 border-t-transparent"
        style={{ width: size, height: size }}
        animate={{ rotate: 360 }}
        transition={{ ease: "linear", repeat: Infinity, duration: 1 }}
    />
);

export default LoadingSpinner;
