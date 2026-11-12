export interface MbtilesServiceGroup {
  serviceId: number;
  layerIds: number[];
}

export function groupMbtilesServices(
  layers: { id: string; service: string }[]
): MbtilesServiceGroup[] {
  const byService = new Map<number, Set<number>>();
  for (const layer of layers) {
    const serviceId = profileRefId(layer.service);
    const layerId = profileRefId(layer.id);
    if (serviceId === null || layerId === null) {
      continue;
    }
    const ids = byService.get(serviceId) ?? new Set<number>();
    ids.add(layerId);
    byService.set(serviceId, ids);
  }
  return Array.from(byService, ([serviceId, layerIds]) => ({
    serviceId,
    layerIds: Array.from(layerIds),
  }));
}

function profileRefId(ref: string): number | null {
  const segment = ref.split('/')[1];
  if (!segment || !/^\d+$/.test(segment)) {
    return null;
  }
  return Number(segment);
}
