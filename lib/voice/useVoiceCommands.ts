/*
 * Generic voice command pipeline shared by both shopping and blueprint screens.
 *
 * Responsibilities:
 * 1) Receive final transcript from useVoiceToText.
 * 2) Parse transcript into actions via OpenAI.
 * 3) Optionally transform actions before display (e.g. filter unsupported intents).
 * 4) Show confirmation alert with a human-readable summary.
 * 5) Call onApply with the confirmed actions.
 * 6) Expose UI-ready state + mic toggle to the caller.
 *
 * Callers provide:
 *   onApply          — what to do with confirmed actions (session or blueprint mutations)
 *   setManualName    — where to drop the raw transcript on parse failure
 *   transformActions — optional filter/transform run before summary + apply
 */

import { useRef, useState } from "react";
import { Alert } from "react-native";
import { useVoiceToText } from "./useVoiceToText";
import { parseVoiceIntentWithOpenAI } from "./parseVoiceIntentWithOpenAI";
import { VoiceAction } from "./intentTypes";

// ========================================
// SECTION 1: HOOK CONTRACT
// ========================================

interface UseVoiceCommandsParams {
  onApply: (actions: VoiceAction[]) => void;
  setManualName: (value: string) => void;
  // Optional — run before building the summary and calling onApply.
  // Use this to filter out intents that don't apply in the current context.
  transformActions?: (actions: VoiceAction[]) => VoiceAction[];
}

export interface UseVoiceCommandsValue {
  isVoiceAvailable: boolean;
  isListening: boolean;
  lastTranscript: string | null;
  voiceError: string | null;
  isParsing: boolean;
  clearVoiceError: () => void;
  handleVoiceCommand: () => Promise<void>;
}

// ========================================
// SECTION 2: HELPERS
// ========================================

// ------------------------------------------
// FUNCTION: buildVoiceSummaryLines
// ------------------------------------------
// Converts parsed actions into human-readable lines for the confirmation alert.

function buildVoiceSummaryLines(actions: VoiceAction[]): string[] {
  return actions.map((action) => {
    const names = action.items.map((i) => i.name).join(", ");
    switch (action.intent) {
      case "ADD_ITEM":
        return `Add: ${names}`;
      case "REMOVE_ITEM":
        return `Remove: ${names}`;
      case "CHECK_OFF":
        return `Check off: ${names}`;
      case "UNCHECK":
        return `Uncheck: ${names}`;
      case "CREATE_SPACE":
        return `Create list: ${action.space ?? names}`;
      default:
        return "";
    }
  }).filter(Boolean);
}

// ========================================
// SECTION 3: MAIN HOOK
// ========================================

export function useVoiceCommands({
  onApply,
  setManualName,
  transformActions,
}: UseVoiceCommandsParams): UseVoiceCommandsValue {
  const [isParsing, setIsParsing] = useState(false);

  // Guard against stacking multiple confirmation alerts.
  const isVoiceAlertOpenRef = useRef(false);

  // Keep latest callbacks in sync without re-registering listeners.
  const onApplyRef = useRef(onApply);
  onApplyRef.current = onApply;
  const transformActionsRef = useRef(transformActions);
  transformActionsRef.current = transformActions;

  // ------------------------------------------
  // FUNCTION: handleVoiceTranscript
  // ------------------------------------------
  // Parse → transform → preview → apply pipeline for one transcript.

  const handleVoiceTranscript = (transcript: string) => {
    if (isVoiceAlertOpenRef.current) return;

    isVoiceAlertOpenRef.current = true;
    setIsParsing(true);

    parseVoiceIntentWithOpenAI(transcript)
      .then((result) => {
        setIsParsing(false);

        // Apply caller's transform (e.g. blueprint filters out CHECK_OFF/UNCHECK).
        const actions = transformActionsRef.current
          ? transformActionsRef.current(result.actions)
          : result.actions;

        if (actions.length === 0) {
          isVoiceAlertOpenRef.current = false;
          return;
        }

        const lines = buildVoiceSummaryLines(actions);

        Alert.alert(
          "Voice Command",
          `I heard: "${transcript}"\n\n${lines.join("\n")}`,
          [
            {
              text: "Cancel",
              style: "cancel",
              onPress: () => {
                isVoiceAlertOpenRef.current = false;
              },
            },
            {
              text: "Apply",
              onPress: () => {
                onApplyRef.current(actions);
                isVoiceAlertOpenRef.current = false;
              },
            },
          ],
          {
            onDismiss: () => {
              isVoiceAlertOpenRef.current = false;
            },
          },
        );
      })
      .catch((err: Error) => {
        setIsParsing(false);
        isVoiceAlertOpenRef.current = false;
        setManualName(transcript);
        Alert.alert(
          "Could Not Parse Command",
          `${err.message}\n\nTranscript saved in manual input.`,
        );
      });
  };

  const {
    isVoiceAvailable,
    isListening,
    lastTranscript,
    voiceError,
    startListening,
    stopListening,
    clearVoiceError,
  } = useVoiceToText({ onTranscript: handleVoiceTranscript });

  // ------------------------------------------
  // FUNCTION: handleVoiceCommand
  // ------------------------------------------
  // Mic button toggle: stop if already listening, start otherwise.

  const handleVoiceCommand = async () => {
    if (isListening) {
      await stopListening();
      return;
    }
    await startListening();
  };

  return {
    isVoiceAvailable,
    isListening,
    lastTranscript,
    voiceError,
    isParsing,
    clearVoiceError,
    handleVoiceCommand,
  };
}
