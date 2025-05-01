import React from "react";
import "./ImprovedElixirDisplay.css";
import "./ImprovedCardDisplay.css";
import OpponentElixirDisplay from "./OpponentElixirDisplay";

// Card data mapping for demonstration
const cardData: Record<string, { name: string; rarity: string; elixir: number }> = {
    "knight": { name: "Knight", rarity: "common", elixir: 3 },
    "archers": { name: "Archers", rarity: "common", elixir: 3 },
    "fireball": { name: "Fireball", rarity: "rare", elixir: 4 },
    "minipekka": { name: "Mini P.E.K.K.A", rarity: "rare", elixir: 4 },
    "goblinbarrel": { name: "Goblin Barrel", rarity: "epic", elixir: 3 },
    "princess": { name: "Princess", rarity: "legendary", elixir: 3 },
    "log": { name: "The Log", rarity: "legendary", elixir: 2 },
    "infernotower": { name: "Inferno Tower", rarity: "rare", elixir: 5 },
    "skeletons": { name: "Skeletons", rarity: "common", elixir: 1 },
    "hogrider": { name: "Hog Rider", rarity: "rare", elixir: 4 },
    "rocket": { name: "Rocket", rarity: "rare", elixir: 6 },
    "goblingang": { name: "Goblin Gang", rarity: "common", elixir: 3 },
    "valkyrie": { name: "Valkyrie", rarity: "rare", elixir: 4 },
    "musketeer": { name: "Musketeer", rarity: "rare", elixir: 4 },
    "giant": { name: "Giant", rarity: "rare", elixir: 5 },
    "zap": { name: "Zap", rarity: "common", elixir: 2 },
};

interface GameInfoOverlayProps {
    isConnected: boolean;
    opponentElixir?: number;
    currentElixirRate?: "normal" | "2x" | "3x";
    opponentCards?: string[];
    playerCards?: string[];
    currentCard?: number;
    opponentName?: string;
    gameTime?: string;
}

/**
 * Enhanced GameInfoOverlay component with improved Clash Royale styling
 */
const GameInfoOverlay: React.FC<GameInfoOverlayProps> = ({
    isConnected,
    opponentElixir = 5.5,
    currentElixirRate = "normal",
    opponentCards = ["hogrider", "musketeer", "valkyrie", "skeletons", "zap", "fireball", "log", "infernotower"],
    currentCard = 0,
}) => {
    if (!isConnected) {
        return null;
    }

    return (
        <div className="game-info-overlay side-layout">
            {/* Left side - Opponent's cards vertical list */}
            <div className="cr-card-list">
                <div className="cr-card-list-title">OPPONENT'S CARDS</div>
                {opponentCards.map((cardId, index) => {
                    const card = cardData[cardId] || { name: cardId, rarity: "common", elixir: 0 };
                    const isActive = index === currentCard;

                    return (
                        <div
                            key={index}
                            className={`cr-card-enhanced ${card.rarity} ${isActive ? "active" : ""}`}
                        >
                            <div className="cr-card-elixir">{card.elixir}</div>
                            <div className="cr-card-content">
                                {/* Display first letter of card name */}
                                {card.name.charAt(0)}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Right side - Opponent's Elixir Display component */}
            <OpponentElixirDisplay
                elixir={opponentElixir}
                elixirRate={currentElixirRate}
            />
        </div>
    );
};

export default GameInfoOverlay;