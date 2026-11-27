# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- **WMTS grid**: For each layer the job picks the tile matrix set whose `SupportedCRS` is Web Mercator (`EPSG:3857`, `900913`, `102100` or `102113`, plain or URN), whatever its name, and asks for tiles with that set's identifier. It always asked for a set named `EPSG:3857` ([#321](https://github.com/sitmun/sitmun/issues/321)). A matrix counts only if it has 256-pixel tiles, a top-left corner on the Web Mercator origin, and a power-of-two scale, because the MBTiles file stores the XYZ pyramid; the zoom level comes from `ScaleDenominator`, not from the matrix name.
- **Tile limits**: A layer without `TileMatrixLimits` is no longer rejected. The tile range comes from `MatrixWidth` and `MatrixHeight`, clipped to the requested bbox ([#321](https://github.com/sitmun/sitmun/issues/321)).
- **Skipped services**: A WMTS service with no Web Mercator tile matrix set for any requested layer is skipped with a WARN that names the service URL, the layer and the sets it offers. The job writes the other services and ends `COMPLETED`. When no service can be used, the job fails with every reason in its exit description. It used to fail at the first such service with no reason ([#321](https://github.com/sitmun/sitmun/issues/321)).
- **Estimate**: `POST /mbtiles/estimate` uses the same grid choice and skips the same services, so its tile count matches the job. When no service can be used it answers 400 with the reasons. It used to return an empty estimate ([#321](https://github.com/sitmun/sitmun/issues/321)).
