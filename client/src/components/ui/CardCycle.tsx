import React from "react";
import "./CardCycle.css";

// Card data mapping for demonstration
const cardData: Record<string, { name: string, rarity: string, elixir: number }> = {
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

interface CardCycleProps {
    cards: string[]; // Array of card IDs
    currentCard?: number; // Index of the current card (highlighted)
    nextCardPrediction?: string; // Predicted next card
    size?: "small" | "medium" | "large";
}

/**
 * Component that displays the opponent's card cycle
 */
export const CardCycle: React.FC<CardCycleProps> = ({
    cards,
    currentCard,
    nextCardPrediction,
    size = "small"
}) => {
    return (
        <div className={`card-cycle-container size-${size}`}>
            <div className="card-cycle-title">Opponent's Cards</div>
            <div className="card-cycle">
                {cards.map((cardId, index) => {
                    const card = cardData[cardId] || { name: cardId, rarity: "common", elixir: 0 };
                    const isHighlighted = index === currentCard;
                    const isPredicted = cardId === nextCardPrediction;

                    return (
                        <div
                            key={index}
                            className={`card ${card.rarity} ${isHighlighted ? 'highlighted' : ''} ${isPredicted ? 'predicted' : ''}`}
                        >
                            <div className="card-cost">{card.elixir}</div>
                            <div className="card-image">
                                {/* We'd have actual card images here */}
                                <div className="card-placeholder">{card.name.charAt(0)}</div>
                            </div>
                            {isPredicted && <div className="prediction-marker">NEXT</div>}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};