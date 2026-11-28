declare module 'api-sitna' {
  const Cfg: any;
  const Consts: any;
  const feature: any;
  const layer: any;
  const Map: any;

  export default Map;
  export { Cfg, Consts, feature, layer };
}

declare module 'api-sitna/TC/ol/layer/Raster.js' {
  export default class RasterWrapper {
    getInfo(name?: string): { queryable?: boolean; [key: string]: unknown };
  }
}
