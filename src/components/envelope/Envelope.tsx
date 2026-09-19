import styles from "./Envelope.module.css";

interface EnvelopeProps {
  isOpening: boolean;
  onOpen: () => void;
  onOpened: () => void;
}

export function Envelope({ isOpening, onOpen, onOpened }: EnvelopeProps) {
  return (
    <section className={styles.stage} aria-labelledby="invitation-title">
      <p id="invitation-title" className={styles.eyebrow}>
        Es para ti.
      </p>

      <button
        type="button"
        className={`${styles.envelopeButton} ${isOpening ? styles.opening : ""}`}
        onClick={onOpen}
        disabled={isOpening}
        aria-label="Abrir el sobre"
      >
        <span className={styles.shadow} aria-hidden="true" />
        <span className={styles.envelope} aria-hidden="true">
          <span className={styles.letterPreview} />
          <span
            className={styles.flap}
            onTransitionEnd={(event) => {
              if (event.propertyName === "transform" && isOpening) {
                onOpened();
              }
            }}
          />
          <span className={styles.frontLeft} />
          <span className={styles.frontRight} />
          <span className={styles.frontBottom} />
          <span className={styles.seal}>M</span>
        </span>
      </button>

      <p className={styles.hint}>Toca el sobre para abrirlo</p>
    </section>
  );
}
