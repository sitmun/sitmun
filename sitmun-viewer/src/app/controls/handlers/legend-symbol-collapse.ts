export const LEGEND_SYMBOLS_COLLAPSED = 'sitmun-legend-symbols-collapsed';

const USER_TOGGLE = 'sitmunLegendToggle';

export function isLegendHeadingToggleTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }
  if (target.closest('.tc-ctl-legend-watch, .tc-ctl-legend-img, img, a')) {
    return false;
  }
  const title = target.closest('.tc-ctl-legend-title');
  const entry = title?.closest('sitna-layer-legend');
  if (!title || !entry) {
    return false;
  }
  const top = entry.querySelector(
    ':scope > .tc-ctl-legend-node > .tc-ctl-legend-title'
  );
  const breadcrumb = entry.querySelector(
    ':scope > .tc-ctl-legend-node > .tc-ctl-legend-branch > .tc-ctl-legend-node > .tc-ctl-legend-title'
  );
  return title === top || title === breadcrumb;
}

export function shouldRefreshLegendOnPanelClick(target: EventTarget | null): boolean {
  return !isLegendHeadingToggleTarget(target);
}

export function toggleLegendSymbols(entry: HTMLElement): void {
  const collapsed = entry.classList.toggle(LEGEND_SYMBOLS_COLLAPSED);
  entry.dataset[USER_TOGGLE] = 'user';
  entry.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
}

/**
 * One legend stays expanded. A newly added legend collapses the others.
 * Later redraws keep a heading the user has already toggled.
 */
export function syncLegendSymbolCollapse(
  entries: HTMLElement[],
  knownIds: Set<string>
): void {
  const present = new Set<string>();
  const newcomers: HTMLElement[] = [];
  for (const entry of entries) {
    const id = entry.dataset['layerId'] ?? '';
    if (!id) {
      continue;
    }
    present.add(id);
    if (!knownIds.has(id)) {
      newcomers.push(entry);
    }
  }

  if (entries.length <= 1) {
    for (const entry of entries) {
      if (entry.dataset[USER_TOGGLE] === 'user') {
        continue;
      }
      entry.classList.remove(LEGEND_SYMBOLS_COLLAPSED);
      entry.setAttribute('aria-expanded', 'true');
    }
  } else if (newcomers.length > 0) {
    const keep = newcomers[newcomers.length - 1];
    for (const entry of entries) {
      const collapsed = entry !== keep;
      entry.classList.toggle(LEGEND_SYMBOLS_COLLAPSED, collapsed);
      delete entry.dataset[USER_TOGGLE];
      entry.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    }
  }

  for (const id of knownIds) {
    if (!present.has(id)) {
      knownIds.delete(id);
    }
  }
  for (const id of present) {
    knownIds.add(id);
  }
}
