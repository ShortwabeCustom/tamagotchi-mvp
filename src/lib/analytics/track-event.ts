export type ProductEvent =
  | "experience_started"
  | "envelope_opened"
  | "letter_opened"
  | "surprise_opened"
  | "pet_revealed"
  | "name_question_shown"
  | "name_submitted"
  | "first_memory_created"
  | "return_visit"
  | "memory_recalled"
  | "memory_recall_failed";

export function trackEvent(event: ProductEvent): void {
  if (process.env.NODE_ENV === "development") {
    console.debug(`[bety:event] ${event}`);
  }
}
