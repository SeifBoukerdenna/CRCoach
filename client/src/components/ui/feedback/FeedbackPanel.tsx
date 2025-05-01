import React, { useState, useEffect } from "react";
import FeedbackItem from "./FeedbackItem";
import "./FeedbackPanel.css";
import { WizardIcon } from "../../../assets/icons";

// Feedback type definition
export interface Feedback {
    id: number;
    type: 'elixir' | 'card' | 'placement' | 'defense' | 'attack' | 'general';
    message: string;
    timestamp: string;
}

interface FeedbackPanelProps {
    isConnected: boolean;
    maxItems?: number;
}

/**
 * Generates random Clash Royale coaching feedback for testing
 */
const generateRandomFeedback = (): Feedback => {
    const types = ['elixir', 'card', 'placement', 'defense', 'attack', 'general'] as const;
    const messages = [
        'Your elixir management needs improvement. Wait before deploying cards.',
        'Good placement of the Mini P.E.K.K.A to counter their push!',
        'Try to save your fireball for their wizard + witch combo.',
        'Your Tesla placement was perfect for defending both lanes.',
        'Watch out! Your opponent is building a big push on the left.',
        'Consider using your hog rider when their building is out of cycle.',
        'Great timing on that log to push back their goblin barrel!',
        'Your king tower activation was well executed!',
        'Careful with your elixir spending before double elixir time.',
        'Your opponent has a counter to your win condition. Consider changing your approach.',
        'Nice prediction with the arrows on their minion horde!',
        'Try to track their card cycle better to predict their next play.',
        'Good job splitting your troops to apply pressure on both lanes.',
        'Your opponent is low on elixir. Now is a good time to attack!',
        'Don\'t overcommit on defense. That was 9 elixir to counter 5.',
    ];

    const randomType = types[Math.floor(Math.random() * types.length)];
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];

    return {
        id: Date.now(),
        type: randomType,
        message: randomMessage,
        timestamp: new Date().toISOString(),
    };
};

/**
 * FeedbackPanel component displays AI coach feedback in a stacked format
 */
const FeedbackPanel: React.FC<FeedbackPanelProps> = ({
    isConnected,
    maxItems = 10
}) => {
    const [feedbackItems, setFeedbackItems] = useState<Feedback[]>([]);

    // Add new feedback items when connected
    useEffect(() => {
        if (!isConnected) {
            // Clear feedback when disconnected
            setFeedbackItems([]);
            return;
        }

        // Generate initial feedback
        setFeedbackItems([generateRandomFeedback()]);

        // Set up interval to add new feedback
        const interval = setInterval(() => {
            setFeedbackItems(prevItems => {
                const newFeedback = generateRandomFeedback();
                const newItems = [newFeedback, ...prevItems].slice(0, maxItems);
                return newItems;
            });
        }, Math.floor(Math.random() * 5000) + 5000); // Random interval between 5-10 seconds

        return () => clearInterval(interval);
    }, [isConnected, maxItems]);

    // If not connected, show waiting message
    if (!isConnected) {
        return (
            <div className="cr-feedback-panel cr-feedback-empty">
                <div className="cr-feedback-empty-content">
                    <WizardIcon width={120} height={120} className="cr-feedback-wizard" />
                    <p>Connect to a battle to receive live coaching feedback!</p>
                </div>
            </div>
        );
    }

    // Render feedback items in a stack
    return (
        <div className="cr-feedback-panel">
            {feedbackItems.length === 0 ? (
                <div className="cr-feedback-empty-content">
                    <p>Analyzing your gameplay...</p>
                    <div className="cr-loading-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            ) : (
                <div className="cr-feedback-list">
                    {feedbackItems.map(item => (
                        <FeedbackItem
                            key={item.id}
                            feedback={item}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default FeedbackPanel;