import React from 'react';
import { SmallCrownIcon } from '../../../assets/icons';
import FeedbackPanel from '../feedback/FeedbackPanel';
import { useLayoutContext } from '../../../context/LayoutContext';
import CollapseButton from '../../core/CollapseButton';

interface CollapsibleFeedbackPanelProps {
    isConnected: boolean;
    maxItems?: number;
}

/**
 * CollapsibleFeedbackPanel component with Clash Royale-styled toggle button
 */
export const CollapsibleFeedbackPanel: React.FC<CollapsibleFeedbackPanelProps> = ({
    isConnected,
    maxItems = 10
}) => {
    // Get layout context
    const { isLeftCollapsed, setIsLeftCollapsed } = useLayoutContext();

    // Toggle expanded/collapsed state
    const togglePanel = () => {
        setIsLeftCollapsed(!isLeftCollapsed);
    };

    return (
        <section className={`cr-column cr-feedback-column ${isLeftCollapsed ? 'collapsed' : ''}`}>
            <div className="cr-column-header">
                <div className="cr-column-title">
                    <SmallCrownIcon width={24} height={24} className="cr-title-icon" />
                    {!isLeftCollapsed && <h2>TRAINER FEEDBACK</h2>}
                </div>

                {/* Stylized Clash Royale Toggle Button */}
                <CollapseButton
                    isCollapsed={isLeftCollapsed}
                    onClick={togglePanel}
                    label="feedback"
                />
            </div>

            {isLeftCollapsed ? (
                <div className="collapsed-feedback">
                    {/* Stacked notification indicators for feedback in collapsed mode */}
                    <div className="feedback-indicators">
                        {isConnected ? (
                            <>
                                <div className="feedback-dot defense" title="Defense tip" aria-label="Defense tip"></div>
                                <div className="feedback-dot card" title="Card tip" aria-label="Card tip"></div>
                                <div className="feedback-dot placement" title="Placement tip" aria-label="Placement tip"></div>
                                <div className="feedback-dot elixir" title="Elixir tip" aria-label="Elixir tip"></div>
                            </>
                        ) : (
                            <div className="feedback-empty-indicator" aria-label="No feedback available">
                                <SmallCrownIcon width={24} height={24} />
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div id="feedback-panel-content">
                    <FeedbackPanel isConnected={isConnected} maxItems={maxItems} />
                </div>
            )}
        </section>
    );
};

export default CollapsibleFeedbackPanel;