"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { Conversation } from "@/components/conversation/Conversation";
import { Envelope } from "@/components/envelope/Envelope";
import { Letter } from "@/components/letter/Letter";
import { PetRenderer } from "@/components/pet/PetRenderer";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { trackEvent } from "@/lib/analytics/track-event";
import { RECOVERABLE_NAME_ERROR, rememberDisplayName } from "@/lib/profile/profile-client";
import { createInitialExperienceState, experienceReducer } from "./experience-machine";
import styles from "./Experience.module.css";

interface ExperienceProps {
  initialDisplayName?: string;
  initialMemoryStatus?: "resolved" | "unavailable";
}

export function Experience({
  initialDisplayName,
  initialMemoryStatus = "resolved",
}: ExperienceProps) {
  const [state, dispatch] = useReducer(experienceReducer, initialDisplayName, createInitialExperienceState);
  const [returningReady, setReturningReady] = useState(!initialDisplayName);
  const prefersReducedMotion = usePrefersReducedMotion();
  const submissionInFlight = useRef(false);

  useEffect(() => {
    trackEvent(initialDisplayName ? "return_visit" : "experience_started");
    if (initialDisplayName) trackEvent("memory_recalled");
    if (initialMemoryStatus === "unavailable") trackEvent("memory_recall_failed");
  }, [initialDisplayName, initialMemoryStatus]);

  useEffect(() => {
    const shortDelay = prefersReducedMotion ? 30 : 620;
    const wakeDelay = prefersReducedMotion ? 60 : 2350;
    const dialogueDelay = prefersReducedMotion ? 60 : 1550;
    let timer: ReturnType<typeof setTimeout> | undefined;

    if (state.phase === "REVEAL") {
      timer = setTimeout(() => {
        trackEvent("pet_revealed");
        dispatch({ type: "PET_VISIBLE" });
      }, shortDelay);
    } else if (state.phase === "PET_AWAKENING") {
      timer = setTimeout(() => dispatch({ type: "PET_AWAKE" }), wakeDelay);
    } else if (state.phase === "ASKING_NAME" && state.dialogueStage === "greeting") {
      timer = setTimeout(() => {
        trackEvent("name_question_shown");
        dispatch({ type: "NAME_REQUESTED" });
      }, dialogueDelay);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [prefersReducedMotion, state]);

  useEffect(() => {
    if (!initialDisplayName) return;
    const timer = setTimeout(() => setReturningReady(true), prefersReducedMotion ? 60 : 2200);
    return () => clearTimeout(timer);
  }, [initialDisplayName, prefersReducedMotion]);

  async function submitName(displayName: string) {
    if (submissionInFlight.current) return;
    submissionInFlight.current = true;
    dispatch({ type: "NAME_SUBMITTED", displayName });
    trackEvent("name_submitted");

    try {
      const response = await rememberDisplayName(displayName);
      if (response.firstMemoryCreated) trackEvent("first_memory_created");
      dispatch({ type: "NAME_PERSISTED", displayName: response.displayName });
      await wait(prefersReducedMotion ? 30 : 1450);
      dispatch({ type: "NAME_REMEMBERED" });
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Unable to persist display name", error);
      }
      dispatch({
        type: "NAME_FAILED",
        message: RECOVERABLE_NAME_ERROR,
      });
    } finally {
      submissionInFlight.current = false;
    }
  }

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

  const showConversation =
    state.phase === "ASKING_NAME" || state.phase === "REMEMBERING_NAME" || state.phase === "COMPANION";

  return (
    <main
      className={`${styles.companionStage} ${state.phase === "REVEAL" ? styles.revealing : ""}`}
    >
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.petFrame}>
        <PetRenderer action={state.petAction} />
      </div>
      {showConversation ? (
        <Conversation state={state} returningReady={returningReady} onSubmitName={submitName} />
      ) : (
        <span className={styles.srOnly} aria-live="polite">Miso está despertando.</span>
      )}
    </main>
  );
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
