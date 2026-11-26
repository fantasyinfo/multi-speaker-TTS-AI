/**
 * Separate a leading bracketed emotion tag (e.g. "[excited] Hello!") from dialogue text.
 * Returns { emotion: string | null, transcript: string }.
 */
export function extractEmotionFromDialogue(rawText) {
  const input = String(rawText ?? '');
  const match = input.match(/^\s*\[([a-zA-Z][a-zA-Z0-9 _-]{0,30})\]\s*([\s\S]*)$/);
  if (!match) {
    return {
      emotion: null,
      transcript: input.trim(),
    };
  }

  const emotion = match[1].trim().toLowerCase().replace(/\s+/g, '_');
  const transcript = match[2].trim();

  return {
    emotion: emotion || null,
    transcript,
  };
}
