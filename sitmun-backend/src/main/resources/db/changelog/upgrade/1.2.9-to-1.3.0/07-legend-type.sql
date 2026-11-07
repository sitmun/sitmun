UPDATE stm_codelist
SET cod_value = 'LEGENDURL', cod_description = 'Legend URL'
WHERE cod_list = 'cartography.legendType' AND cod_value = 'CAPABILITIES';

UPDATE stm_codelist
SET cod_description = 'Prioritize Get Legend Graphic'
WHERE cod_list = 'cartography.legendType' AND cod_value = 'LEGENDGRAPHIC';

UPDATE stm_codelist
SET cod_description = 'Static legend URL'
WHERE cod_list = 'cartography.legendType' AND cod_value = 'LINK';

UPDATE stm_translation
SET tra_name = 'Prioritza Get Legend Graphic'
WHERE tra_column = 'CodeListValue.description'
  AND tra_eleid = (SELECT cod_id FROM stm_codelist WHERE cod_list = 'cartography.legendType' AND cod_value = 'LEGENDGRAPHIC')
  AND tra_lanid = (SELECT lan_id FROM stm_language WHERE lan_shortname = 'ca');

UPDATE stm_translation
SET tra_name = 'Priorizar Get Legend Graphic'
WHERE tra_column = 'CodeListValue.description'
  AND tra_eleid = (SELECT cod_id FROM stm_codelist WHERE cod_list = 'cartography.legendType' AND cod_value = 'LEGENDGRAPHIC')
  AND tra_lanid = (SELECT lan_id FROM stm_language WHERE lan_shortname = 'es');

UPDATE stm_translation
SET tra_name = 'Prioriser Get Legend Graphic'
WHERE tra_column = 'CodeListValue.description'
  AND tra_eleid = (SELECT cod_id FROM stm_codelist WHERE cod_list = 'cartography.legendType' AND cod_value = 'LEGENDGRAPHIC')
  AND tra_lanid = (SELECT lan_id FROM stm_language WHERE lan_shortname = 'fr');

UPDATE stm_translation
SET tra_name = 'Priorizar Get Legend Graphic'
WHERE tra_column = 'CodeListValue.description'
  AND tra_eleid = (SELECT cod_id FROM stm_codelist WHERE cod_list = 'cartography.legendType' AND cod_value = 'LEGENDGRAPHIC')
  AND tra_lanid = (SELECT lan_id FROM stm_language WHERE lan_shortname = 'oc-aranes');

UPDATE stm_translation
SET tra_name = 'Prioritize Get Legend Graphic'
WHERE tra_column = 'CodeListValue.description'
  AND tra_eleid = (SELECT cod_id FROM stm_codelist WHERE cod_list = 'cartography.legendType' AND cod_value = 'LEGENDGRAPHIC')
  AND tra_lanid = (SELECT lan_id FROM stm_language WHERE lan_shortname = 'en');

UPDATE stm_translation
SET tra_name = 'URL de llegenda'
WHERE tra_column = 'CodeListValue.description'
  AND tra_eleid = (SELECT cod_id FROM stm_codelist WHERE cod_list = 'cartography.legendType' AND cod_value = 'LEGENDURL')
  AND tra_lanid = (SELECT lan_id FROM stm_language WHERE lan_shortname = 'ca');

UPDATE stm_translation
SET tra_name = 'URL de leyenda'
WHERE tra_column = 'CodeListValue.description'
  AND tra_eleid = (SELECT cod_id FROM stm_codelist WHERE cod_list = 'cartography.legendType' AND cod_value = 'LEGENDURL')
  AND tra_lanid = (SELECT lan_id FROM stm_language WHERE lan_shortname = 'es');

UPDATE stm_translation
SET tra_name = 'URL de légende'
WHERE tra_column = 'CodeListValue.description'
  AND tra_eleid = (SELECT cod_id FROM stm_codelist WHERE cod_list = 'cartography.legendType' AND cod_value = 'LEGENDURL')
  AND tra_lanid = (SELECT lan_id FROM stm_language WHERE lan_shortname = 'fr');

