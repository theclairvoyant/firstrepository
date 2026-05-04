// Shared bio validation. Creator bios in any workspace cannot contain URLs;
// the conversion CTA is the only blessed place to put a link on a post.

// Catches bare http(s)://, common www. prefixes, and naked domain.tld
// patterns (mostly common TLDs to avoid false positives on filenames or
// product strings like "v1.2"). Tuned for short bio strings, not academic
// rigor.
const URL_PATTERNS: readonly RegExp[] = [
  /\bhttps?:\/\/\S+/i,
  /\bwww\.\S+/i,
  /\b[a-z0-9-]+\.(?:com|net|org|io|co|app|dev|ai|me|us|uk|in|gg|xyz|info|biz|store|shop|link)\b/i,
];

export function bioContainsUrl(value: string): boolean {
  if (!value) return false;
  return URL_PATTERNS.some((re) => re.test(value));
}
