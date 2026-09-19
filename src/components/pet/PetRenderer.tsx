"use client";

import type { PetAction } from "@/types/pet";
import { PlaceholderPet } from "./PlaceholderPet";

interface PetRendererProps {
  action: PetAction;
}

export function PetRenderer({ action }: PetRendererProps) {
  return <PlaceholderPet action={action} />;
}
