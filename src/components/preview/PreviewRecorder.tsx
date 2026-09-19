"use client";
import { useEffect, useRef, useState } from "react";

/** Development preview only. Records the existing Canvas locally; never sends media or actions to an API. */
export function PreviewRecorder({ onFixture, onReducedMotion, disabled }: { onFixture: (value: string) => void; onReducedMotion: (value: boolean) => void; disabled: boolean }) {
  const [recording, setRecording] = useState(false);
  const [video, setVideo] = useState<string | null>(null);
  const [error, setError] = useState("");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const url = useRef<string | null>(null);
  const alive = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      timers.current.forEach(clearTimeout);
      if (recorder.current?.state === "recording") recorder.current.stop();
      stream.current?.getTracks().forEach(track => track.stop());
      if (url.current) URL.revokeObjectURL(url.current);
    };
  }, []);
  function record() {
    const canvas = document.querySelector("canvas");
    if (!canvas || !canvas.captureStream || typeof MediaRecorder === "undefined") { setError("Este navegador no permite grabar el Canvas."); return; }
    try {
      if (url.current) URL.revokeObjectURL(url.current);
      setVideo(null); setError("");
      onReducedMotion(false);
      // Keep the scene visible so its offscreen pause does not freeze the capture.
      canvas.scrollIntoView({ block: "center", behavior: "instant" });
      timers.current.forEach(clearTimeout);
      const media = canvas.captureStream(30);
      stream.current = media;
      const mimeType = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find(type => MediaRecorder.isTypeSupported(type));
      if (!mimeType) { media.getTracks().forEach(track => track.stop()); setError("No hay un codificador WebM disponible."); return; }
      const recording = new MediaRecorder(media, { mimeType, videoBitsPerSecond: 3000000 });
      recorder.current = recording;
      const chunks: Blob[] = [];
      recording.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recording.onstop = () => {
        media.getTracks().forEach(track => track.stop());
        if (!alive.current) return;
        const blob = new Blob(chunks, { type: "video/webm" });
        url.current = URL.createObjectURL(blob); setVideo(url.current); setRecording(false);
      };
      recording.start(); setRecording(true); onFixture("Despertar");
      timers.current = [
        setTimeout(() => onFixture("En calma"), 2400),
        setTimeout(() => onFixture("Curiosidad"), 4400),
        setTimeout(() => onFixture("Alegría"), 6500),
        setTimeout(() => { if (recording.state === "recording") recording.stop(); }, 9000),
      ];
    } catch {
      stream.current?.getTracks().forEach(track => track.stop());
      setRecording(false); setError("No fue posible grabar. La escena sigue disponible.");
    }
  }
  return <div style={{ margin: "12px 0", fontSize: 11 }}>
    <button disabled={disabled || recording} onClick={record}>{recording ? "Grabando secuencia local…" : "Grabar secuencia QA"}</button>
    <span role="status" style={{ marginLeft: 12 }}>{recording ? "Despertar → calma → curiosidad → alegría · 9 s" : error}</span>
    {video && <div><video src={video} controls aria-label="Clip local de las expresiones de Miso" style={{ display: "block", width: "min(100%, 520px)", marginTop: 12 }} /><a href={video} download="miso-expresiones.webm">Descargar clip local</a></div>}
  </div>;
}
