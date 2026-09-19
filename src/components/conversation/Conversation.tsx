import { useEffect, useRef } from "react";
import type { ExperienceState } from "@/types/experience";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { NamePrompt } from "./NamePrompt";
import styles from "./Conversation.module.css";

interface ConversationProps {
  state: Extract<ExperienceState, { phase: "ASKING_NAME" | "REMEMBERING_NAME" | "COMPANION" }>;
  returningReady: boolean;
  onSubmitName: (displayName: string) => void;
}

export function Conversation({ state, returningReady, onSubmitName }: ConversationProps) {
  const bubbleRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (state.phase !== "ASKING_NAME" || state.dialogueStage !== "question") return;
    bubbleRef.current?.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "nearest",
    });
  }, [prefersReducedMotion, state]);

  if (state.phase === "COMPANION" && state.returning && !returningReady) return null;

  if (state.phase === "ASKING_NAME") {
    return (
      <section ref={bubbleRef} className={styles.bubble} aria-live="polite">
        <p>¿Hola…? Creo que tú eres la persona que estaba esperando.</p>
        {state.dialogueStage === "question" ? (
          <>
            <p className={styles.followUp}>Antes de empezar… ¿cómo te llamas?</p>
            <NamePrompt
              error={state.error}
              initialValue={state.draftName}
              isSubmitting={state.nameSubmission === "pending"}
              onSubmit={onSubmitName}
            />
          </>
        ) : null}
      </section>
    );
  }

  if (state.phase === "REMEMBERING_NAME") {
    return (
      <section ref={bubbleRef} className={`${styles.bubble} ${styles.centered}`} aria-live="polite">
        <p>{state.displayName}… me gusta. Voy a intentar acordarme siempre.</p>
      </section>
    );
  }

  return (
    <section ref={bubbleRef} className={`${styles.bubble} ${styles.centered}`} aria-live="polite">
      {state.returning ? (
        <>
          <p>Hola, {state.displayName}.</p>
          <p className={styles.followUp}>Sabía que volverías.</p>
        </>
      ) : (
        <p>{state.displayName}… me gusta. Voy a intentar acordarme siempre.</p>
      )}
    </section>
  );
}
