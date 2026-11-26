import { Speaker } from '../types/studio';
import { extractEmotionFromDialogue } from './dialogueEmotion';

export interface ParsedScriptLine {
  rawSpeaker: string;
  text: string;
  emotion: string | null;
  matchedSpeakerId: string | null;
}

export interface ParsedScriptResult {
  lines: ParsedScriptLine[];
  unmatchedSpeakers: string[];
}

function normalizeName(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\u0900-\u097f\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findBestSpeakerMatch(rawSpeaker: string, speakers: Speaker[]): string | null {
  const normRaw = normalizeName(rawSpeaker);
  if (!normRaw) return null;

  const exact = speakers.find((s) => normalizeName(s.name) === normRaw);
  if (exact) return exact.id;

  const prefix = speakers.find((s) => {
    const normSpeaker = normalizeName(s.name);
    const firstWord = normSpeaker.split(' ')[0];
    return normSpeaker.startsWith(normRaw) || firstWord === normRaw || normRaw.startsWith(normSpeaker);
  });

  return prefix ? prefix.id : null;
}

/**
 * Parse structured scripts like:
 *   MOHAN: [calm] बेटा, आज हम बचत के बारे में बात करेंगे।
 *   [curious] CHINTU: लेकिन दादाजी, पैसे बचते ही नहीं हैं!
 * Preserves all lines and keeps leading [emotion] tags intact for editing.
 */
export function parseDialogueScript(rawScript: string, speakers: Speaker[]): ParsedScriptResult {
  const rawLines = rawScript.split(/\r?\n/);
  const parsed: ParsedScriptLine[] = [];
  const speakerPrefixRegex = /^([^:\n]{1,60}):\s*(.+)$/;

  let currentEntry: ParsedScriptLine | null = null;

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      if (currentEntry) {
        parsed.push(currentEntry);
        currentEntry = null;
      }
      continue;
    }

    // Handle optional [emotion] placed before SPEAKER: dialogue
    const preEmotion = extractEmotionFromDialogue(trimmed);
    const lineForSpeakerMatch = preEmotion.emotion && preEmotion.transcript ? preEmotion.transcript : trimmed;

    const match = lineForSpeakerMatch.match(speakerPrefixRegex);
    if (match) {
      if (currentEntry) {
        parsed.push(currentEntry);
      }
      const rawSpeaker = match[1].trim();
      const rawDialogue = match[2].trim();
      const innerEmotion = extractEmotionFromDialogue(rawDialogue);

      const detectedEmotion = innerEmotion.emotion || preEmotion.emotion;
      const formattedText =
        preEmotion.emotion && !innerEmotion.emotion
          ? `[${preEmotion.emotion}] ${rawDialogue}`
          : rawDialogue;

      currentEntry = {
        rawSpeaker,
        text: formattedText,
        emotion: detectedEmotion,
        matchedSpeakerId: findBestSpeakerMatch(rawSpeaker, speakers),
      };
    } else if (currentEntry) {
      currentEntry.text = `${currentEntry.text} ${trimmed}`.trim();
    } else {
      const inner = extractEmotionFromDialogue(trimmed);
      parsed.push({
        rawSpeaker: 'Unassigned',
        text: trimmed,
        emotion: inner.emotion,
        matchedSpeakerId: null,
      });
    }
  }

  if (currentEntry) {
    parsed.push(currentEntry);
  }

  const unmatchedSet = new Set<string>();
  for (const item of parsed) {
    if (!item.matchedSpeakerId) {
      unmatchedSet.add(item.rawSpeaker);
    }
  }

  return {
    lines: parsed,
    unmatchedSpeakers: Array.from(unmatchedSet),
  };
}
