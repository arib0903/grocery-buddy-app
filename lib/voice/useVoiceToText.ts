/*
 * This file manages on-device voice-to-text capture lifecycle for the app.
 *
 * Responsibilities:
 * 1) Start/stop native speech recognition.
 * 2) Track listening state and latest transcript text for UI.
 * 3) Emit exactly one final transcript per listening session.
 * 4) Surface permission and recognition errors safely.
 *
 * High-level flow:
 *   A. UI calls startListening()
 *   B. Native events stream interim text (result events with isFinal: false)
 *   C. Hook stores latest interim text
 *   D. Final result arrives (isFinal: true) or recognition ends (end event)
 *   E. Hook emits one final transcript via onTranscript callback
 */

import { useCallback, useRef, useState } from "react";
import { Alert } from "react-native";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";

// ========================================
// SECTION 1: HOOK TYPES
// ========================================

interface UseVoiceToTextOptions {
  onTranscript: (transcript: string) => void;
  locale?: string;
}

interface UseVoiceToTextValue {
  isVoiceAvailable: boolean;
  isListening: boolean;
  lastTranscript: string | null;
  voiceError: string | null;
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  clearVoiceError: () => void;
}

// ========================================
// SECTION 2: MAIN HOOK
// ========================================
// Public hook consumed by screens/components that need speech recognition.
// It returns state + methods to control the recognition session.

export function useVoiceToText({
  onTranscript,
  locale = "en-US",
}: UseVoiceToTextOptions): UseVoiceToTextValue {
  // ------------------------------------------
  // STATE + REFS
  // ------------------------------------------

  // Checked once on mount — synchronous device capability check.
  const [isVoiceAvailable] = useState(
    () => ExpoSpeechRecognitionModule.isRecognitionAvailable(),
  );

  const [isListening, setIsListening] = useState(false);
  const [lastTranscript, setLastTranscript] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  // Stores the most recent interim transcript during one listen cycle.
  const latestTranscriptRef = useRef<string | null>(null);

  // Ensures we only emit onTranscript once per listen cycle.
  // Prevents duplicate parse/alert actions if both isFinal result and end event fire.
  const hasEmittedTranscriptRef = useRef(false);

  // Keeps the latest callback in sync without needing to re-register native listeners.
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  // ------------------------------------------
  // NATIVE EVENT: recognition started
  // ------------------------------------------
  // Reset per-session refs so each mic tap starts a fresh one-shot cycle.

  useSpeechRecognitionEvent("start", () => {
    hasEmittedTranscriptRef.current = false;
    latestTranscriptRef.current = null;
    setIsListening(true);
  });

  // ------------------------------------------
  // NATIVE EVENT: interim / final result
  // ------------------------------------------
  // Keep the latest candidate and expose it to UI via lastTranscript.
  // Emit once immediately when isFinal arrives — avoids waiting for the end event.

  useSpeechRecognitionEvent("result", (event: { results: { transcript: string }[]; isFinal: boolean }) => {
    const transcript = event.results[0]?.transcript?.trim();
    if (!transcript) return;

    latestTranscriptRef.current = transcript;
    setLastTranscript(transcript);

    if (event.isFinal && !hasEmittedTranscriptRef.current) {
      hasEmittedTranscriptRef.current = true;
      ExpoSpeechRecognitionModule.stop();
      onTranscriptRef.current(transcript);
    }
  });

  // ------------------------------------------
  // NATIVE EVENT: recognition ended
  // ------------------------------------------
  // Fallback emit in case the engine ends without firing isFinal (e.g. manual stop).

  useSpeechRecognitionEvent("end", () => {
    setIsListening(false);

    const finalTranscript = latestTranscriptRef.current?.trim();
    if (!finalTranscript || hasEmittedTranscriptRef.current) return;

    hasEmittedTranscriptRef.current = true;
    onTranscriptRef.current(finalTranscript);
  });

  // ------------------------------------------
  // NATIVE EVENT: recognition error
  // ------------------------------------------
  // Stop listening state and surface a readable message to the UI.

  useSpeechRecognitionEvent("error", (event: { error?: string; message?: string }) => {
    setIsListening(false);
    setVoiceError(event.message ?? event.error ?? "Voice recognition failed.");
  });

  // ------------------------------------------
  // FUNCTION: startListening
  // ------------------------------------------
  // Called by UI (usually mic button) to begin recognition.
  // Steps:
  // 1) Verify device capability.
  // 2) Request mic + speech recognition permission.
  // 3) Start native recognition in selected locale.
  // Returns: Promise<void>

  const startListening = useCallback(async () => {
    if (!isVoiceAvailable) {
      setVoiceError("Speech recognition is not available on this device.");
      return;
    }

    const { granted } =
      await ExpoSpeechRecognitionModule.requestPermissionsAsync();

    if (!granted) {
      Alert.alert(
        "Microphone Permission Needed",
        "Enable microphone permission to use voice commands.",
      );
      return;
    }

    try {
      setVoiceError(null);
      ExpoSpeechRecognitionModule.start({ lang: locale, interimResults: true, continuous: true });
    } catch {
      setVoiceError("Could not start voice recognition.");
      setIsListening(false);
    }
  }, [locale, isVoiceAvailable]);

  // ------------------------------------------
  // FUNCTION: stopListening
  // ------------------------------------------
  // Called by UI to manually stop recognition mid-session.
  // Returns: Promise<void>

  const stopListening = useCallback(async () => {
    try {
      ExpoSpeechRecognitionModule.stop();
    } finally {
      setIsListening(false);
    }
  }, []);

  // ------------------------------------------
  // FUNCTION: clearVoiceError
  // ------------------------------------------
  // Resets visible voice error state after user dismisses/acknowledges it.
  // Returns: void

  const clearVoiceError = useCallback(() => {
    setVoiceError(null);
  }, []);

  // ========================================
  // SECTION 3: PUBLIC API
  // ========================================

  return {
    isVoiceAvailable,
    isListening,
    lastTranscript,
    voiceError,
    startListening,
    stopListening,
    clearVoiceError,
  };
}
