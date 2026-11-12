/**
 * Loaded Layers paints a new row with the top of the stack first, then a drag
 * rewrites that list in array order. The visible rows are the order to copy.
 */
export function legendIdsInWorkLayerOrder(
  workLayerIds: readonly string[],
  legendIds: readonly string[]
): string[] {
  const wanted = new Set(legendIds.filter((id) => id.length > 0));
  const ordered: string[] = [];
  const seen = new Set<string>();
  for (const id of workLayerIds) {
    if (wanted.has(id) && !seen.has(id)) {
      ordered.push(id);
      seen.add(id);
    }
  }
  for (const id of legendIds) {
    if (id.length > 0 && !seen.has(id)) {
      ordered.push(id);
      seen.add(id);
    }
  }
  return ordered;
}

export function syncLegendOrder(
  legendList: HTMLElement,
  workLayerList: ParentNode
): boolean {
  const entries = Array.from(
    legendList.querySelectorAll(':scope > sitna-layer-legend')
  ) as HTMLElement[];
  const current = entries.map((entry) => entry.dataset['layerId'] ?? '');
  const workLayerIds = Array.from(
    workLayerList.querySelectorAll(':scope > li.tc-ctl-wlm-elm')
  )
    .map((row) => (row as HTMLElement).dataset['layerId'] ?? '')
    .filter((id) => id.length > 0);
  const next = legendIdsInWorkLayerOrder(workLayerIds, current);
  const named = current.filter((id) => id.length > 0);
  if (named.length === next.length && named.every((id, index) => id === next[index])) {
    return false;
  }
  const byId = new Map(
    entries
      .filter((entry) => (entry.dataset['layerId'] ?? '').length > 0)
      .map((entry) => [entry.dataset['layerId'] ?? '', entry])
  );
  for (const id of next) {
    const entry = byId.get(id);
    if (entry) {
      legendList.appendChild(entry);
    }
  }
  return true;
}
