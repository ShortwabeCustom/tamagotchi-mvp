"use client";

import { useEffect, useReducer } from "react";
import { Envelope } from "@/components/envelope/Envelope";
import { Letter } from "@/components/letter/Letter";
import { trackEvent } from "@/lib/analytics/track-event";
import { createInitialExperienceState, experienceReducer } from "./experience-machine";
import styles from "./Experience.module.css";

interface ExperienceProps {
  initialDisplayName?: string;
}

export function Experience({ initialDisplayName }: ExperienceProps) {
  const [state, dispatch] = useReducer(experienceReducer, initialDisplayName, createInitialExperienceState);

  useEffect(() => {
    trackEvent(initialDisplayName ? "return_visit" : "experience_started");
    if (initialDisplayName) trackEvent("memory_recalled");
  }, [initialDisplayName]);

  if (state.phase === "SEALED" || state.phase === "OPENING") {
    return (
      <Envelope
        isOpening={state.phase === "OPENING"}
        onOpen={() => {
          trackEvent("envelope_opened");
          dispatch({ type: "OPEN_ENVELOPE" });
        }}
        onOpened={() => {
          trackEvent("letter_opened");
          dispatch({ type: "ENVELOPE_OPENED" });
        }}
      />
    );
  }

  if (state.phase === "LETTER") {
    return (
      <Letter
        onOpenSurprise={() => {
          trackEvent("surprise_opened");
          dispatch({ type: "OPEN_SURPRISE" });
        }}
      />
    );
  }

  return <main className={styles.revealPlaceholder} aria-live="polite">Un momento…</main>;
}
