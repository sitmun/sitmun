/**
 * Loaded Layers is top to bottom. OpenLayers draws the first collection entry
 * at the bottom. The profile order that separates vectors and rasters applies
 * only when a layer is inserted.
 */
export function collectionOrderFromList(rowIdsTopToBottom: readonly string[]): string[] {
  return [...rowIdsTopToBottom].filter((id) => id.length > 0).reverse();
}

/**
 * SITNA paints Loaded Layers in collection order, bottom of the map first.
 * The first row is the layer drawn on top.
 */
export function showWorkLayerStackTopFirst(list: HTMLElement): void {
  const topFirst = [...list.children].reverse();
  for (const row of topFirst) {
    list.appendChild(row);
  }
}
