import {
  isLegendHeadingToggleTarget,
  LEGEND_SYMBOLS_COLLAPSED,
  shouldRefreshLegendOnPanelClick,
  syncLegendSymbolCollapse,
  toggleLegendSymbols
} from './legend-symbol-collapse';

function entry(id: string): HTMLElement {
  const el = document.createElement('sitna-layer-legend');
  el.dataset['layerId'] = id;
  el.innerHTML = `
    <li class="tc-ctl-legend-node">
      <div class="tc-ctl-legend-title">Folder</div>
      <ul class="tc-ctl-legend-branch">
        <li class="tc-ctl-legend-node tc-ctl-legend-leaf">
          <div class="tc-ctl-legend-title">Path</div>
          <div class="tc-ctl-legend-watch"><img alt=""></div>
        </li>
      </ul>
    </li>
  `;
  return el;
}

describe('legend symbol collapse', () => {
  it('leaves a single legend expanded', () => {
    const known = new Set<string>();
    const only = entry('trams');
    only.classList.add(LEGEND_SYMBOLS_COLLAPSED);

    syncLegendSymbolCollapse([only], known);

    expect(only.classList.contains(LEGEND_SYMBOLS_COLLAPSED)).toBe(false);
    expect(only.getAttribute('aria-expanded')).toBe('true');
  });

  it('collapses the previous legend when a second one appears', () => {
    const known = new Set<string>();
    const first = entry('trams');
    syncLegendSymbolCollapse([first], known);
    const second = entry('sol');

    syncLegendSymbolCollapse([first, second], known);

    expect(first.classList.contains(LEGEND_SYMBOLS_COLLAPSED)).toBe(true);
    expect(second.classList.contains(LEGEND_SYMBOLS_COLLAPSED)).toBe(false);
    expect(first.getAttribute('aria-expanded')).toBe('false');
    expect(second.getAttribute('aria-expanded')).toBe('true');
  });

  it('keeps a heading the user opened when the legend redraws', () => {
    const known = new Set<string>();
    const first = entry('trams');
    const second = entry('sol');
    syncLegendSymbolCollapse([first], known);
    syncLegendSymbolCollapse([first, second], known);
    toggleLegendSymbols(first);

    syncLegendSymbolCollapse([first, second], known);

    expect(first.classList.contains(LEGEND_SYMBOLS_COLLAPSED)).toBe(false);
    expect(second.classList.contains(LEGEND_SYMBOLS_COLLAPSED)).toBe(false);
  });

  it('keeps a lone legend collapsed after the user closes it', () => {
    const known = new Set<string>();
    const only = entry('trams');
    syncLegendSymbolCollapse([only], known);
    toggleLegendSymbols(only);

    syncLegendSymbolCollapse([only], known);

    expect(only.classList.contains(LEGEND_SYMBOLS_COLLAPSED)).toBe(true);
  });

  it('toggles from either catalog line and ignores symbols and deeper groups', () => {
    const node = entry('trams');
    const group = document.createElement('li');
    group.className = 'tc-ctl-legend-node';
    group.innerHTML = '<div class="tc-ctl-legend-title">Class</div>';
    node.querySelector('.tc-ctl-legend-leaf')?.appendChild(group);
    const titles = node.querySelectorAll('.tc-ctl-legend-title');
    const image = node.querySelector('img');

    expect(isLegendHeadingToggleTarget(titles[0])).toBe(true);
    expect(isLegendHeadingToggleTarget(titles[1])).toBe(true);
    expect(isLegendHeadingToggleTarget(titles[2])).toBe(false);
    expect(isLegendHeadingToggleTarget(image)).toBe(false);
    expect(shouldRefreshLegendOnPanelClick(titles[0])).toBe(false);
    expect(shouldRefreshLegendOnPanelClick(image)).toBe(true);
  });
});
