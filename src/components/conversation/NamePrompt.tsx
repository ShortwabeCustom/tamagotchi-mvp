"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { DISPLAY_NAME_MAX_LENGTH, validateDisplayName } from "@/lib/validation/display-name";
import styles from "./Conversation.module.css";

interface NamePromptProps {
  error?: string;
  initialValue?: string;
  isSubmitting: boolean;
  onSubmit: (displayName: string) => void;
}

export function NamePrompt({ error, initialValue = "", isSubmitting, onSubmit }: NamePromptProps) {
  const [value, setValue] = useState(initialValue);
  const [localError, setLocalError] = useState<string>();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSubmitting) return;
    const hasCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
    if (hasCoarsePointer && !error) return;

    inputRef.current?.focus({ preventScroll: true });
  }, [error, isSubmitting]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateDisplayName(value);

    if (!result.valid) {
      setLocalError(result.error);
      return;
    }

    setLocalError(undefined);
    onSubmit(result.value);
  }

  const visibleError = localError ?? error;

  return (
    <form className={styles.form} aria-busy={isSubmitting} onSubmit={handleSubmit} noValidate>
      <label htmlFor="displayName">Tu nombre</label>
      <div className={styles.inputRow}>
        <input
          ref={inputRef}
          id="displayName"
          name="displayName"
          type="text"
          value={value}
          maxLength={DISPLAY_NAME_MAX_LENGTH}
          autoComplete="name"
          autoCapitalize="words"
          disabled={isSubmitting}
          aria-describedby={visibleError ? "displayName-error" : undefined}
          aria-invalid={Boolean(visibleError)}
          onChange={(event) => {
            setValue(event.target.value);
            if (localError) setLocalError(undefined);
          }}
        />
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Guardando…" : "Decírselo"}
        </button>
      </div>
      {visibleError ? (
        <p id="displayName-error" className={styles.error} role="alert">
          {visibleError}
        </p>
      ) : null}
      {isSubmitting ? (
        <p className={styles.status} role="status">
          Un momento…
        </p>
      ) : null}
    </form>
  );
}
