export interface ParsedVoiceItem {
  name: string;
  quantity?: string;
}

function normalizeItemName(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^(a|an|the|some)\s+/i, "")
    .trim();
}

function extractAddPayload(transcript: string): string {
  const cleaned = transcript.trim();
  if (!cleaned) return "";

  const leadingCommand = cleaned.match(
    /^(please\s+)?(can\s+you\s+)?(add|buy|get|put)\s+/i,
  );

  return leadingCommand ? cleaned.slice(leadingCommand[0].length) : cleaned;
}

export function parseVoiceAddItems(transcript: string): ParsedVoiceItem[] {
  const payload = extractAddPayload(transcript);
  if (!payload) return [];

  const rawItems = payload
    .split(/,|\band\b/gi)
    .map((part) => normalizeItemName(part))
    .filter(Boolean);

  const deduped = new Set<string>();
  const parsed: ParsedVoiceItem[] = [];

  rawItems.forEach((item) => {
    const key = item.toLowerCase();
    if (!deduped.has(key)) {
      deduped.add(key);
      parsed.push({ name: item });
    }
  });

  return parsed;
}
