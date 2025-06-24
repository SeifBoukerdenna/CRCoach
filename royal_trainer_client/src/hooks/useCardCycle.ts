// royal_trainer_client/src/hooks/useCardCycle.ts

import { useState, useCallback, useMemo } from "react";

export interface Card {
  id: number;
  name: string;
  cost: number;
  rarity: "common" | "rare" | "epic" | "legendary";
  level: number;
  cardKey: string;
}

export interface CardCycleState {
  hand: Card[];
  cycleQueue: Card[];
  nextCard: Card;
  isCardPlayable: (cardId: number, availableElixir: number) => boolean;
}

export interface CardCycleActions {
  playCard: (cardId: number) => Card | null;
  resetCycle: () => void;
  shuffleDeck: () => void;
  getCardPosition: (cardId: number) => number; // Position in the full cycle (0-7)
}

// Default Clash Royale deck for testing
const DEFAULT_DECK: Card[] = [
  {
    id: 1,
    name: "Knight",
    cost: 3,
    rarity: "common",
    level: 11,
    cardKey: "knight",
  },
  {
    id: 2,
    name: "Archers",
    cost: 3,
    rarity: "common",
    level: 11,
    cardKey: "archers",
  },
  {
    id: 3,
    name: "Fireball",
    cost: 4,
    rarity: "rare",
    level: 9,
    cardKey: "fireball",
  },
  { id: 4, name: "Giant", cost: 5, rarity: "rare", level: 9, cardKey: "giant" },
  {
    id: 5,
    name: "Wizard",
    cost: 5,
    rarity: "rare",
    level: 9,
    cardKey: "wizard",
  },
  {
    id: 6,
    name: "Arrows",
    cost: 3,
    rarity: "common",
    level: 11,
    cardKey: "arrows",
  },
  {
    id: 7,
    name: "Mega Knight",
    cost: 7,
    rarity: "legendary",
    level: 2,
    cardKey: "mega_knight",
  },
  {
    id: 8,
    name: "Skeleton Army",
    cost: 3,
    rarity: "epic",
    level: 6,
    cardKey: "skeleton_army",
  },
];

export const useCardCycle = (
  initialDeck: Card[] = DEFAULT_DECK
): CardCycleState & CardCycleActions => {
  // Validate deck has exactly 8 cards
  if (initialDeck.length !== 8) {
    throw new Error("Deck must contain exactly 8 cards");
  }

  // Initialize the cycle: shuffle deck first, then first 4 cards in hand, rest in queue
  const [cardCycle, setCardCycle] = useState<Card[]>(() => {
    const shuffled = [...initialDeck];
    // Fisher-Yates shuffle for initial randomization
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  });

  // Current state derived from the cycle
  const hand = useMemo(() => cardCycle.slice(0, 4), [cardCycle]);
  const cycleQueue = useMemo(() => cardCycle.slice(4, 8), [cardCycle]);
  const nextCard = useMemo(() => cycleQueue[0], [cycleQueue]);

  // Check if a card can be played based on elixir cost (only cards in hand)
  const isCardPlayable = useCallback(
    (cardId: number, availableElixir: number): boolean => {
      const cardIndex = cardCycle.findIndex((c) => c.id === cardId);
      // Only cards in hand (positions 0-3) can be played
      if (cardIndex === -1 || cardIndex > 3) return false;

      const card = cardCycle[cardIndex];
      return card.cost <= availableElixir;
    },
    [cardCycle]
  );

  // Play a card and cycle the deck (Clash Royale mechanics)
  const playCard = useCallback(
    (cardId: number): Card | null => {
      const cardIndex = cardCycle.findIndex((c) => c.id === cardId);

      // Only allow playing cards that are in hand (positions 0-3)
      if (cardIndex === -1 || cardIndex > 3) {
        console.warn(`Card with ID ${cardId} not found in hand`);
        return null;
      }

      const playedCard = cardCycle[cardIndex];

      setCardCycle((prevCycle) => {
        const newCycle = [...prevCycle];

        // Remove the played card from its current position
        const cardToMove = newCycle.splice(cardIndex, 1)[0];

        // Add it to the end of the cycle (this creates the continuous 8-card cycle)
        newCycle.push(cardToMove);

        return newCycle;
      });

      return playedCard;
    },
    [cardCycle]
  );

  // Reset the cycle to initial state (with new shuffle)
  const resetCycle = useCallback(() => {
    const shuffled = [...initialDeck];
    // Fisher-Yates shuffle for new randomization
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setCardCycle(shuffled);
  }, [initialDeck]);

  // Shuffle the deck (useful for testing different scenarios)
  const shuffleDeck = useCallback(() => {
    setCardCycle((prevCycle) => {
      const shuffled = [...prevCycle];

      // Fisher-Yates shuffle algorithm
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      return shuffled;
    });
  }, []);

  // Get the position of a card in the full cycle (0-7)
  const getCardPosition = useCallback(
    (cardId: number): number => {
      return cardCycle.findIndex((card) => card.id === cardId);
    },
    [cardCycle]
  );

  return {
    hand,
    cycleQueue,
    nextCard,
    isCardPlayable,
    playCard,
    resetCycle,
    shuffleDeck,
    getCardPosition,
  };
};