UPDATE stm_translation
SET tra_name = 'URL de legenda'
WHERE tra_column = 'CodeListValue.description'
  AND tra_eleid = (SELECT cod_id FROM stm_codelist WHERE cod_list = 'cartography.legendType' AND cod_value = 'LEGENDURL')
  AND tra_lanid = (SELECT lan_id FROM stm_language WHERE lan_shortname = 'oc-aranes');

UPDATE stm_translation
SET tra_name = 'Legend URL'
WHERE tra_column = 'CodeListValue.description'
  AND tra_eleid = (SELECT cod_id FROM stm_codelist WHERE cod_list = 'cartography.legendType' AND cod_value = 'LEGENDURL')
  AND tra_lanid = (SELECT lan_id FROM stm_language WHERE lan_shortname = 'en');

UPDATE stm_translation
SET tra_name = 'URL de llegenda estàtica'
WHERE tra_column = 'CodeListValue.description'
  AND tra_eleid = (SELECT cod_id FROM stm_codelist WHERE cod_list = 'cartography.legendType' AND cod_value = 'LINK')
  AND tra_lanid = (SELECT lan_id FROM stm_language WHERE lan_shortname = 'ca');

UPDATE stm_translation
SET tra_name = 'URL de leyenda estática'
WHERE tra_column = 'CodeListValue.description'
  AND tra_eleid = (SELECT cod_id FROM stm_codelist WHERE cod_list = 'cartography.legendType' AND cod_value = 'LINK')
  AND tra_lanid = (SELECT lan_id FROM stm_language WHERE lan_shortname = 'es');

UPDATE stm_translation
SET tra_name = 'URL de légende statique'
WHERE tra_column = 'CodeListValue.description'
  AND tra_eleid = (SELECT cod_id FROM stm_codelist WHERE cod_list = 'cartography.legendType' AND cod_value = 'LINK')
  AND tra_lanid = (SELECT lan_id FROM stm_language WHERE lan_shortname = 'fr');

UPDATE stm_translation
SET tra_name = 'URL de legenda estatica'
WHERE tra_column = 'CodeListValue.description'
  AND tra_eleid = (SELECT cod_id FROM stm_codelist WHERE cod_list = 'cartography.legendType' AND cod_value = 'LINK')
  AND tra_lanid = (SELECT lan_id FROM stm_language WHERE lan_shortname = 'oc-aranes');

UPDATE stm_translation
SET tra_name = 'Static legend URL'
WHERE tra_column = 'CodeListValue.description'
  AND tra_eleid = (SELECT cod_id FROM stm_codelist WHERE cod_list = 'cartography.legendType' AND cod_value = 'LINK')
  AND tra_lanid = (SELECT lan_id FROM stm_language WHERE lan_shortname = 'en');

UPDATE stm_geoinfo
SET geo_legendtip = 'LEGENDURL'
WHERE geo_legendtip = 'CAPABILITIES';

UPDATE stm_geoinfo
SET geo_legendtip = NULL, geo_legendurl = NULL
WHERE geo_serid IN (SELECT ser_id FROM stm_service WHERE ser_protocol = 'WFS');

UPDATE stm_geoinfo
SET geo_legendtip = NULL
WHERE geo_serid IN (SELECT ser_id FROM stm_service WHERE ser_protocol = 'WMTS')
  AND (
    geo_legendtip IS NULL
    OR geo_legendtip <> 'LINK'
    OR geo_legendurl IS NULL
    OR TRIM(geo_legendurl) = ''
  );

UPDATE stm_geoinfo
SET geo_legendtip = 'LEGENDGRAPHIC'
WHERE geo_serid IN (SELECT ser_id FROM stm_service WHERE ser_protocol = 'WMS')
  AND (
    geo_legendtip IS NULL
    OR TRIM(geo_legendtip) = ''
    OR geo_legendtip NOT IN ('LEGENDGRAPHIC', 'LEGENDURL', 'LINK')
  );
