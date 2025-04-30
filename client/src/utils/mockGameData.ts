/**
 * Mock game data for development and testing
 */

// Common Clash Royale cards for mock data
export const commonCards = [
  "knight",
  "archers",
  "fireball",
  "minipekka",
  "goblinbarrel",
  "princess",
  "log",
  "infernotower",
  "skeletons",
  "hogrider",
  "rocket",
  "goblingang",
  "valkyrie",
  "musketeer",
  "giant",
  "zap",
];

// Generate a random deck of 8 cards
export const generateRandomDeck = (): string[] => {
  const shuffled = [...commonCards].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 8);
};

// Generate random elixir value between 0 and 10
export const generateRandomElixir = (): number => {
  return Math.min(10, Math.round(Math.random() * 1000) / 100);
};

// Generate random elixir generation rate
export const generateRandomElixirRate = (): "normal" | "2x" | "3x" => {
  const rates = ["normal", "2x", "3x"] as const;
  return rates[Math.floor(Math.random() * rates.length)];
};

// Random opponent names
const opponentNames = [
  "BattleMaster99",
  "ClashKing",
  "RoyalGiant42",
  "ElixirWizard",
  "CrownHunter",
  "TowerDestroyer",
  "LogBaitPro",
  "HogCycle4Ever",
];

// Generate random opponent name
export const generateRandomOpponentName = (): string => {
  return opponentNames[Math.floor(Math.random() * opponentNames.length)];
};

// Format time string (MM:SS)
export const formatGameTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
};
