/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import './DebugPanel.css';

interface DebugPanelProps {
    sessionCode: string;
    connected: boolean;
    onClose: () => void;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({
    sessionCode,
    connected,
    onClose
}) => {
    const [detectionResponse, setDetectionResponse] = useState<any>(null);
    const [sessionResponse, setSessionResponse] = useState<any>(null);
    const [mlStatus, setMlStatus] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const fetchDebugData = async () => {
        if (!connected || !sessionCode) return;

        setLoading(true);
        setError(null);

        try {
            // Fetch detection status
            const detectionRes = await fetch(`/detection/${sessionCode}`);
            if (detectionRes.ok) {
                const data = await detectionRes.json();
                setDetectionResponse(data);
            }

            // Fetch session status
            const sessionRes = await fetch(`/session/${sessionCode}/status`);
            if (sessionRes.ok) {
                const data = await sessionRes.json();
                setSessionResponse(data);
            }

            // Fetch ML status
            const mlRes = await fetch('/ml/status');
            if (mlRes.ok) {
                const data = await mlRes.json();
                setMlStatus(data);
            }
        } catch (err) {
            setError('Error fetching debug data');
            console.error('Debug fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (connected && sessionCode) {
            fetchDebugData();

            // Poll for updates
            const interval = setInterval(fetchDebugData, 3000);
            return () => clearInterval(interval);
        }
    }, [connected, sessionCode]);

    if (!connected) {
        return null;
    }

    return (
        <div className="debug-panel">
            <div className="debug-header">
                <h3>Debug Panel</h3>
                <button className="debug-close-btn" onClick={onClose}>×</button>
            </div>

            <div className="debug-content">
                {loading && <div className="debug-loading">Loading data...</div>}

                {error && <div className="debug-error">{error}</div>}

                <div className="debug-section">
                    <h4>Detection Status</h4>
                    <pre>{JSON.stringify(detectionResponse, null, 2)}</pre>
                </div>

                <div className="debug-section">
                    <h4>Session Status</h4>
                    <pre>{JSON.stringify(sessionResponse, null, 2)}</pre>
                </div>

                <div className="debug-section">
                    <h4>ML System Status</h4>
                    <pre>{JSON.stringify(mlStatus, null, 2)}</pre>
                </div>

                <div className="debug-actions">
                    <button onClick={fetchDebugData} disabled={loading}>
                        Refresh Data
                    </button>
                </div>
            </div>
        </div>
    );
};