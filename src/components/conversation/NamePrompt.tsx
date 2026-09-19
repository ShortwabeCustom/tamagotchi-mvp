"use client";

import { FormEvent, useState } from "react";
import { DISPLAY_NAME_MAX_LENGTH, validateDisplayName } from "@/lib/validation/display-name";
import styles from "./Conversation.module.css";

interface NamePromptProps {
  error?: string;
  isSubmitting: boolean;
  onSubmit: (displayName: string) => void;
}

export function NamePrompt({ error, isSubmitting, onSubmit }: NamePromptProps) {
  const [value, setValue] = useState("");
  const [localError, setLocalError] = useState<string>();

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
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <label htmlFor="displayName">Tu nombre</label>
      <div className={styles.inputRow}>
        <input
          id="displayName"
          name="displayName"
          type="text"
          value={value}
          maxLength={DISPLAY_NAME_MAX_LENGTH}
          autoComplete="name"
          autoCapitalize="words"
          autoFocus
          disabled={isSubmitting}
          aria-describedby={visibleError ? "displayName-error" : undefined}
          aria-invalid={Boolean(visibleError)}
          onChange={(event) => {
            setValue(event.target.value);
            if (localError) setLocalError(undefined);
          }}
        />
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Recordando…" : "Decírselo"}
        </button>
      </div>
      {visibleError ? (
        <p id="displayName-error" className={styles.error} role="alert">
          {visibleError}
        </p>
      ) : null}
    </form>
  );
}
