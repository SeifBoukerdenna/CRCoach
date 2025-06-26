// royal_trainer_client/src/components/notifications/DeploymentNotification.tsx
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, MapPin, Target } from 'lucide-react';
import type { TroopDeploymentEvent } from '../../utils/troopDeploymentDetector';

interface DeploymentNotificationProps {
    deployment: TroopDeploymentEvent | null;
    onDismiss: () => void;
    autoHideDuration?: number; // milliseconds
}

const DeploymentNotification: React.FC<DeploymentNotificationProps> = ({
    deployment,
    onDismiss,
    autoHideDuration = 4000
}) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (deployment) {
            setIsVisible(true);

            const timer = setTimeout(() => {
                setIsVisible(false);
                setTimeout(onDismiss, 300); // Allow exit animation to complete
            }, autoHideDuration);

            return () => clearTimeout(timer);
        }
    }, [deployment, autoHideDuration, onDismiss]);

    const getTroopEmoji = (troopType: string) => {
        const emojiMap: Record<string, string> = {
            'knight': '⚔️', 'archer': '🏹', 'giant': '👾', 'wizard': '🔮',
            'dragon': '🐲', 'hog': '🐗', 'balloon': '🎈', 'golem': '🗿',
            'pekka': '🤖', 'barbarian': '🪓', 'minion': '👹', 'skeleton': '💀',
            'goblin': '👺', 'default': '🪖'
        };
        return emojiMap[troopType.toLowerCase().replace(/\s+/g, '_')] || emojiMap.default;
    };

    if (!deployment) return null;

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, x: 300, scale: 0.8 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 300, scale: 0.8 }}
                    className="fixed top-4 right-4 z-50 bg-gradient-to-r from-cr-purple/90 to-cr-gold/90 backdrop-blur-xl border border-cr-purple/30 rounded-xl p-4 shadow-2xl max-w-sm"
                    onClick={() => setIsVisible(false)}
                >
                    <div className="flex items-start gap-3">
                        <div className="bg-white/20 rounded-full p-2">
                            <Users className="w-5 h-5 text-white" />
                        </div>

                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <h4 className="text-white font-bold text-sm">Troop Deployed!</h4>
                                <div className="flex">
                                    {deployment.troopTypes.slice(0, 3).map((troopType, index) => (
                                        <span key={index} className="text-lg">
                                            {getTroopEmoji(troopType)}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-1 text-xs text-white/90">
                                <div className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    <span>Position: ({Math.round(deployment.centerX)}, {Math.round(deployment.centerY)})</span>
                                </div>

                                <div className="flex items-center gap-1">
                                    <Target className="w-3 h-3" />
                                    <span>{deployment.detectionCount} objects detected</span>
                                </div>

                                <div className="text-white/70">
                                    {deployment.troopTypes.slice(0, 2).join(', ')}
                                    {deployment.troopTypes.length > 2 && ` +${deployment.troopTypes.length - 2} more`}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-2 bg-white/20 rounded-full h-1">
                        <motion.div
                            className="bg-white h-1 rounded-full"
                            initial={{ width: '100%' }}
                            animate={{ width: '0%' }}
                            transition={{ duration: autoHideDuration / 1000, ease: 'linear' }}
                        />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default DeploymentNotification;

// Hook to manage deployment notifications
export const useDeploymentNotifications = (recentDeployments: TroopDeploymentEvent[]) => {
    const [currentNotification, setCurrentNotification] = useState<TroopDeploymentEvent | null>(null);
    const [lastNotifiedId, setLastNotifiedId] = useState<string | null>(null);

    useEffect(() => {
        if (recentDeployments.length > 0) {
            const latestDeployment = recentDeployments[0];

            // Only show notification for new deployments
            if (latestDeployment.id !== lastNotifiedId) {
                setCurrentNotification(latestDeployment);
                setLastNotifiedId(latestDeployment.id);
            }
        }
    }, [recentDeployments, lastNotifiedId]);

    const dismissNotification = () => {
        setCurrentNotification(null);
    };

    return {
        currentNotification,
        dismissNotification
    };
};