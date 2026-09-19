"use client";

import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import type { PetAction } from "@/types/pet";
import styles from "./PlaceholderPet.module.css";

interface PlaceholderPetProps {
  action: PetAction;
}

export function PlaceholderPet({ action }: PlaceholderPetProps) {
  const [isBlinking, setIsBlinking] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion || action.animation === "awakening") return;

    let blinkTimeout: ReturnType<typeof setTimeout>;
    let openTimeout: ReturnType<typeof setTimeout>;

    const scheduleBlink = () => {
      blinkTimeout = setTimeout(
        () => {
          setIsBlinking(true);
          openTimeout = setTimeout(() => {
            setIsBlinking(false);
            scheduleBlink();
          }, 145);
        },
        2800 + Math.random() * 3800,
      );
    };

    scheduleBlink();
    return () => {
      clearTimeout(blinkTimeout);
      clearTimeout(openTimeout);
    };
  }, [action.animation, prefersReducedMotion]);

  const className = [
    styles.pet,
    styles[action.animation],
    styles[action.emotion],
    isBlinking ? styles.isBlinking : "",
  ].join(" ");

  return (
    <div
      className={className}
      style={{ "--pet-intensity": action.intensity } as React.CSSProperties}
      role="img"
      aria-label={`Miso está ${emotionLabel(action.emotion)}`}
    >
      <div className={styles.heart} aria-hidden="true" />
      <div className={styles.tail} aria-hidden="true">
        <span />
      </div>
      <div className={styles.body} aria-hidden="true">
        <span className={styles.bodyPatch} />
        <span className={`${styles.paw} ${styles.pawLeft}`} />
        <span className={`${styles.paw} ${styles.pawRight}`} />
      </div>
      <div className={styles.head} aria-hidden="true">
        <span className={`${styles.ear} ${styles.earLeft}`}><i /></span>
        <span className={`${styles.ear} ${styles.earRight}`}><i /></span>
        <span className={`${styles.facePatch} ${styles.facePatchLeft}`} />
        <span className={`${styles.facePatch} ${styles.facePatchRight}`} />
        <span className={styles.creamMuzzle} />
        <span className={`${styles.eye} ${styles.eyeLeft}`}><i /></span>
        <span className={`${styles.eye} ${styles.eyeRight}`}><i /></span>
        <span className={styles.nose} />
        <span className={styles.mouth} />
        <span className={`${styles.whiskers} ${styles.whiskersLeft}`} />
        <span className={`${styles.whiskers} ${styles.whiskersRight}`} />
      </div>
      <div className={styles.bandana} aria-hidden="true">
        <span className={styles.bandanaDotOne} />
        <span className={styles.bandanaDotTwo} />
        <span className={styles.bandanaKnot} />
      </div>
    </div>
  );
}

function emotionLabel(emotion: PetAction["emotion"]): string {
  const labels: Record<PetAction["emotion"], string> = {
    neutral: "tranquila",
    curious: "curiosa",
    happy: "feliz",
    surprised: "sorprendida",
    sleepy: "soñolienta",
    thinking: "pensativa",
  };

  return labels[emotion];
}
