import {
  collectionOrderFromList,
  showWorkLayerStackTopFirst
} from './work-layer-stack-order';

function row(id: string): HTMLLIElement {
  const li = document.createElement('li');
  li.dataset['layerId'] = id;
  return li;
}

describe('work layer stack order', () => {
  it('uses the list order after insert, including a raster above a vector', () => {
    expect(collectionOrderFromList(['raster', 'vector'])).toEqual(['vector', 'raster']);
    expect(collectionOrderFromList(['top', 'middle', 'bottom'])).toEqual([
      'bottom',
      'middle',
      'top'
    ]);
  });

  it('puts the top of the OpenLayers stack in the first row', () => {
    const list = document.createElement('ul');
    const bottom = row('bottom');
    const middle = row('middle');
    const top = row('top');
    list.append(bottom, middle, top);

    showWorkLayerStackTopFirst(list);

    expect([...list.children]).toEqual([top, middle, bottom]);
  });
});
