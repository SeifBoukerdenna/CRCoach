// royal_trainer_client/src/hooks/useCardCycle.ts - Enhanced with Champion support

import { useState, useCallback, useMemo } from "react";

export interface Card {
  id: number;
  name: string;
  cost: number;
  rarity: "common" | "rare" | "epic" | "legendary" | "champion";
  level: number;
  cardKey: string;
}

export interface ChampionState {
  activeChampion: Card | null;
  isChampionDeployed: boolean;
  canUseAbility: boolean;
  abilityCost: number;
}

export interface CardCycleState {
  hand: Card[];
  cycleQueue: Card[];
  nextCard: Card;
  championState: ChampionState;
  isCardPlayable: (cardId: number, availableElixir: number) => boolean;
}

export interface CardCycleActions {
  playCard: (cardId: number) => Card | null;
  playChampionAbility: () => boolean;
  killChampion: () => void;
  resetCycle: () => void;
  shuffleDeck: () => void;
  getCardPosition: (cardId: number) => number;
}

// Enhanced deck with a champion
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
  {
    id: 4,
    name: "Giant",
    cost: 5,
    rarity: "rare",
    level: 9,
    cardKey: "giant",
  },
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
    name: "Golden Knight", // Champion!
    cost: 4,
    rarity: "champion",
    level: 11,
    cardKey: "golden_knight",
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

  // Champion state management
  const [championState, setChampionState] = useState<ChampionState>({
    activeChampion: null,
    isChampionDeployed: false,
    canUseAbility: true,
    abilityCost: 2,
  });

  // Calculate hand and queue based on champion state
  const hand = useMemo(() => {
    // Hand should ALWAYS have 4 cards
    return cardCycle.slice(0, 4);
  }, [cardCycle]);

  const cycleQueue = useMemo(() => {
    if (championState.isChampionDeployed) {
      // When champion is deployed, cycle queue has 3 cards (champion is on field, not in cycle)
      return cardCycle.slice(4, 7);
    }
    // Normal mode: cycle queue has 4 cards
    return cardCycle.slice(4, 8);
  }, [cardCycle, championState.isChampionDeployed]);

  const nextCard = useMemo(() => cycleQueue[0], [cycleQueue]);

  // Check if a card can be played based on elixir cost
  const isCardPlayable = useCallback(
    (cardId: number, availableElixir: number): boolean => {
      // For champions, check if one is already deployed
      const card = cardCycle.find((c) => c.id === cardId);
      if (card?.rarity === "champion" && championState.isChampionDeployed) {
        return false; // Can't play another champion while one is active
      }

      const cardIndex = cardCycle.findIndex((c) => c.id === cardId);
      // Only cards in hand (positions 0-3) can be played - hand always has 4 cards
      if (cardIndex === -1 || cardIndex > 3) return false;

      return card ? card.cost <= availableElixir : false;
    },
    [cardCycle, championState.isChampionDeployed]
  );

  // Play a card and cycle the deck
  const playCard = useCallback(
    (cardId: number): Card | null => {
      const cardIndex = cardCycle.findIndex((c) => c.id === cardId);

      // Only allow playing cards that are in hand (positions 0-3)
      if (cardIndex === -1 || cardIndex > 3) {
        console.warn(`Card with ID ${cardId} not found in hand`);
        return null;
      }

      const playedCard = cardCycle[cardIndex];

      // Handle champion deployment
      if (playedCard.rarity === "champion") {
        console.log(`🏆 Champion ${playedCard.name} deployed!`);

        setChampionState({
          activeChampion: playedCard,
          isChampionDeployed: true,
          canUseAbility: true,
          abilityCost: 2,
        });

        // Remove champion from cycle (it's now active on field)
        setCardCycle((prevCycle) => {
          const newCycle = [...prevCycle];
          newCycle.splice(cardIndex, 1);
          return newCycle;
        });

        return playedCard;
      }

      // Handle normal card cycling
      setCardCycle((prevCycle) => {
        const newCycle = [...prevCycle];
        // Remove the played card from its current position
        const cardToMove = newCycle.splice(cardIndex, 1)[0];
        // Add it to the end of the cycle
        newCycle.push(cardToMove);
        return newCycle;
      });

      return playedCard;
    },
    [cardCycle]
  );

  // Play champion ability
  const playChampionAbility = useCallback((): boolean => {
    if (!championState.isChampionDeployed || !championState.canUseAbility) {
      return false;
    }

    console.log(`⚡ ${championState.activeChampion?.name} ability activated!`);

    // Disable ability temporarily (in real game, this would be on a cooldown)
    setChampionState((prev) => ({
      ...prev,
      canUseAbility: false,
    }));

    // Re-enable ability after 3 seconds (for demo purposes)
    setTimeout(() => {
      setChampionState((prev) => ({
        ...prev,
        canUseAbility: true,
      }));
    }, 3000);

    return true;
  }, [championState]);

  // Kill champion and return to normal cycle
  const killChampion = useCallback(() => {
    if (!championState.isChampionDeployed || !championState.activeChampion) {
      return;
    }

    console.log(
      `💀 Champion ${championState.activeChampion.name} defeated! Returning to cycle.`
    );

    // Add champion back to the end of the cycle
    setCardCycle((prevCycle) => {
      const newCycle = [...prevCycle];
      newCycle.push(championState.activeChampion!);
      return newCycle;
    });

    // Reset champion state
    setChampionState({
      activeChampion: null,
      isChampionDeployed: false,
      canUseAbility: true,
      abilityCost: 2,
    });
  }, [championState]);

  // Reset the cycle to initial state
  const resetCycle = useCallback(() => {
    const shuffled = [...initialDeck];
    // Fisher-Yates shuffle for new randomization
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setCardCycle(shuffled);

    // Reset champion state
    setChampionState({
      activeChampion: null,
      isChampionDeployed: false,
      canUseAbility: true,
      abilityCost: 2,
    });
  }, [initialDeck]);

  // Shuffle the deck
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

  // Get the position of a card in the full cycle
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
    championState,
    isCardPlayable,
    playCard,
    playChampionAbility,
    killChampion,
    resetCycle,
    shuffleDeck,
    getCardPosition,
  };
};
