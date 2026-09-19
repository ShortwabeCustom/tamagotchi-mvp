"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { Conversation } from "@/components/conversation/Conversation";
import { Envelope } from "@/components/envelope/Envelope";
import { Letter } from "@/components/letter/Letter";
import { PetRenderer } from "@/components/pet/PetRenderer";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { trackEvent } from "@/lib/analytics/track-event";
import { RECOVERABLE_NAME_ERROR } from "@/lib/profile/profile-client";
import { createRegistrationSession } from "@/lib/profile/registration-session";
import { IdentityError } from "@/lib/profile/identity-errors";
import { createInitialExperienceState, experienceReducer } from "./experience-machine";
import styles from "./Experience.module.css";

interface ExperienceProps {
  testScenario?: string;
  rendererMode?: "2d" | "3d";
  rendererTimeoutMs?: number;
  initialDisplayName?: string;
  initialMemoryStatus?: "resolved" | "unavailable";
}

export function Experience({
  testScenario,
  rendererMode = "2d",
  rendererTimeoutMs = 6000,
  initialDisplayName,
  initialMemoryStatus = "resolved",
}: ExperienceProps) {
  const [state, dispatch] = useReducer(experienceReducer, initialDisplayName, createInitialExperienceState);
  const [rendererReady, setRendererReady] = useState(false);
  const [rendererFallback, setRendererFallback] = useState(false);
  const [revealFinished, setRevealFinished] = useState(false);
  const registration = useRef<ReturnType<typeof createRegistrationSession> | undefined>(undefined);
  const [submissionStep, setSubmissionStep] = useState<"preparing" | "saving">("preparing");
  const mounted = useRef(false);
  const confirmationTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const onRendererReady = useCallback((mode: "2d" | "3d") => {
    if (mode === "2d" && rendererMode === "3d") setRendererFallback(true);
    setRendererReady(true);
  }, [rendererMode]);
  const onAwake = useCallback(() => dispatch({ type: "PET_AWAKE" }), []);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; registration.current?.cancel(); registration.current = undefined; clearTimeout(confirmationTimer.current); };
  }, []);
  const systemReducedMotion = usePrefersReducedMotion();
  // Development-only fault injection for acceptance tests on the real route.
  const scenario = process.env.NODE_ENV === "development" ? testScenario : undefined;
  const prefersReducedMotion = systemReducedMotion || scenario === "reduced-motion";
  const [contextFailed, setContextFailed] = useState(false);
  useEffect(() => {
    if (scenario !== "context" || state.phase !== "ASKING_NAME") return;
    const timer = setTimeout(() => setContextFailed(true), 12000);
    return () => clearTimeout(timer);
  }, [scenario, state.phase]);
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

    if (state.phase === "OPENING") {
      // transitionend is preferred; this also covers reduced motion or a missing event.
      timer = setTimeout(() => dispatch({ type: "ENVELOPE_OPENED" }), prefersReducedMotion ? 30 : 1200);
    } else if (state.phase === "REVEAL") {
      timer = setTimeout(() => {
        setRevealFinished(true);
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
    if (state.phase !== "REVEAL" || !rendererReady || !revealFinished) return;
    trackEvent("pet_revealed");
    dispatch({ type: "PET_VISIBLE" });
  }, [state.phase, rendererReady, revealFinished]);

  async function submitName(displayName: string) {
    if (submissionInFlight.current) return;
    submissionInFlight.current = true;
    dispatch({ type: "NAME_SUBMITTED", displayName });
    trackEvent("name_submitted");

    try {
      registration.current ??= createRegistrationSession();
      const response = await registration.current.submit(displayName, step => { if (mounted.current) setSubmissionStep(step); });
      if (!mounted.current) return;
      if (response.firstMemoryCreated) trackEvent("first_memory_created");
      dispatch({ type: "NAME_PERSISTED", displayName: response.displayName });
      confirmationTimer.current = setTimeout(() => {
        if (mounted.current) dispatch({ type: "NAME_REMEMBERED" });
      }, prefersReducedMotion ? 30 : 1450);
    } catch (error) {
      if (!mounted.current) return;
      if (process.env.NODE_ENV === "development") {
        console.error("Unable to persist display name", error);
      }
      dispatch({
        type: "NAME_FAILED",
        message: error instanceof IdentityError ? error.message : RECOVERABLE_NAME_ERROR,
      });
    } finally {
      submissionInFlight.current = false;
    }
  }

  if (initialMemoryStatus === "unavailable") return <main className={styles.companionStage}>
    <section role="status"><p>No pude recuperar tu recuerdo ahora.</p><button onClick={() => window.location.reload()}>Volver a intentar</button></section>
  </main>;

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
      data-submission-step={state.phase === "ASKING_NAME" && state.nameSubmission === "pending" ? submissionStep : undefined}
      data-phase={state.phase}
      data-renderer={rendererFallback ? "2d" : rendererMode}
      className={`${styles.companionStage} ${state.phase === "REVEAL" ? styles.revealing : ""}`}
    >
      {rendererMode === "2d" && <div className={styles.glow} aria-hidden="true" />}
      <div className={`${styles.petFrame} ${rendererMode === "3d" ? styles.sceneFrame : ""}`} onAnimationEnd={event => {
        if (event.target === event.currentTarget && state.phase === "REVEAL") setRevealFinished(true);
      }}>
        <PetRenderer action={state.petAction} mode={rendererFallback ? "2d" : rendererMode}
          reducedMotion={prefersReducedMotion}
          failure={contextFailed ? "context" : scenario === "timeout" ? "timeout" : scenario === "import" ? "import" : "none"}
          loadTimeoutMs={rendererTimeoutMs} onReady={onRendererReady}
          holdAwakening={state.phase === "REVEAL"} onActionComplete={onAwake} />
      </div>
      {showConversation ? (
        <Conversation state={state} returningReady={true} onSubmitName={submitName} />
      ) : (
        <span className={styles.srOnly} aria-live="polite">Miso está despertando.</span>
      )}
    </main>
  );
}
