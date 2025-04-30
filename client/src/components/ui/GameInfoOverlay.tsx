import React from "react";
import { ElixirBar } from "./ElixirBar";
import { CardCycle } from "./CardCycle";
import "./GameInfoOverlay.css";

interface GameInfoOverlayProps {
    isConnected: boolean;
    opponentElixir?: number;
    currentElixirRate?: "normal" | "2x" | "3x";
    opponentCards?: string[];
    opponentName?: string;
    gameTime?: string;
    currentCard?: number;
}

/**
 * Component that overlays game information on top of the video display
 */
const GameInfoOverlay: React.FC<GameInfoOverlayProps> = ({
    isConnected,
    opponentElixir = 5.5,
    currentElixirRate = "normal",
    opponentCards = ["knight", "archers", "fireball", "minipekka", "goblinbarrel", "princess", "log", "infernotower"],
    opponentName = "Opponent",
    gameTime = "01:45",
    currentCard = 0
}) => {
    if (!isConnected) {
        return null;
    }

    return (
        <div className="game-info-overlay">
            {/* Top section with opponent name and time */}
            <div className="opponent-header">
                <div className="opponent-name">{opponentName}</div>
                <div className="game-time">{gameTime}</div>
            </div>

            {/* Opponent's elixir bar */}
            <div className="opponent-elixir-section">
                <ElixirBar elixir={opponentElixir} maxElixir={10} elixirRate={currentElixirRate} isOpponent={true} />
            </div>

            {/* Opponent's card cycle */}
            <div className="opponent-card-cycle-section">
                <CardCycle cards={opponentCards} currentCard={currentCard} />
            </div>
        </div>
    );
};

export default GameInfoOverlay;