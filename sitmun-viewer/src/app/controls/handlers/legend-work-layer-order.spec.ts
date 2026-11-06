import {
  legendIdsInWorkLayerOrder,
  syncLegendOrder
} from './legend-work-layer-order';

function legendEntry(id: string): HTMLElement {
  const entry = document.createElement('sitna-layer-legend');
  entry.dataset['layerId'] = id;
  entry.textContent = id;
  return entry;
}

function workLayerRow(id: string): HTMLElement {
  const row = document.createElement('li');
  row.className = 'tc-ctl-wlm-elm';
  row.dataset['layerId'] = id;
  return row;
}

describe('legend work layer order', () => {
  it('follows the working-layers list and keeps an entry that is not listed yet', () => {
    expect(legendIdsInWorkLayerOrder(['c', 'a', 'b'], ['a', 'b', 'c', 'x'])).toEqual([
      'c',
      'a',
      'b',
      'x'
    ]);
  });

  it('moves the same legend nodes into the working-layers order', () => {
    const legendList = document.createElement('ul');
    const workLayerList = document.createElement('ul');
    const a = legendEntry('a');
    const b = legendEntry('b');
    const c = legendEntry('c');
    legendList.append(a, b, c);
    workLayerList.append(workLayerRow('c'), workLayerRow('a'), workLayerRow('b'));

    expect(syncLegendOrder(legendList, workLayerList)).toBe(true);
    expect(Array.from(legendList.children)).toEqual([c, a, b]);

    expect(syncLegendOrder(legendList, workLayerList)).toBe(false);
  });
});
