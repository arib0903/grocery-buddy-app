/*
 * Blueprint voice command hook.
 *
 * Thin wrapper around useVoiceCommands that provides the list-specific
 * onApply implementation. Pulls list mutators directly from listContext.
 *
 * Supported intents: ADD_ITEM, REMOVE_ITEM
 * Skipped intents:   CHECK_OFF, UNCHECK, CREATE_SPACE
 *   — A blueprint is a reusable template; there is nothing to check off.
 *     These intents are filtered out before the confirmation alert so the
 *     user never sees actions that would silently do nothing.
 */

import { useLists } from "../state/listContext";
import { useVoiceCommands, UseVoiceCommandsValue } from "./useVoiceCommands";
import { VoiceAction } from "./intentTypes";

// ========================================
// SECTION 1: HOOK CONTRACT
// ========================================

interface UseBlueprintVoiceCommandsParams {
  listId: string;
  setManualName: (value: string) => void;
}

// ========================================
// SECTION 2: TRANSFORM
// ========================================

// Filter to only the intents a blueprint can act on.
const BLUEPRINT_INTENTS = new Set(["ADD_ITEM", "REMOVE_ITEM"]);

const filterBlueprintActions = (actions: VoiceAction[]): VoiceAction[] =>
  actions.filter((a) => BLUEPRINT_INTENTS.has(a.intent));

// ========================================
// SECTION 3: MAIN HOOK
// ========================================

export function useBlueprintVoiceCommands({
  listId,
  setManualName,
}: UseBlueprintVoiceCommandsParams): UseVoiceCommandsValue {
  const { addItemToList, deleteItemByName } = useLists();

  // ------------------------------------------
  // FUNCTION: onApply
  // ------------------------------------------
  // Translates each VoiceAction into the matching listContext mutation.

  const onApply = (actions: VoiceAction[]) => {
    actions.forEach((action) => {
      action.items.forEach((item) => {
        switch (action.intent) {
          case "ADD_ITEM":
            addItemToList(
              listId,
              item.name,
              item.quantity ?? undefined,
              item.unit ?? undefined,
              item.categoryHint ?? undefined,
            );
            break;
          case "REMOVE_ITEM":
            deleteItemByName(listId, item.name);
            break;
          default:
            break;
        }
      });
    });
  };

  return useVoiceCommands({
    onApply,
    setManualName,
    transformActions: filterBlueprintActions,
  });
}
