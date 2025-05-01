import React, { useEffect, useState } from "react";
import { BroadcastProvider, useBroadcast } from "./context/BroadcastContext";
import { SettingsProvider, useSettings } from "./context/SettingsContext";
import { LayoutProvider } from "./context/LayoutContext";
import VideoPlayer from "./components/ui/VideoPlayer";
import Settings from "./components/ui/settings/Settings";
import {
  ClashRoyaleCrown,
  ElixirLoader,
  SwordIcon
} from "./assets/icons";

import {
  generateRandomDeck,
  generateRandomElixirRate,
  generateRandomOpponentName,
  formatGameTime
} from "./utils/mockGameData";
import "./styles/App.css";
import "./styles/CollapsiblePanels.css";
import CollapsibleConnectionPanel from "./components/ui/collapsibleConnectionPanel/CollapsibleConnectionPanel";
import CollapsibleFeedbackPanel from "./components/ui/collapsibleFeedbackPanel/CollapsibleFeedbackPanel";

/**
 * Main application content component
 */
const AppContent: React.FC = () => {
  // Get broadcast context
  const {
    isConnected,
    videoRef,
  } = useBroadcast();

  // Get settings context
  const {
    quality,
    setQuality,
    isSettingsOpen,
    closeSettings,
  } = useSettings();

  // Mock game data state
  const [gameData, setGameData] = useState({
    opponentCards: generateRandomDeck(),
    playerCards: generateRandomDeck(),
    opponentElixir: 5,
    elixirRate: "normal" as "normal" | "2x" | "3x",
    opponentName: generateRandomOpponentName(),
    gameTime: 0,
    currentCard: Math.floor(Math.random() * 8)
  });

  // Update game data periodically when connected
  useEffect(() => {
    if (!isConnected) return;

    // Update game time every second
    const gameTimeInterval = setInterval(() => {
      setGameData(prev => ({
        ...prev,
        gameTime: prev.gameTime + 1
      }));
    }, 1000);

    // Update elixir every 300ms
    const elixirInterval = setInterval(() => {
      setGameData(prev => {
        // Calculate elixir regeneration rate
        const rate = prev.elixirRate === "normal" ? 0.1 :
          prev.elixirRate === "2x" ? 0.2 : 0.3;

        // Update elixir (max 10)
        return {
          ...prev,
          opponentElixir: Math.min(10, prev.opponentElixir + rate)
        };
      });
    }, 300);

    // Change elixir rate occasionally
    const elixirRateInterval = setInterval(() => {
      if (Math.random() > 0.7) {
        setGameData(prev => ({
          ...prev,
          elixirRate: generateRandomElixirRate()
        }));
      }
    }, 15000);

    // Simulate opponent playing cards
    const cardPlayInterval = setInterval(() => {
      if (Math.random() > 0.7 && gameData.opponentElixir >= 3) {
        setGameData(prev => {
          // Select a random card to play
          const newCurrentCard = Math.floor(Math.random() * 8);

          // Reduce elixir by 3-5 points
          return {
            ...prev,
            currentCard: newCurrentCard,
            opponentElixir: Math.max(0, prev.opponentElixir - (3 + Math.floor(Math.random() * 3)))
          };
        });
      }
    }, 5000);

    return () => {
      clearInterval(gameTimeInterval);
      clearInterval(elixirInterval);
      clearInterval(elixirRateInterval);
      clearInterval(cardPlayInterval);
    };
  }, [isConnected, gameData.opponentElixir]);

  // Reset game data when disconnected
  useEffect(() => {
    if (!isConnected) {
      setGameData({
        opponentCards: generateRandomDeck(),
        playerCards: generateRandomDeck(),
        opponentElixir: 5,
        elixirRate: "normal",
        opponentName: generateRandomOpponentName(),
        gameTime: 0,
        currentCard: Math.floor(Math.random() * 8)
      });
    }
  }, [isConnected]);

  return (
    <main className="cr-layout">
      {/* Left Column - Collapsible Feedback Panel */}
      <CollapsibleFeedbackPanel isConnected={isConnected} />

      {/* Middle Column - Video Player */}
      <section className="cr-column cr-video-column">
        <div className="cr-column-header">
          <div className="cr-column-title">
            <SwordIcon width={24} height={24} className="cr-title-icon" />
            <h2>BATTLE VIEW</h2>
          </div>
        </div>
        <VideoPlayer
          videoRef={videoRef}
          isConnected={isConnected}
          CrownIcon={ClashRoyaleCrown}
          LoadingIcon={ElixirLoader}
          gameData={{
            opponentCards: gameData.opponentCards,
            playerCards: gameData.playerCards,
            opponentElixir: gameData.opponentElixir,
            elixirRate: gameData.elixirRate,
            opponentName: gameData.opponentName,
            gameTime: formatGameTime(gameData.gameTime),
            currentCard: gameData.currentCard
          }}
        />
      </section>

      {/* Right Column - Collapsible Connection Panel */}
      <CollapsibleConnectionPanel />

      {/* Settings modal */}
      <Settings
        isOpen={isSettingsOpen}
        onClose={closeSettings}
        quality={quality}
        onQualityChange={setQuality}
        isConnected={isConnected}
      />
    </main>
  );
};

/**
 * Main App component with providers
 */
export const App: React.FC = () => {
  return (
    <SettingsProvider>
      <BroadcastProvider>
        <LayoutProvider>
          <AppContent />
        </LayoutProvider>
      </BroadcastProvider>
    </SettingsProvider>
  );
};

export default App;