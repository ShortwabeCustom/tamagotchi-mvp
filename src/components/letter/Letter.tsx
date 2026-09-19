import styles from "./Letter.module.css";

interface LetterProps {
  onOpenSurprise: () => void;
}

export function Letter({ onOpenSurprise }: LetterProps) {
  return (
    <main className={styles.stage}>
      <article className={styles.letter} aria-labelledby="letter-greeting">
        <div className={styles.paperTexture} aria-hidden="true" />
        <div className={styles.content}>
          <h1 id="letter-greeting">Para ti.</h1>
          <p>A veces se me olvida llegar con flores o tener uno de esos pequeños detalles que pueden hacer especial un día.</p>
          <p>Esta vez quise hacerte algo diferente.</p>
          <p>Una pequeña compañía digital hecha especialmente para ti.</p>
          <p>No quiero que empiece sabiendo todo sobre ti; quiero que te vaya conociendo poco a poco: lo que te gusta, lo que te hace reír, tus comidas favoritas, tus pequeñas costumbres y esas cosas que sólo se descubren cuando realmente conoces a alguien.</p>
          <p>Tal vez ésta también sea una bonita forma de volver a empezar.</p>
          <p>Volver a conocerte, escucharte y descubrirte sin prisa.</p>
          <p>Hay alguien aquí dentro esperando conocerte.</p>
          <button type="button" onClick={onOpenSurprise}>
            Abrir sorpresa <span aria-hidden="true">♡</span>
          </button>
        </div>
      </article>
    </main>
  );
}
