// components/ui/SessionCodeInput.tsx
import React, { useEffect } from "react";
import { useSessionCode } from "../../hooks/useSessionCode";

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

    // 🔥 Fix: remove `reset` from deps so this only runs
    //    when isConnected truly flips
    useEffect(() => {
        if (!isConnected) {
            reset();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isConnected]);

    if (isConnected) {
        return <div className={`code-display ${className}`}>{code || "— — — —"}</div>;
    }

    return (
        <div className={`code-slot-wrapper ${className}`}>
            {inputRefs.map((ref, i) => (
                <input
                    key={i}
                    ref={ref}
                    className="code-slot"
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
                />
            ))}
        </div>
    );
};

export default SessionCodeInput;
