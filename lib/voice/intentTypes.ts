// Matches the output schema defined in docs/voice-parser-prompt.md exactly.
// This is the shape OpenAI returns after parsing a grocery voice command.

export type VoiceIntent =
  | "ADD_ITEM"
  | "REMOVE_ITEM"
  | "CHECK_OFF"
  | "UNCHECK"
  | "CREATE_SPACE";

export interface VoiceItem {
  name: string;
  quantity: number | null;
  unit: string | null;
  notes: string | null;
  categoryHint: string | null;
}

export interface VoiceAction {
  intent: VoiceIntent;
  items: VoiceItem[];
  space: string | null;
}

export interface VoiceActionsResult {
  actions: VoiceAction[];
}
