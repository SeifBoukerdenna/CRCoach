// royal_trainer_client/src/components/OptimizedWatermark.tsx
import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import { getDiscordDisplayName } from '../types/auth';
import { useDiscordAuth } from '../hooks/useDiscordAuth';
import { useOptimizedWatermark } from '../hooks/useOptimizedWatermark';

interface WatermarkConfig {
    text: string;
    opacity: number;
    fontSize: number;
    rotation: number;
    spacing: number;
}

const OptimizedWatermark: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameRef = useRef<number>();
    const contextRef = useRef<CanvasRenderingContext2D | null>(null);
    const configRef = useRef<WatermarkConfig | null>(null);
    const lastUpdateRef = useRef<number>(0);

    const { watermarkSettings } = useOptimizedWatermark();
    const { user, isAuthenticated } = useDiscordAuth();

    // Generate watermark text with Discord handle
    const watermarkText = useMemo(() => {
        const baseTexts = [
            'ROYAL TRAINER',
            '⚔️ PROTECTED ⚔️',
            'UNAUTHORIZED USE PROHIBITED'
        ];

        if (isAuthenticated && user) {
            const discordHandle = getDiscordDisplayName(user);
            baseTexts.push(`👑 ${discordHandle}`);
            baseTexts.push(`USER: ${discordHandle}`);
        }

        return baseTexts;
    }, [isAuthenticated, user]);

    // Optimized canvas setup with hardware acceleration
    const setupCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Set canvas size to viewport
        const updateCanvasSize = () => {
            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();

            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;

            const ctx = canvas.getContext('2d', {
                alpha: true,
                desynchronized: true, // Better performance
                willReadFrequently: false
            });

            if (ctx) {
                ctx.scale(dpr, dpr);
                contextRef.current = ctx;
            }
        };

        updateCanvasSize();
        window.addEventListener('resize', updateCanvasSize);

        return () => window.removeEventListener('resize', updateCanvasSize);
    }, []);

    // Efficient watermark pattern generator
    const generateWatermarkPattern = useCallback((ctx: CanvasRenderingContext2D, config: WatermarkConfig) => {
        const canvas = ctx.canvas;
        const { width, height } = canvas.getBoundingClientRect();

        // Clear with transparent background
        ctx.clearRect(0, 0, width, height);

        // Setup font and style
        ctx.font = `${config.fontSize}px "JetBrains Mono", monospace`;
        ctx.fillStyle = `rgba(147, 51, 234, ${config.opacity})`; // cr-purple with opacity
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Calculate optimal spacing
        const textMetrics = ctx.measureText(config.text);
        const textWidth = textMetrics.width;
        const textHeight = config.fontSize;

        const spacingX = Math.max(textWidth + config.spacing, 200);
        const spacingY = Math.max(textHeight + config.spacing, 100);

        // Calculate starting offsets for seamless pattern
        const offsetX = (Date.now() * 0.01) % spacingX;
        const offsetY = (Date.now() * 0.005) % spacingY;

        // Draw watermark pattern
        const cols = Math.ceil(width / spacingX) + 2;
        const rows = Math.ceil(height / spacingY) + 2;

        for (let row = -1; row < rows; row++) {
            for (let col = -1; col < cols; col++) {
                const x = col * spacingX + offsetX;
                const y = row * spacingY + offsetY;

                ctx.save();
                ctx.translate(x, y);
                ctx.rotate((config.rotation * Math.PI) / 180);

                // Anti-removal technique: Multiple text layers with slight offsets
                const textIndex = (row + col) % watermarkText.length;
                const currentText = watermarkText[textIndex];

                // Shadow layer for better visibility and harder removal
                ctx.fillStyle = `rgba(0, 0, 0, ${config.opacity * 0.3})`;
                ctx.fillText(currentText, 1, 1);

                // Main text
                ctx.fillStyle = `rgba(147, 51, 234, ${config.opacity})`;
                ctx.fillText(currentText, 0, 0);

                // Security enhancement: Invisible markers
                if (Math.random() < 0.1) {
                    ctx.fillStyle = `rgba(255, 255, 255, 0.01)`;
                    ctx.fillText('🛡️', 10, 10);
                }

                ctx.restore();
            }
        }
    }, [watermarkText]);

    // Throttled render function for performance
    const renderWatermark = useCallback(() => {
        const now = performance.now();

        // Throttle to max 30 FPS for smooth animation without CPU waste
        if (now - lastUpdateRef.current < 33) {
            animationFrameRef.current = requestAnimationFrame(renderWatermark);
            return;
        }
        lastUpdateRef.current = now;

        const ctx = contextRef.current;
        if (!ctx || !watermarkSettings.enabled) {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            return;
        }

        // Update configuration if needed
        const newConfig: WatermarkConfig = {
            text: watermarkText[0], // Primary text
            opacity: watermarkSettings.opacity,
            fontSize: watermarkSettings.size === 'small' ? 12 : watermarkSettings.size === 'large' ? 18 : 14,
            rotation: 15,
            spacing: 80
        };

        // Only re-render if config changed significantly
        const configChanged = !configRef.current ||
            Math.abs(configRef.current.opacity - newConfig.opacity) > 0.01 ||
            configRef.current.fontSize !== newConfig.fontSize;

        if (configChanged || now % 2000 < 33) { // Refresh pattern every 2 seconds
            configRef.current = newConfig;
            generateWatermarkPattern(ctx, newConfig);
        }

        animationFrameRef.current = requestAnimationFrame(renderWatermark);
    }, [watermarkSettings, generateWatermarkPattern, watermarkText]);

    // Initialize and start rendering
    useEffect(() => {
        const cleanup = setupCanvas();

        if (watermarkSettings.enabled) {
            renderWatermark();
        }

        return () => {
            cleanup?.();
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [setupCanvas, renderWatermark, watermarkSettings.enabled]);

    // Anti-tampering protection
    useEffect(() => {
        if (!watermarkSettings.enabled) return;

        const protectionInterval = setInterval(() => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            // Check if canvas is still visible and properly sized
            const rect = canvas.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) {
                console.warn('🛡️ Watermark canvas tampered with');
                // Force re-setup
                setupCanvas();
                renderWatermark();
            }

            // Check if canvas context is intact
            if (!contextRef.current) {
                console.warn('🛡️ Watermark context lost');
                setupCanvas();
                renderWatermark();
            }
        }, 5000);

        return () => clearInterval(protectionInterval);
    }, [watermarkSettings.enabled, setupCanvas, renderWatermark]);

    if (!watermarkSettings.enabled) return null;

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-50"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 9999,
                mixBlendMode: 'normal',
                // Hardware acceleration
                transform: 'translateZ(0)',
                willChange: 'auto'
            }}
        />
    );
};

export default OptimizedWatermark;