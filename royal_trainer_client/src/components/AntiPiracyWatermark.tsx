// royal_trainer_client/src/components/AntiPiracyWatermark.tsx

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Monitor, Smartphone, Globe, Clock, User, Lock, AlertTriangle } from 'lucide-react';
import { useWatermark } from '../hooks/useWatermark';

const AntiPiracyWatermark: React.FC = () => {
    const { watermarkSettings, deviceInfo } = useWatermark();
    const [positions, setPositions] = useState<Array<{ top: string; left: string; right?: string; bottom?: string; rotate: number; scale: number }>>([]);

    // Generate randomized positions to prevent easy removal
    useEffect(() => {
        const generatePositions = () => {
            const newPositions = [
                // Corner positions (fixed)
                { top: '5%', left: '5%', right: undefined, bottom: undefined, rotate: 15, scale: 0.8 },
                { top: '5%', left: '', right: '5%', bottom: undefined, rotate: -15, scale: 0.8 },
                { top: '', left: '5%', right: undefined, bottom: '5%', rotate: -15, scale: 0.8 },
                { top: '', left: '', right: '5%', bottom: '5%', rotate: 15, scale: 0.8 },

                // Center position (most visible)
                { top: '50%', left: '50%', right: undefined, bottom: undefined, rotate: 0, scale: 1.0 },

                // Random positions to make removal difficult
                { top: `${Math.random() * 30 + 20}%`, left: `${Math.random() * 30 + 20}%`, right: undefined, bottom: undefined, rotate: Math.random() * 60 - 30, scale: 0.7 },
                { top: `${Math.random() * 30 + 50}%`, left: '', right: `${Math.random() * 30 + 20}%`, bottom: undefined, rotate: Math.random() * 60 - 30, scale: 0.7 },
                { top: '', left: `${Math.random() * 40 + 30}%`, right: undefined, bottom: `${Math.random() * 30 + 20}%`, rotate: Math.random() * 60 - 30, scale: 0.6 },
            ];
            setPositions(newPositions);
        };

        generatePositions();

        // Randomize positions every 5 minutes to prevent screenshots without watermarks
        const interval = setInterval(generatePositions, 5 * 60 * 1000);

        return () => clearInterval(interval);
    }, []);

    if (!watermarkSettings.enabled) return null;

    const getSizeClasses = () => {
        switch (watermarkSettings.size) {
            case 'small': return 'text-[6px] min-w-[150px]';
            case 'large': return 'text-[10px] min-w-[250px]';
            default: return 'text-[8px] min-w-[200px]';
        }
    };

    const WatermarkCard = ({ position, index }: { position: any; index: number }) => {
        const isCenter = index === 4;
        const baseOpacity = watermarkSettings.opacity;
        const opacity = isCenter ? baseOpacity * 1.5 : baseOpacity;

        return (
            <motion.div
                key={`watermark-${index}`}
                className="fixed pointer-events-none select-none user-select-none"
                style={{
                    top: position.top,
                    left: position.left,
                    right: position.right,
                    bottom: position.bottom,
                    transform: position.left === '50%' && position.top === '50%'
                        ? `translate(-50%, -50%) rotate(${position.rotate}deg) scale(${position.scale})`
                        : `rotate(${position.rotate}deg) scale(${position.scale})`,
                    zIndex: 9999,
                    opacity,
                    fontSize: isCenter ? '12px' : '8px',
                    mixBlendMode: 'overlay' as const,
                }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity, scale: position.scale }}
                transition={{
                    delay: index * 0.1,
                    duration: 0.5,
                    type: "spring",
                    stiffness: 100
                }}
            >
                <div
                    className={`bg-black/70 backdrop-blur-sm rounded-lg p-2 border border-red-500/40 shadow-xl ${getSizeClasses()}`}
                    style={{
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                    }}
                >
                    {/* Header with warning */}
                    <div className="flex items-center gap-1 mb-1 text-red-400">
                        <Shield className="w-3 h-3 flex-shrink-0" />
                        <span className="font-bold text-[10px] tracking-wider whitespace-nowrap">
                            BETA BUILD - CONFIDENTIAL
                        </span>
                        <AlertTriangle className="w-3 h-3 flex-shrink-0 animate-pulse" />
                    </div>

                    {/* User identification */}
                    <div className="text-white space-y-0.5 font-mono leading-tight">
                        <div className="flex items-center gap-1">
                            <User className="w-2 h-2 text-purple-400 flex-shrink-0" />
                            <span className="text-purple-300 font-semibold">{deviceInfo.discordHandle}</span>
                        </div>

                        {watermarkSettings.showDeviceInfo && (
                            <>
                                <div className="flex items-center gap-1">
                                    <Monitor className="w-2 h-2 text-blue-400 flex-shrink-0" />
                                    <span className="truncate">{deviceInfo.browser} on {deviceInfo.os}</span>
                                </div>

                                <div className="flex items-center gap-1">
                                    <Smartphone className="w-2 h-2 text-green-400 flex-shrink-0" />
                                    <span className="truncate">{deviceInfo.device} • {deviceInfo.screen}</span>
                                </div>
                            </>
                        )}

                        <div className="flex items-center gap-1">
                            <Globe className="w-2 h-2 text-yellow-400 flex-shrink-0" />
                            <span className="truncate">ID: {deviceInfo.sessionId}</span>
                        </div>

                        {watermarkSettings.showTimestamp && (
                            <div className="flex items-center gap-1">
                                <Clock className="w-2 h-2 text-orange-400 flex-shrink-0" />
                                <span className="truncate text-[7px]">
                                    {new Date(deviceInfo.timestamp).toLocaleString()}
                                </span>
                            </div>
                        )}

                        {watermarkSettings.showFingerprint && (
                            <div className="flex items-center gap-1">
                                <Lock className="w-2 h-2 text-red-400 flex-shrink-0" />
                                <span className="truncate">FP: {deviceInfo.fingerprint}</span>
                            </div>
                        )}

                        {deviceInfo.ipAddress && (
                            <div className="flex items-center gap-1">
                                <Globe className="w-2 h-2 text-cyan-400 flex-shrink-0" />
                                <span className="truncate text-[7px]">IP: {deviceInfo.ipAddress}</span>
                            </div>
                        )}
                    </div>

                    {/* Warning footer */}
                    <div className="mt-1 text-[6px] text-red-300 border-t border-red-500/30 pt-1 font-bold">
                        🚫 DO NOT DISTRIBUTE • contact@royaltrainer.com
                    </div>
                </div>
            </motion.div>
        );
    };

    return (
        <>
            {/* Main watermark overlays */}
            <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
                {positions.map((position, index) => (
                    <WatermarkCard key={`main-${index}`} position={position} index={index} />
                ))}
            </div>

            {/* Animated diagonal watermarks that scroll across screen */}
            <div className="fixed inset-0 pointer-events-none z-[9998] overflow-hidden">
                {[...Array(8)].map((_, i) => (
                    <motion.div
                        key={`diagonal-${i}`}
                        className="absolute text-red-400/15 text-xs font-bold select-none whitespace-nowrap"
                        style={{
                            top: `${10 + i * 12}%`,
                            left: '-20%',
                            right: '-20%',
                            transform: `rotate(-20deg)`,
                            fontSize: '10px',
                            fontFamily: 'monospace',
                        }}
                        animate={{
                            x: [-200, window.innerWidth + 200],
                        }}
                        transition={{
                            duration: 25 + i * 3,
                            repeat: Infinity,
                            ease: 'linear',
                            delay: i * 2,
                        }}
                    >
                        {`BETA BUILD • ${deviceInfo.discordHandle} • ${deviceInfo.sessionId} • DO NOT DISTRIBUTE • CONFIDENTIAL • `.repeat(5)}
                    </motion.div>
                ))}
            </div>

            {/* Pulsing corner indicators */}
            {[
                { top: '10px', left: '10px' },
                { top: '10px', right: '10px' },
                { bottom: '10px', left: '10px' },
                { bottom: '10px', right: '10px' },
            ].map((pos, i) => (
                <motion.div
                    key={`indicator-${i}`}
                    className="fixed z-[9999] pointer-events-none"
                    style={pos}
                    animate={{
                        opacity: [0.3, 0.7, 0.3],
                        scale: [1, 1.2, 1],
                    }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        delay: i * 0.5,
                    }}
                >
                    <div className="w-3 h-3 bg-red-500/50 rounded-full border border-red-400" />
                </motion.div>
            ))}

            {/* Background pattern overlay */}
            <div
                className="fixed inset-0 pointer-events-none z-[9997]"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ff0000' fill-opacity='0.03'%3E%3Ctext x='10' y='30' font-family='monospace' font-size='8'%3E${deviceInfo.sessionId}%3C/text%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    backgroundSize: '60px 60px',
                    opacity: 0.1,
                }}
            />

            {/* Anti-screenshot protection - flashing elements */}
            {watermarkSettings.enabled && (
                <div className="fixed inset-0 pointer-events-none z-[9996]">
                    {[...Array(20)].map((_, i) => (
                        <motion.div
                            key={`flash-${i}`}
                            className="absolute w-1 h-1 bg-red-500/20 rounded-full"
                            style={{
                                top: `${Math.random() * 100}%`,
                                left: `${Math.random() * 100}%`,
                            }}
                            animate={{
                                opacity: [0, 0.5, 0],
                                scale: [0.5, 1.5, 0.5],
                            }}
                            transition={{
                                duration: 2 + Math.random() * 3,
                                repeat: Infinity,
                                delay: Math.random() * 5,
                            }}
                        />
                    ))}
                </div>
            )}

            {/* CSS to prevent common bypass attempts */}
            <style>{`
        /* Prevent right-click and common inspection shortcuts */
        body {
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
          -webkit-touch-callout: none;
          -webkit-tap-highlight-color: transparent;
        }

        /* Prevent drag and drop */
        * {
          -webkit-user-drag: none;
          -khtml-user-drag: none;
          -moz-user-drag: none;
          -o-user-drag: none;
          user-drag: none;
        }

        /* Hide watermarks from print */
        @media print {
          [class*="watermark"],
          [style*="z-index: 999"] {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
          }
        }

        /* Ensure watermarks stay on top */
        .watermark-overlay {
          position: fixed !important;
          z-index: 2147483647 !important;
          pointer-events: none !important;
        }
      `}</style>
        </>
    );
};

export default AntiPiracyWatermark;