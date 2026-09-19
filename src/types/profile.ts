export interface ProfileResponse {
  displayName: string;
  firstMemoryCreated: boolean;
  petAction: import("@/types/pet").PetAction;
}

export interface ApiErrorResponse {
  error: string;
}
