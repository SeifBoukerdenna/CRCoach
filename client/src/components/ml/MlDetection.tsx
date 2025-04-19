/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';
import { getDetectionStatus } from '../../services/fetchers';
import './MLDetection.css';

interface MLDetectionProps {
    sessionCode: string;
    connected: boolean;
}

interface DetectionResult {
    status: string;
    logo_detected: boolean;
    confidence: number;
    location?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    timestamp: number;
}

export const MLDetection: React.FC<MLDetectionProps> = ({ sessionCode, connected }) => {
    const [detection, setDetection] = useState<DetectionResult | null>(null);

    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        if (!connected || !sessionCode) {
            setDetection(null);
            setError(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        let isMounted = true;

        // Function to fetch detection status
        const fetchDetection = async () => {
            try {
                console.log("Fetching detection for session:", sessionCode);
                const data = await getDetectionStatus(sessionCode);

                if (isMounted) {
                    console.log("Detection response:", data);
                    setDetection(data as any);
                    setError(null);
                    setLoading(false);
                }
            } catch (err) {
                if (isMounted) {
                    console.error("Detection error:", err);
                    setError('Error connecting to detection service');
                    setDetection(null);
                    setLoading(false);
                }
            }
        };

        // Fetch immediately
        fetchDetection();

        // Set up polling every 1 second
        const interval = setInterval(fetchDetection, 1000);

        // Clean up
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [sessionCode, connected]);

    // Don't show if not connected
    if (!connected) {
        return null;
    }

    return (
        <div className="ml-detection">
            <div className="detection-header">
                <div className="detection-title">AI Coach</div>
                {loading && <div className="detection-loading-indicator"></div>}
            </div>

            {error ? (
                <div className="detection-error">{error}</div>
            ) : detection ? (
                <div className="detection-content">
                    {detection.logo_detected ? (
                        <div className="logo-detected-indicator">
                            <div className="detected-icon">✓</div>
                            <div className="detected-text">Supercell Logo Detected!</div>
                            <div className="confidence-meter">
                                <div
                                    className="confidence-fill"
                                    style={{ width: `${Math.round(detection.confidence * 100)}%` }}
                                ></div>
                                <span className="confidence-value">{Math.round(detection.confidence * 100)}%</span>
                            </div>
                        </div>
                    ) : (
                        <div className="detection-item">
                            <div className="item-label">Splash Screen</div>
                            <div className="item-status not-detected">Not Detected</div>
                            <div className="detection-message">Monitoring for Supercell logo...</div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="detection-loading">
                    Initializing logo detection...
                </div>
            )}
        </div>
    );
};