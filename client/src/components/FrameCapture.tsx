import { useState, useRef, useEffect } from 'react';
import { Camera, CheckCircle, X, Save } from 'lucide-react';
import './FrameCapture.css'; // Import the CSS file

interface FrameCaptureProps {
    sessionCode: string;
    isConnected: boolean;
    videoRef: React.RefObject<HTMLVideoElement | null>;
}

const FrameCapture = ({ sessionCode, isConnected, videoRef }: FrameCaptureProps) => {
    const [isCapturing, setIsCapturing] = useState(false);
    const [captureFrequency, setCaptureFrequency] = useState(2); // frames per second
    const [capturedCount, setCapturedCount] = useState(0);
    const [showFeedback, setShowFeedback] = useState(false);
    const [feedbackMessage, setFeedbackMessage] = useState('');
    const [feedbackSuccess, setFeedbackSuccess] = useState(true);

    // Fix the ref types
    const captureIntervalRef = useRef<number | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // Clean up on unmount
    useEffect(() => {
        return () => {
            if (captureIntervalRef.current !== null) {
                clearInterval(captureIntervalRef.current);
            }
        };
    }, []);

    // Handle feedback message display
    useEffect(() => {
        if (showFeedback) {
            const timer = setTimeout(() => setShowFeedback(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [showFeedback]);

    const startCapture = () => {
        if (!isConnected || !videoRef?.current || !sessionCode) {
            showFeedbackWithMessage('Error: No active video stream', false);
            return;
        }

        setIsCapturing(true);
        setCapturedCount(0);

        // Calculate interval from frequency
        const intervalMs = Math.floor(1000 / captureFrequency);

        // Create canvas if needed
        if (!canvasRef.current) {
            canvasRef.current = document.createElement('canvas');
        }

        // Set canvas size to match video
        const video = videoRef.current;
        canvasRef.current.width = video.videoWidth;
        canvasRef.current.height = video.videoHeight;

        // Start capture interval - fix the type for setInterval
        captureIntervalRef.current = window.setInterval(() => {
            captureFrame();
        }, intervalMs);

        showFeedbackWithMessage('Frame capturing started', true);
    };

    const stopCapture = () => {
        if (captureIntervalRef.current !== null) {
            clearInterval(captureIntervalRef.current);
            captureIntervalRef.current = null;
        }

        setIsCapturing(false);
        showFeedbackWithMessage(`Captured ${capturedCount} frames`, true);
    };

    const captureFrame = () => {
        if (!videoRef?.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;

        // Check if canvas context exists
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert to blob
        canvas.toBlob((blob) => {
            if (!blob) return;

            // Create formdata
            const formData = new FormData();
            formData.append('frame', blob, `frame_${Date.now()}.jpg`);
            formData.append('sessionCode', sessionCode);

            // Send to server
            fetch('/api/capture-frame', {
                method: 'POST',
                body: formData
            })
                .then(response => {
                    if (!response.ok) throw new Error('Failed to save frame');
                    return response.json();
                })
                .then(() => {
                    setCapturedCount(prev => prev + 1);
                })
                .catch(error => {
                    console.error('Error saving frame:', error);
                    showFeedbackWithMessage('Error saving frame', false);
                });
        }, 'image/jpeg', 0.85);
    };

    const showFeedbackWithMessage = (message: string, success: boolean) => {
        setFeedbackMessage(message);
        setFeedbackSuccess(success);
        setShowFeedback(true);
    };

    // Don't show if not connected
    if (!isConnected) return null;

    return (
        <div className="cr-frame-capture">
            <div className="cr-frame-capture-header">
                <div className="cr-frame-capture-title">
                    <Camera size={18} />
                    <h3>Frame Capture</h3>
                </div>
            </div>

            <div className="cr-frame-capture-content">
                <div className="cr-frame-capture-controls">
                    <div className="cr-control-group">
                        <span>Capture Rate:</span>
                        <select
                            value={captureFrequency}
                            onChange={(e) => setCaptureFrequency(Number(e.target.value))}
                            className="cr-select"
                            disabled={isCapturing}
                        >
                            <option value="1">1 FPS</option>
                            <option value="2">2 FPS</option>
                            <option value="5">5 FPS</option>
                            <option value="10">10 FPS</option>
                        </select>
                    </div>

                    {capturedCount > 0 && !isCapturing && (
                        <div className="cr-capture-count">
                            {capturedCount} frames captured
                        </div>
                    )}
                </div>

                <button
                    onClick={isCapturing ? stopCapture : startCapture}
                    className={`cr-button ${isCapturing ? 'cr-button-stop' : 'cr-button-start'}`}
                >
                    {isCapturing ? (
                        <>
                            <X size={18} />
                            <span>Stop Capturing</span>
                        </>
                    ) : (
                        <>
                            <Camera size={18} />
                            <span>Start Capturing Frames</span>
                        </>
                    )}
                </button>

                {isCapturing && (
                    <div className="cr-capturing-indicator">
                        <Save size={16} />
                        <span>Saving frames to server...</span>
                    </div>
                )}

                {/* Feedback message */}
                {showFeedback && (
                    <div className={`cr-feedback ${feedbackSuccess ? 'cr-feedback-success' : 'cr-feedback-error'}`}>
                        {feedbackSuccess ? <CheckCircle size={16} /> : <X size={16} />}
                        <span>{feedbackMessage}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FrameCapture;