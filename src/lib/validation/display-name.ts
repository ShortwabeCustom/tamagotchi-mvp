export const DISPLAY_NAME_MAX_LENGTH = 60;

export type DisplayNameValidation =
  | { valid: true; value: string }
  | { valid: false; error: string };

export function validateDisplayName(input: unknown): DisplayNameValidation {
  if (typeof input !== "string") {
    return { valid: false, error: "Escribe tu nombre para que Miso pueda recordarlo." };
  }

  const value = input.trim().replace(/\s+/gu, " ");

  if (!value) {
    return { valid: false, error: "Escribe tu nombre para que Miso pueda recordarlo." };
  }

  if (Array.from(value).length > DISPLAY_NAME_MAX_LENGTH) {
    return { valid: false, error: "Tu nombre debe tener 60 caracteres o menos." };
  }

  if (/[\u0000-\u001f\u007f]/u.test(value)) {
    return { valid: false, error: "Ese nombre contiene caracteres que no puedo guardar." };
  }

  return { valid: true, value };
}
