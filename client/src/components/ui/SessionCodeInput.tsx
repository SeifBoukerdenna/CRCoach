import React, { useEffect } from "react";
import { useSessionCode } from "../../hooks/useSessionCode";
import "./SessionCodeInput.css";

export interface SessionCodeInputProps {
    isConnected?: boolean;
    initialCode?: string;
    maxLength?: number;
    onChange?: (code: string, isValid: boolean) => void;
    className?: string;
}

export const SessionCodeInput: React.FC<SessionCodeInputProps> = ({
    isConnected = false,
    initialCode = "",
    maxLength = 4,
    onChange,
    className = "",
}) => {
    const {
        code,
        handleCodeChange,
        handleDigitChange,
        handleKeyDown,
        reset,
        inputRefs,
    } = useSessionCode({ maxLength, initialValue: initialCode, onChange });

    useEffect(() => {
        if (!isConnected) {
            reset();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isConnected]);

    if (isConnected) {
        return (
            <div className={`cr-code-display ${className}`}>
                {Array.from(code || "0000").map((digit, i) => (
                    <div key={i} className="cr-code-digit">{digit}</div>
                ))}
            </div>
        );
    }

    return (
        <div className={`cr-code-slot-wrapper ${className}`}>
            {Array.from({ length: maxLength }).map((_, i) => (
                <div key={i} className="cr-code-slot-container">
                    <input
                        ref={inputRefs[i]}
                        className="cr-code-slot"
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={code[i] || ""}
                        onChange={(e) => handleDigitChange(i, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(i, e)}
                        onPaste={(e) => {
                            e.preventDefault();
                            handleCodeChange(e.clipboardData.getData("text"));
                        }}
                        aria-label={`Digit ${i + 1} of session code`}
                    />
                    <div className="cr-code-slot-border"></div>
                </div>
            ))}
        </div>
    );
};

export default SessionCodeInput;