#!/usr/bin/env node
/**
 * Local WMTS stub for Playwright (Background Map GEO 1/2 layer names topo / orto).
 */
import { createServer } from 'node:http';

const HOST = '127.0.0.1';
const PORT = 18094;

const CAPABILITIES = `<?xml version="1.0" encoding="UTF-8"?>
<Capabilities xmlns="http://www.opengis.net/wmts/1.0"
  xmlns:ows="http://www.opengis.net/ows/1.1"
  xmlns:xlink="http://www.w3.org/1999/xlink"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  version="1.0.0">
  <ows:ServiceIdentification>
    <ows:Title>E2E WMTS Stub</ows:Title>
    <ows:ServiceType>OGC WMTS</ows:ServiceType>
    <ows:ServiceTypeVersion>1.0.0</ows:ServiceTypeVersion>
  </ows:ServiceIdentification>
  <!-- API-SITNA reads OperationsMetadata to pick the request encoding. -->
  <ows:OperationsMetadata>
    <ows:Operation name="GetCapabilities">
      <ows:DCP><ows:HTTP><ows:Get xlink:href="http://${HOST}:${PORT}/wmts?">
        <ows:Constraint name="GetEncoding"><ows:AllowedValues><ows:Value>KVP</ows:Value></ows:AllowedValues></ows:Constraint>
      </ows:Get></ows:HTTP></ows:DCP>
    </ows:Operation>
    <ows:Operation name="GetTile">
      <ows:DCP><ows:HTTP><ows:Get xlink:href="http://${HOST}:${PORT}/wmts?">
        <ows:Constraint name="GetEncoding"><ows:AllowedValues><ows:Value>KVP</ows:Value></ows:AllowedValues></ows:Constraint>
      </ows:Get></ows:HTTP></ows:DCP>
    </ows:Operation>
  </ows:OperationsMetadata>
  <Contents>
    <Layer>
      <ows:Title>topo</ows:Title>
      <ows:Identifier>topo</ows:Identifier>
      <Style isDefault="true">
        <ows:Identifier>default</ows:Identifier>
      </Style>
      <Format>image/png</Format>
      <TileMatrixSetLink>
        <TileMatrixSet>EPSG:25831</TileMatrixSet>
      </TileMatrixSetLink>
      <!-- MBTiles downloads only Web Mercator grids (#321); the mobile suites use topo. -->
      <TileMatrixSetLink>
        <TileMatrixSet>EPSG:3857</TileMatrixSet>
      </TileMatrixSetLink>
      <ResourceURL format="image/png" resourceType="tile"
        template="http://${HOST}:${PORT}/wmts/tile/topo/{TileMatrix}/{TileCol}/{TileRow}.png"/>
    </Layer>
    <Layer>
      <ows:Title>orto</ows:Title>
      <ows:Identifier>orto</ows:Identifier>
      <Style isDefault="true">
        <ows:Identifier>default</ows:Identifier>
      </Style>
      <Format>image/png</Format>
      <TileMatrixSetLink>
        <TileMatrixSet>EPSG:25831</TileMatrixSet>
      </TileMatrixSetLink>
      <ResourceURL format="image/png" resourceType="tile"
        template="http://${HOST}:${PORT}/wmts/tile/orto/{TileMatrix}/{TileCol}/{TileRow}.png"/>
    </Layer>
    <Layer>
      <ows:Title>E2E Layer</ows:Title>
      <ows:Identifier>e2e-layer</ows:Identifier>
      <Style isDefault="true">
        <ows:Identifier>default</ows:Identifier>
      </Style>
      <Format>image/png</Format>
      <TileMatrixSetLink>
        <TileMatrixSet>EPSG:25831</TileMatrixSet>
      </TileMatrixSetLink>
      <ResourceURL format="image/png" resourceType="tile"
        template="http://${HOST}:${PORT}/wmts/tile/e2e-layer/{TileMatrix}/{TileCol}/{TileRow}.png"/>
    </Layer>
    <TileMatrixSet>
      <ows:Identifier>EPSG:25831</ows:Identifier>
      <ows:SupportedCRS>EPSG:25831</ows:SupportedCRS>
      <TileMatrix>
        <ows:Identifier>0</ows:Identifier>
        <ScaleDenominator>500000000</ScaleDenominator>
        <TopLeftCorner>-1000000 5000000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>1</MatrixWidth>
        <MatrixHeight>1</MatrixHeight>
      </TileMatrix>
      <!-- API-SITNA reads a single TileMatrix as an object, not a list, and fails. -->
      <TileMatrix>
        <ows:Identifier>1</ows:Identifier>
        <ScaleDenominator>250000000</ScaleDenominator>
        <TopLeftCorner>-1000000 5000000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>2</MatrixWidth>
        <MatrixHeight>2</MatrixHeight>
      </TileMatrix>
    </TileMatrixSet>
    <TileMatrixSet>
      <ows:Identifier>EPSG:3857</ows:Identifier>
      <ows:SupportedCRS>urn:ogc:def:crs:EPSG::3857</ows:SupportedCRS>
      <TileMatrix>
        <ows:Identifier>EPSG:3857:0</ows:Identifier>
        <ScaleDenominator>559082264.0287178</ScaleDenominator>
        <TopLeftCorner>-20037508.3427892 20037508.3427892</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>1</MatrixWidth>
        <MatrixHeight>1</MatrixHeight>
      </TileMatrix>
      <TileMatrix>
        <ows:Identifier>EPSG:3857:1</ows:Identifier>
        <ScaleDenominator>279541132.0143589</ScaleDenominator>
        <TopLeftCorner>-20037508.3427892 20037508.3427892</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>2</MatrixWidth>
        <MatrixHeight>2</MatrixHeight>
      </TileMatrix>
    </TileMatrixSet>
  </Contents>
</Capabilities>
`;

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

function fail(message) {
  console.error(`[e2e-wmts-stub] ${message}`);
  process.exit(1);
}

const server = createServer((req, res) => {
  // The viewer suite loads the stub from the browser (localhost:4400), a different origin.
  res.setHeader('Access-Control-Allow-Origin', '*');
  const url = new URL(req.url ?? '/', `http://${HOST}:${PORT}`);
  if (req.method === 'GET' && url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
    return;
  }
  if (req.method === 'GET' && (url.pathname === '/wmts' || url.pathname.startsWith('/wmts/'))) {
    const request = (
      url.searchParams.get('REQUEST') ||
      url.searchParams.get('request') ||
      ''
    ).toLowerCase();
    if (
      request === 'getcapabilities' ||
      (request === '' && !url.pathname.includes('/tile/'))
    ) {
      res.writeHead(200, { 'Content-Type': 'application/xml' });
      res.end(CAPABILITIES);
      return;
    }
    res.writeHead(200, { 'Content-Type': 'image/png' });
    res.end(PNG);
    return;
  }
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('not found');
});

server.on('error', (error) => fail(`Failed to bind ${HOST}:${PORT}: ${error.message}`));
server.listen(PORT, HOST, () => {
  console.error(`[e2e-wmts-stub] listening on http://${HOST}:${PORT}`);
});

for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
