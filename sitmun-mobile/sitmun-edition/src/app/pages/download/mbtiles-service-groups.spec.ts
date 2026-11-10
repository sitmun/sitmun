import { groupMbtilesServices } from './mbtiles-service-groups';

describe('groupMbtilesServices', () => {
  it('groups profile refs into numeric service and layer ids', () => {
    const groups = groupMbtilesServices([
      { id: 'layer/9', service: 'service/155' },
      { id: 'layer/10', service: 'service/155' },
      { id: 'layer/4', service: 'service/8' },
    ]);

    expect(groups).toEqual([
      { serviceId: 155, layerIds: [9, 10] },
      { serviceId: 8, layerIds: [4] },
    ]);
    expect(groups.every((group) => typeof group.serviceId === 'number')).toBe(true);
    expect(groups.every((group) => group.layerIds.every((id) => typeof id === 'number'))).toBe(true);
  });

  it('skips a ref that is not a whole number', () => {
    expect(groupMbtilesServices([{ id: 'layer/9', service: 'service/abc' }])).toEqual([]);
    expect(groupMbtilesServices([{ id: 'layer/', service: 'service/8' }])).toEqual([]);
  });
});
