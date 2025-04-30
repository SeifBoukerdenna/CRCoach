import React from "react";
import { ElixirBar } from "./ElixirBar";
import { CardList } from "./CardList"; // New vertical card list component
import "./GameInfoOverlay.css";

interface GameInfoOverlayProps {
    isConnected: boolean;
    opponentElixir?: number;
    currentElixirRate?: "normal" | "2x" | "3x";
    opponentCards?: string[];
    playerCards?: string[]; // Added player's cards
    currentCard?: number;
}

/**
 * Component that overlays game information on top of the video display
 * with vertical card layouts on the sides
 */
const GameInfoOverlay: React.FC<GameInfoOverlayProps> = ({
    isConnected,
    opponentElixir = 5.5,
    currentElixirRate = "normal",
    // opponentCards = ["knight", "archers", "fireball", "minipekka", "goblinbarrel", "princess", "log", "infernotower"],
    playerCards = ["hogrider", "musketeer", "valkyrie", "skeletons", "zap", "fireball", "log", "infernotower"],
    // currentCard = 0
}) => {
    if (!isConnected) {
        return null;
    }

    return (
        <div className="game-info-overlay side-layout">
            {/* Left side - Player's cards vertical list */}
            <div className="player-cards-container">
                <CardList
                    cards={playerCards}
                    vertical={true}
                    showTitle={false}
                    cardSize="small"
                />
            </div>

            {/* Top center - Opponent's elixir bar */}
            <div className="opponent-elixir-section">
                <ElixirBar
                    elixir={opponentElixir}
                    maxElixir={10}
                    elixirRate={currentElixirRate}
                    isOpponent={true}
                />
            </div>

            {/* Right side - Opponent's elixir count */}
            <div className="opponent-elixir-count">
                <div className="elixir-display">
                    <div className="elixir-icon"></div>
                    <span className="elixir-value">{Math.floor(opponentElixir * 10) / 10}</span>
                </div>
            </div>
        </div>
    );
};

export default GameInfoOverlay;