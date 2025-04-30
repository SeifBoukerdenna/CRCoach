import React from "react";
import "./ElixirBar.css";

interface ElixirBarProps {
    elixir: number; // Current elixir amount (can be decimal)
    maxElixir?: number; // Maximum elixir (typically 10)
    elixirRate?: "normal" | "2x" | "3x"; // Current elixir generation rate
    isOpponent?: boolean; // Whether this is showing opponent's elixir
}

/**
 * Component that renders an elixir bar in Clash Royale style
 */
export const ElixirBar: React.FC<ElixirBarProps> = ({
    elixir,
    maxElixir = 10,
    elixirRate = "normal",
    isOpponent = false,
}) => {
    // Round down to get full elixir drops
    const fullElixir = Math.floor(elixir);

    // Calculate the partial fill of the current elixir drop
    const partialFill = elixir - fullElixir;

    // Generate array of elixir drops
    const elixirDrops = Array.from({ length: maxElixir }, (_, index) => {
        if (index < fullElixir) {
            // Full elixir
            return "full";
        } else if (index === fullElixir) {
            // Partially filled elixir
            return partialFill > 0 ? "partial" : "empty";
        } else {
            // Empty elixir
            return "empty";
        }
    });

    return (
        <div className={`elixir-bar ${isOpponent ? "opponent" : "player"}`}>
            <div className="elixir-rate">
                {elixirRate !== "normal" && (
                    <div className={`elixir-rate-indicator rate-${elixirRate}`}>
                        {elixirRate}
                    </div>
                )}
            </div>

            <div className="elixir-drops">
                {elixirDrops.map((type, i) => (
                    <div key={i} className={`elixir-drop ${type}`}>
                        {type === "partial" && (
                            <div
                                className="elixir-drop-fill"
                                style={{ height: `${partialFill * 100}%` }}
                            />
                        )}
                    </div>
                ))}
            </div>

            <div className="elixir-count">
                <span>{Math.floor(elixir * 10) / 10}</span>
            </div>
        </div>
    );
};