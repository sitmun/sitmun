export function featureTypeNames(
  names: readonly (string | null | undefined)[] | string | null | undefined
): string[] {
  const list = Array.isArray(names) ? names : names == null || names === '' ? [] : [names];
  return list
    .map((name) => (typeof name === 'string' ? name.trim() : ''))
    .filter((name) => name !== '');
}

export function featureTypeLayerTitle(
  title: string | undefined,
  featureType: string,
  count: number
): string | undefined {
  if (title == null || count < 2) {
    return title;
  }
  return `${title} (${featureType})`;
}
