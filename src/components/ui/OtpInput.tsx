"use client";

import { cn } from "@/lib/utils";
import { useRef, useState, useEffect, type KeyboardEvent, type ClipboardEvent } from "react";

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

export function OtpInput({
  length = 6,
  value,
  onChange,
  error,
  disabled,
}: OtpInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const digits = value.padEnd(length, " ").split("").slice(0, length);

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  const updateValue = (index: number, digit: string) => {
    const arr = digits.map((d) => (d === " " ? "" : d));
    arr[index] = digit;
    const newValue = arr.join("").trimEnd();
    onChange(newValue.replace(/\s/g, ""));

    if (digit && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!digits[index]?.trim() && index > 0) {
        inputsRef.current[index - 1]?.focus();
        updateValue(index - 1, "");
      } else {
        updateValue(index, "");
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    onChange(pasted);
    const nextIndex = Math.min(pasted.length, length - 1);
    inputsRef.current[nextIndex]?.focus();
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-center gap-2 sm:gap-3" role="group" aria-label="Kode verifikasi">
        {Array.from({ length }).map((_, i) => (
          <input
            key={i}
            ref={(el) => { inputsRef.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digits[i]?.trim() || ""}
            disabled={disabled}
            aria-label={`Digit ${i + 1}`}
            onFocus={() => setFocusedIndex(i)}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "");
              if (val) updateValue(i, val[0]);
            }}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            className={cn(
              "h-12 w-10 sm:h-14 sm:w-12 rounded-md border text-center text-lg font-semibold",
              "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
              "transition-all duration-200",
              error ? "border-error" : "border-border",
              focusedIndex === i && "border-primary",
              disabled && "opacity-50"
            )}
          />
        ))}
      </div>
      {error && (
        <p className="text-center text-xs text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
