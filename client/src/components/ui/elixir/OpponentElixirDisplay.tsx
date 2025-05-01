import React from 'react';
import '../ImprovedElixirDisplay.css';
import "../ImprovedCardDisplay.css"

interface OpponentElixirDisplayProps {
    elixir: number;
    elixirRate?: 'normal' | '2x' | '3x';
}

/**
 * Component for displaying opponent's elixir with individual units
 */
const OpponentElixirDisplay: React.FC<OpponentElixirDisplayProps> = ({
    elixir,
    elixirRate = 'normal'
}) => {
    // Normalize elixir display to match Clash Royale
    const normalizedElixir = () => {
        const decimal = elixir - Math.floor(elixir);
        // If very close to next integer (0.9+), just show the next integer
        if (decimal >= 0.9) {
            return Math.ceil(elixir);
        }
        // If close to current integer (0.0-0.1), just show the current integer
        else if (decimal <= 0.1) {
            return Math.floor(elixir);
        }
        // Otherwise, show one decimal place
        else {
            return Math.floor(elixir * 10) / 10;
        }
    };

    // Calculate full and partial elixir for the 10-unit display
    const fullElixir = Math.floor(elixir);
    const partialElixir = elixir - fullElixir;

    // Check if elixir is at max
    const isElixirMaxed = elixir >= 9.9;

    // Round elixir for display (more natural)
    const elixirDisplay = normalizedElixir();

    // Create array of 10 elixir units
    const elixirUnits = Array.from({ length: 10 }, (_, index) => {
        if (index < fullElixir) {
            return "filled"; // Fully filled unit
        } else if (index === fullElixir && partialElixir > 0) {
            return "partial"; // Partially filled unit
        } else {
            return "empty"; // Empty unit
        }
    }).reverse(); // Reverse so units fill from bottom to top

    return (
        <div className={`vertical-elixir-container ${isElixirMaxed ? "elixir-max" : ""}`}>
            <div className="vertical-elixir-title">OPPONENT'S ELIXIR</div>
            <div className="elixir-drop-icon"></div>

            <div className="elixir-count-display">{elixirDisplay}</div>

            <div className="elixir-units-container">
                {elixirUnits.map((status, index) => (
                    <div
                        key={index}
                        className={`elixir-unit ${status}`}
                    >
                        {status === "partial" && (
                            <div
                                className="elixir-unit-fill"
                                style={{ height: `${partialElixir * 100}%` }}
                            ></div>
                        )}
                    </div>
                ))}
            </div>

            {elixirRate !== "normal" && (
                <div className={`elixir-rate-indicator rate-${elixirRate}`}>
                    {elixirRate}
                </div>
            )}
        </div>
    );
};

export default OpponentElixirDisplay;