export function takeLastWords(text: string, wordCount: number): string {
  const normalized = text.trim().replace(/\s+/g, " ");
  if (normalized.length === 0) {
    return "";
  }
  const words = normalized.split(" ");
  if (words.length <= wordCount) {
    return normalized;
  }
  return words.slice(-wordCount).join(" ");
}

export function countWords(text: string): number {
  const normalized = text.trim().replace(/\s+/g, " ");
  if (normalized.length === 0) {
    return 0;
  }
  return normalized.split(" ").length;
}

export function truncateToMaxWords(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return "";
  }
  if (words.length <= maxWords) {
    return words.join(" ");
  }
  return words.slice(0, maxWords).join(" ");
}
