declare module 'api-sitna/TC/control/DataLoader.js' {
  export default class DataLoader {
    constructor(...args: unknown[]);
    controlOptions: Array<{
      title: string;
      externalWMS?: { suggestions?: unknown };
      fileImport?: { enableDragAndDrop?: boolean };
    }>;
    ctlCount: number;
  }
}

describe('DataLoader without a legacy externalWMS control', () => {
  let DataLoader: typeof import('api-sitna/TC/control/DataLoader.js').default;

  beforeAll(async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => []
    }) as unknown as typeof fetch;

    ({ default: DataLoader } = await import(
      'api-sitna/TC/control/DataLoader.js'
    ));
  });

  it('does not throw and still initializes', () => {
    const control = new DataLoader(undefined, {
      enableDragAndDrop: true
    });

    expect(control.controlOptions).toEqual([
      {
        title: 'addWMS',
        externalWMS: { suggestions: undefined }
      },
      {
        title: 'openFile',
        fileImport: { enableDragAndDrop: true }
      }
    ]);
    expect(control.ctlCount).toBe(control.controlOptions.length);
  });

  it('still reads suggestions from a legacy externalWMS entry', () => {
    const suggestions = [{ group: 'Estatales', items: [] }];
    const control = new DataLoader(undefined, {
      controls: [
        {
          name: 'externalWMS',
          options: { suggestions }
        },
        {
          name: 'fileImport',
          options: { enableDragAndDrop: false }
        }
      ]
    });

    expect(control.controlOptions[0].externalWMS?.suggestions).toBe(
      suggestions
    );
    expect(control.controlOptions[1].fileImport?.enableDragAndDrop).toBe(
      false
    );
  });
});
