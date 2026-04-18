/*
 * Shopping-mode voice command hook.
 *
 * Thin wrapper around useVoiceCommands that provides the session-specific
 * onApply implementation. Pulls session mutators directly from sessionContext
 * rather than accepting them as injected params.
 *
 * Supported intents: ADD_ITEM, REMOVE_ITEM, CHECK_OFF, UNCHECK
 */

import { useSessions } from "../state/sessionContext";
import { useVoiceCommands, UseVoiceCommandsValue } from "./useVoiceCommands";
import { VoiceAction } from "./intentTypes";

// ========================================
// SECTION 1: HOOK CONTRACT
// ========================================

interface UseShoppingVoiceCommandsParams {
  sessionId: string;
  setManualName: (value: string) => void;
}

// ========================================
// SECTION 2: MAIN HOOK
// ========================================

export function useShoppingVoiceCommands({
  sessionId,
  setManualName,
}: UseShoppingVoiceCommandsParams): UseVoiceCommandsValue {
  const { addItemToSession, removeItemFromSession, setSessionItemCompleted } =
    useSessions();

  // ------------------------------------------
  // FUNCTION: onApply
  // ------------------------------------------
  // Translates each VoiceAction into the matching sessionContext mutation.

  const onApply = (actions: VoiceAction[]) => {
    actions.forEach((action) => {
      action.items.forEach((item) => {
        switch (action.intent) {
          case "ADD_ITEM":
            addItemToSession(
              sessionId,
              item.name,
              item.quantity ?? undefined,
              item.unit ?? undefined,
              item.categoryHint ?? undefined,
            );
            break;
          case "REMOVE_ITEM":
            removeItemFromSession(sessionId, item.name);
            break;
          case "CHECK_OFF":
            setSessionItemCompleted(sessionId, item.name, true);
            break;
          case "UNCHECK":
            setSessionItemCompleted(sessionId, item.name, false);
            break;
          default:
            break;
        }
      });
    });
  };

  return useVoiceCommands({ onApply, setManualName });
}
