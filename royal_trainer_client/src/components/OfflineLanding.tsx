import { motion } from "framer-motion";
import type { ConnectionState } from "../types";
import ConnectionSection from "./ConnectionSection";
import BetaBanner from "./BetaBanner";
import WatermarkSettings from "./WatermarkSettings";

/* ── OFFLINE LANDING PAGE ─────────────────────────────────────────── */
interface OfflineProps {
  sessionCode: string;
  onSessionCodeChange: (s: string) => void;
  connectionState: ConnectionState;
  onConnect: () => void;
  onDisconnect: () => void;
  isConnecting: boolean;
  connectionError: any;
  sessionStatus?: any;
  isCheckingSession?: boolean;
  onCheckSessionStatus?: (code: string) => Promise<any>;
}

const OfflineLanding: React.FC<OfflineProps> = ({
  sessionCode,
  onSessionCodeChange,
  connectionState,
  onConnect,
  onDisconnect,
  isConnecting,
  connectionError,
  sessionStatus,
  isCheckingSession,
  onCheckSessionStatus,
}) => (
  <motion.div
    key="offline"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.2 }}
    className="h-full flex items-center justify-center"
  >
    <div className="max-w-6xl mx-auto px-6 text-center">
      {/* HERO TITLE */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-6"
      >
        <h2 className="text-5xl font-black bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
          AI-Powered Analysis&nbsp;
        </h2>
      </motion.div>

      {/* JOIN WAIT-LIST BUTTON */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="mb-12"
      >
        <motion.button
          onClick={() => window.open("https://discord.gg/JgHENWpxjm", "_blank")}
          className="group relative px-8 py-4 rounded-2xl font-bold text-lg
               bg-gradient-to-br from-purple-600 via-pink-500 to-orange-500
               hover:from-purple-500 hover:via-pink-400 hover:to-orange-400
               text-white shadow-xl
               transition-all duration-300 ease-out
               hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/30
               focus:outline-none focus:ring-4 focus:ring-purple-300/50
               border border-white/20 backdrop-blur-sm"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
        >
          {/* Glass morphism overlay */}
          <div className="absolute inset-0 bg-white/10 rounded-2xl backdrop-blur-sm" />

          {/* Button content */}
          <div className="relative flex items-center gap-3">
            <span className="text-yellow-300">👑</span>
            <span className="bg-gradient-to-r from-white to-yellow-100 bg-clip-text text-transparent">
              Join Wait-List
            </span>
            <span className="text-yellow-300">✨</span>
          </div>
        </motion.button>
      </motion.div>


      {/* 2-COLUMN GRID (connection left, banner right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
        {/* LEFT – CONNECTION CARD */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <ConnectionSection
            sessionCode={sessionCode}
            onSessionCodeChange={onSessionCodeChange}
            connectionState={connectionState}
            onConnect={onConnect}
            onDisconnect={onDisconnect}
            isConnecting={isConnecting}
            connectionError={connectionError}
            sessionStatus={sessionStatus}
            isCheckingSession={isCheckingSession}
            onCheckSessionStatus={onCheckSessionStatus}
          />
        </motion.div>

        {/* RIGHT – CONFIDENTIAL BANNER */}
        <BetaBanner />
      </div>

      {/* WATERMARK SETTINGS PANEL */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.8 }}
        className="mb-12 flex justify-center"
      >
        <div className="bg-gradient-to-br from-red-900/50 to-purple-900/50 backdrop-blur-xl border border-red-500/30 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            🛡️ Security&nbsp;&amp;&nbsp;Protection
          </h3>
          <div className="flex justify-center">
            <WatermarkSettings />
          </div>
          <p className="text-white/70 text-sm mt-4 max-w-md">
            Configure anti-piracy watermarks and security settings. These measures help protect the
            confidential nature of this beta software.
          </p>
        </div>
      </motion.div>
    </div>
  </motion.div>
);

export default OfflineLanding;
