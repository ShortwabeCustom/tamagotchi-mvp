"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { createRegistrationSession } from "@/lib/profile/registration-session";
export function IdentityRace() {
  const [result, setResult] = useState("Sin ejecutar");
  const registration = useRef<ReturnType<typeof createRegistrationSession> | undefined>(undefined);
  async function coordinated(hold: boolean) {
    registration.current ??= createRegistrationSession((input, init) => fetch(input === "/api/identity/prepare" ? `/api/qa/identity-race?action=prepare${hold ? "&hold=1" : ""}` : input, init));
    setResult("Registro coordinado pendiente");
    try { setResult(JSON.stringify(await registration.current.submit("Prueba Dos Pestañas"), null, 2)); }
    catch (error) { setResult(error instanceof Error ? error.message : "Error recuperable"); }
  }
  async function action(kind: string) {
    setResult(`Pendiente: ${kind}`);
    const response = await fetch(`/api/qa/identity-race?action=${kind}`, { method: "POST", cache: "no-store" });
    setResult(JSON.stringify({ status: response.status, ...(await response.json()), browser: navigator.userAgent, webLocks: Boolean(navigator.locks) }, null, 2));
  }
  async function save() {
    const response = await fetch("/api/profile/name", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ displayName: "Prueba Dos Pestañas" }) });
    setResult(JSON.stringify({ status: response.status, ...(await response.json()) }, null, 2));
  }
  return <main style={{ padding: 24 }}>
    <h1>Prueba local de dos pestañas</h1>
    <p>Base exclusiva. Ningún token se muestra. Controles solo de desarrollo.</p>
    <button onClick={() => action("status")}>Estado</button>{" "}
    <button onClick={() => action("prepare&hold=1")}>Preparar retenida sin coordinación</button>{" "}
    <button onClick={() => action("prepare")}>Preparar inmediata sin coordinación</button>{" "}
    <button onClick={save}>Guardar sin coordinación</button>{" "}
    <button onClick={() => action("release")}>Liberar respuesta</button>{" "}
    <button onClick={() => action("reset")}>Limpiar solo esta prueba</button>
    <button onClick={() => coordinated(true)}>Registrar coordinado con respuesta retenida</button>{" "}
    <button onClick={() => coordinated(false)}>Registrar coordinado</button>{" "}
    <pre aria-label="Resultado">{result}</pre>
    <Link href="/" prefetch={false}>Abrir experiencia real</Link>
  </main>;
}
