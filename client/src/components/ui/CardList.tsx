import React from "react";
import "./CardList.css";

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

interface CardListProps {
    cards: string[]; // Array of card IDs
    vertical?: boolean; // Whether to display cards vertically
    showTitle?: boolean; // Whether to show the title
    cardSize?: "tiny" | "small" | "medium" | "large";
    title?: string; // Optional custom title
    currentCard?: number; // Index of the current card (highlighted)
    highlightedCards?: number[]; // Array of indices to highlight
}

/**
 * Component that displays a list of cards either horizontally or vertically
 */
export const CardList: React.FC<CardListProps> = ({
    cards,
    vertical = false,
    showTitle = true,
    cardSize = "small",
    title = "Cards",
    currentCard,
    highlightedCards = []
}) => {
    return (
        <div className={`card-list-container ${vertical ? 'vertical' : 'horizontal'}`}>
            {showTitle && <div className="card-list-title">{title}</div>}

            <div className={`card-list ${vertical ? 'vertical' : 'horizontal'} size-${cardSize}`}>
                {cards.map((cardId, index) => {
                    const card = cardData[cardId] || { name: cardId, rarity: "common", elixir: 0 };
                    const isHighlighted = index === currentCard || highlightedCards.includes(index);

                    return (
                        <div
                            key={index}
                            className={`card-item ${card.rarity} ${isHighlighted ? 'highlighted' : ''}`}
                        >
                            <div className="card-cost">{card.elixir}</div>
                            <div className="card-image">
                                {/* We'd have actual card images here */}
                                <div className="card-placeholder">{card.name.charAt(0).toUpperCase()}</div>
                            </div>
                            <div className="card-name">{vertical ? card.name.charAt(0) : ''}</div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};