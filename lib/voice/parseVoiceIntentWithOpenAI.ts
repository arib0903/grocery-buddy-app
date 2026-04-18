// Sends the raw voice transcript to OpenAI and returns typed grocery actions.
// Uses a published prompt stored in OpenAI (prompt ID below) instead of an
// inline system prompt — edit the prompt in the OpenAI dashboard, not here.

import { VoiceActionsResult } from "./intentTypes";

const PROMPT_ID = "pmpt_69da56d71d68819687417939ff93307b00d2ae1dcfb56b69";

export async function parseVoiceIntentWithOpenAI(
  transcript: string,
): Promise<VoiceActionsResult> {
  const apiKey = process.env.EXPO_PUBLIC_OPEN_AI_KEY;
  if (!apiKey || apiKey === "paste-your-openai-key-here") {
    throw new Error(
      "OpenAI API key not configured. Add EXPO_PUBLIC_OPEN_AI_KEY to grocery-buddy/.env and restart the dev server.",
    );
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      prompt: { id: PROMPT_ID, version: "1" },
      input: [{ role: "user", content: transcript }],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`OpenAI request failed (${response.status}): ${errorBody}`);
  }

  const data = (await response.json()) as {
    output?: { type: string; content?: { type: string; text: string }[] }[];
  };

  const text = data.output
    ?.find((block) => block.type === "message")
    ?.content?.find((c) => c.type === "output_text")
    ?.text;

  if (!text) throw new Error("Empty response from OpenAI.");

  const parsed = JSON.parse(text) as VoiceActionsResult;
  if (!Array.isArray(parsed.actions)) {
    throw new Error("OpenAI response missing actions array.");
  }

  return parsed;
}
