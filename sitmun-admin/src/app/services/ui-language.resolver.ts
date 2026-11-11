import { compareNullableString } from '@app/utils/compare-nullable-string';

const PRIMARY_ALIASES: Record<string, string> = {
  pt: 'pt-PT',
  oc: 'oc-aranes',
};

/** Browser language tags, most preferred first. Empty when there is no navigator. */
export function readBrowserLanguages(): string[] {
  if (typeof navigator === 'undefined') {
    return [];
  }
  const tags = navigator.languages?.length ? [...navigator.languages] : [];
  if (navigator.language) {
    tags.push(navigator.language);
  }
  return tags;
}

/** First enabled shortname that matches a browser tag, or null. */
export function matchBrowserLanguage(
  tags: readonly string[] | null | undefined,
  availableShortnames: readonly string[]
): string | null {
  const available = availableShortnames ?? [];
  for (const tag of tags ?? []) {
    if (!tag) {
      continue;
    }
    const exact = available.find(code => code.toLowerCase() === tag.toLowerCase());
    if (exact) {
      return exact;
    }
    const primary = tag.trim().split(/[-_]/)[0]?.toLowerCase();
    if (!primary) {
      continue;
    }
    const alias = PRIMARY_ALIASES[primary];
    if (alias && available.includes(alias)) {
      return alias;
    }
    const byPrimary = available.find(
      code => code.toLowerCase() === primary || code.toLowerCase().startsWith(`${primary}-`)
    );
    if (byPrimary) {
      return byPrimary;
    }
  }
  return null;
}

export function resolveUiLanguage(input: {
  stored: string | null | undefined;
  browser?: string | readonly string[] | null;
  backendDefault: string | null | undefined;
  availableShortnames: string[];
  staticFallback: string;
}): string {
  const available = input.availableShortnames ?? [];
  const inAvailable = (code: string | null | undefined) =>
    !!code && available.includes(code);
  const browserTags = Array.isArray(input.browser)
    ? input.browser
    : input.browser
      ? [input.browser]
      : [];
  const browserMatch = matchBrowserLanguage(browserTags, available);

  if (inAvailable(input.stored)) {
    return input.stored as string;
  }
  if (browserMatch) {
    return browserMatch;
  }
  if (inAvailable(input.backendDefault)) {
    return input.backendDefault as string;
  }
  if (inAvailable(input.staticFallback)) {
    return input.staticFallback;
  }
  if (available.length > 0) {
    return available[0];
  }
  return input.staticFallback || 'en';
}

export function sortByLanguageOrder<T extends { order?: number | null; shortname: string }>(
  langs: T[]
): T[] {
  return [...langs].sort((a, b) => {
    const ao = a.order ?? Number.MAX_SAFE_INTEGER;
    const bo = b.order ?? Number.MAX_SAFE_INTEGER;
    if (ao !== bo) {
      return ao - bo;
    }
    return compareNullableString(a.shortname, b.shortname);
  });
}

/** Treats null/undefined as enabled (matches backend safety). */
export function isLanguageEnabled(language: { enabled?: boolean | null } | null | undefined): boolean {
  return language?.enabled !== false;
}

export function filterEnabledLanguages<T extends { enabled?: boolean | null }>(langs: T[]): T[] {
  return (langs ?? []).filter(isLanguageEnabled);
}
