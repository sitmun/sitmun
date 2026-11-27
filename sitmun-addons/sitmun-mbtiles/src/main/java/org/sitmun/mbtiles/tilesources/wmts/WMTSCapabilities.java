package org.sitmun.mbtiles.tilesources.wmts;

import java.util.List;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class WMTSCapabilities {
  List<WMTSLayerCapabilities> layers;
}
