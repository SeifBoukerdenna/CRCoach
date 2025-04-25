// hooks/useSessionCode.ts
import { createRef, useCallback, useRef, useState } from "react";
import { cleanSessionCode, isValidSessionCode } from "../utils/formatters";

export interface UseSessionCodeOptions {
  maxLength?: number;
  initialValue?: string;
  onChange?: (code: string, isValid: boolean) => void;
}

export interface UseSessionCodeResult {
  code: string;
  isValid: boolean;
  handleCodeChange: (value: string) => void;
  handleDigitChange: (index: number, value: string) => void;
  handleKeyDown: (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => void;
  reset: () => void;
  // allow current to be nullable, since createRef<HTMLInputElement>() gives .current: HTMLInputElement | null
  inputRefs: React.RefObject<HTMLInputElement | null>[];
}

export function useSessionCode({
  maxLength = 4,
  initialValue = "",
  onChange,
}: UseSessionCodeOptions): UseSessionCodeResult {
  // 1) internal code state
  const [code, setCode] = useState<string>(
    cleanSessionCode(initialValue).slice(0, maxLength)
  );

  // 2) one stable ref-array whose identity never changes
  const inputRefsRef = useRef<React.RefObject<HTMLInputElement | null>[]>([]);
  if (inputRefsRef.current.length !== maxLength) {
    inputRefsRef.current = Array.from({ length: maxLength }, () =>
      createRef<HTMLInputElement>()
    );
  }
  const inputRefs = inputRefsRef.current;

  // 3) helper to update and notify
  const fireChange = useCallback(
    (newCode: string) => {
      setCode(newCode);
      onChange?.(newCode, isValidSessionCode(newCode));
    },
    [onChange]
  );

  // 4) full‐code paste or override
  const handleCodeChange = useCallback(
    (value: string) => {
      const cleaned = cleanSessionCode(value).slice(0, maxLength);
      fireChange(cleaned);
      if (cleaned.length < maxLength) {
        inputRefs[cleaned.length]?.current?.focus();
      }
    },
    [fireChange, inputRefs, maxLength]
  );

  // 5) single‐digit input
  const handleDigitChange = useCallback(
    (index: number, value: string) => {
      const digit = cleanSessionCode(value.slice(-1));
      if (!digit) return;
      const newCode =
        code.slice(0, index) + digit + code.slice(index + 1, maxLength);
      fireChange(newCode);
      if (index < maxLength - 1) {
        inputRefs[index + 1]?.current?.focus();
      }
    },
    [code, fireChange, inputRefs, maxLength]
  );

  // 6) keyboard nav & backspace logic
  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace") {
        if (!code[index] && index > 0) {
          // move back one
          inputRefs[index - 1]?.current?.focus();
          const newCode = code.slice(0, index - 1) + code.slice(index);
          fireChange(newCode);
        } else {
          // clear current
          const newCode = code.slice(0, index) + code.slice(index + 1);
          fireChange(newCode);
        }
      }
      if (e.key === "ArrowLeft" && index > 0) {
        inputRefs[index - 1]?.current?.focus();
      }
      if (e.key === "ArrowRight" && index < maxLength - 1) {
        inputRefs[index + 1]?.current?.focus();
      }
    },
    [code, fireChange, inputRefs, maxLength]
  );

  // 7) reset all slots
  const reset = useCallback(() => {
    fireChange("");
    inputRefs[0]?.current?.focus();
  }, [fireChange, inputRefs]);

  return {
    code,
    isValid: isValidSessionCode(code),
    handleCodeChange,
    handleDigitChange,
    handleKeyDown,
    reset,
    inputRefs,
  };
}
