import React from 'react';

interface ControlsProps {
    status: string;
    onConnect: () => void;
    connecting: boolean;
}

export const Controls: React.FC<ControlsProps> = ({ status, onConnect, connecting }) => (
    <div className="controls">
        <button onClick={onConnect} disabled={connecting}>
            {status === 'disconnected'
                ? 'Connect Stream'
                : status === 'connected'
                    ? 'Re‑connect?'
                    : '…'}
        </button>
        <div className="status">Status: {status}</div>
    </div>
);