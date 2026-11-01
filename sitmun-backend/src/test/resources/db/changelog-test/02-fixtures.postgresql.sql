INSERT INTO stm_gter_typ (gtt_id, gtt_name) VALUES (10001, 'Consell Comarcal')
--end
INSERT INTO stm_gter_typ (gtt_id, gtt_name) VALUES (10003, 'Consorci')
--end
INSERT INTO stm_gter_typ (gtt_id, gtt_name) VALUES (10002, 'Mancomunitat')
--end
INSERT INTO stm_gter_typ (gtt_id, gtt_name) VALUES (10000, 'Parc natural')
--end
INSERT INTO stm_gter_typ (gtt_id, gtt_name) VALUES (10004, 'Àrea')
--end
INSERT INTO stm_connect (con_id, con_name, con_driver, con_user, con_pwd, con_connection) VALUES (10001, 'Connection 1', 'org.h2.Driver', 'User1', 'Password1', 'jdbc:database:@host:schema2')
--end
INSERT INTO stm_role (rol_id, rol_name, rol_note) VALUES (10001, 'Role 1', NULL)
--end
INSERT INTO stm_role (rol_id, rol_name, rol_note) VALUES (10002, 'Role 2', NULL)
--end
INSERT INTO stm_grp_gi (ggi_id, ggi_name, ggi_type) VALUES (10001, 'Cartography Group', 'C')
--end
INSERT INTO stm_grp_gi (ggi_id, ggi_name, ggi_type) VALUES (10002, 'Background Map', 'F')
--end
INSERT INTO stm_grp_gi (ggi_id, ggi_name, ggi_type) VALUES (10003, 'Situation Map', 'M')
--end
INSERT INTO stm_grp_tsk (gts_id, gts_name) VALUES (10005, 'Query')
--end
INSERT INTO stm_service (ser_id, ser_name, ser_url, ser_projects, ser_infourl, ser_created, ser_protocol, ser_blocked) VALUES (10001, 'ICC Mapesmultibase', 'https://geoserveis.icgc.cat/icc_mapesmultibase/utm/wmts/service', NULL, NULL, NULL, 'WMTS', false)
--end
INSERT INTO stm_service (ser_id, ser_name, ser_url, ser_projects, ser_infourl, ser_created, ser_protocol, ser_blocked) VALUES (10002, 'PNOA', 'https://www.ign.es/wms-inspire/pnoa-ma', NULL, NULL, NULL, 'WMS', false)
--end
INSERT INTO stm_service (ser_id, ser_name, ser_url, ser_projects, ser_infourl, ser_created, ser_protocol, ser_blocked) VALUES (10003, 'Delimitacions Barcelona', 'https://sitmun.diba.cat/arcgis/services/PUBLIC/DTE50/MapServer/WmsServer', NULL, NULL, NULL, 'WMS', false)
--end
INSERT INTO stm_service (ser_id, ser_name, ser_url, ser_projects, ser_infourl, ser_created, ser_protocol, ser_blocked) VALUES (10004, 'ICC BT25M', 'https://geoserveis.icgc.cat/icc_bt25m/wms/service', NULL, NULL, NULL, 'WMS', false)
--end
INSERT INTO stm_service (ser_id, ser_name, ser_url, ser_projects, ser_infourl, ser_created, ser_protocol, ser_blocked) VALUES (10005, 'ICC BT50M', 'https://geoserveis.icgc.cat/icc_bt50m/wms/service', NULL, NULL, NULL, 'WMS', false)
--end
INSERT INTO stm_service (ser_id, ser_name, ser_url, ser_projects, ser_infourl, ser_created, ser_protocol, ser_blocked) VALUES (10006, 'ICC Mapesbase', 'https://geoserveis.icgc.cat/icc_mapesbase/wms/service', NULL, NULL, NULL, 'WMS', false)
--end
INSERT INTO stm_service (ser_id, ser_name, ser_url, ser_projects, ser_infourl, ser_created, ser_protocol, ser_blocked) VALUES (10007, 'WMTS URI template (tests)', 'https://example.com/wmts/{tileSet}/service', NULL, NULL, NULL, 'WMTS', false)
--end
INSERT INTO stm_service (ser_id, ser_name, ser_url, ser_projects, ser_infourl, ser_created, ser_protocol, ser_blocked) VALUES (10008, 'Blocked Service (tests)', 'https://blocked.example.com/wms', NULL, NULL, NULL, 'WMS', true)
--end
INSERT INTO stm_user (use_id, use_user, use_pwd, use_name, use_surname, use_adm, use_blocked, use_created) VALUES (10003, 'blocked', '$2y$10$pjq2inRVfLQnAf/sN6ZBYOXAPePQTmtSs9L4sk5r8vtYukcxBZoc6', 'Blocked', NULL, false, true, TIMESTAMP '2006-12-31 00:00:00')
--end
INSERT INTO stm_user (use_id, use_user, use_pwd, use_name, use_surname, use_adm, use_blocked, use_created) VALUES (10004, 'internal', '$2y$10$/eaDr1MoA126Pio7bFLkfeSMXYfSnEAiVX0TLMIwbGovxNyO5jJdS', 'Normal', NULL, false, false, TIMESTAMP '2006-12-31 00:00:00')
--end
INSERT INTO stm_user (use_id, use_user, use_pwd, use_name, use_surname, use_adm, use_blocked, use_created) VALUES (10012, 'user12', '$2a$10$riRj7j01mfNsNJOrLJ6JwO3nXV/Py8V7TcnLDMYMtu.VmrtxrWmea', 'Name of 12', 'Surname of 12', false, false, TIMESTAMP '2006-12-31 00:00:00')
--end
INSERT INTO stm_territory (ter_id, ter_codter, ter_name, ter_admname, ter_address, ter_email, ter_scope, ter_logo, ter_extent, ter_blocked, ter_typid, ter_note, ter_created, ter_gtypid, ter_center, ter_zoom, ter_project) VALUES (10001, '60001', 'Provincia A', 'Provincia A', NULL, NULL, 'T', 'http://sitmun.diba.cat/sitmun2/img/logo/lbuit.png', '363487 4561229 481617 4686464', false, 8, NULL, TIMESTAMP '2011-04-29 11:41:55', NULL, '422552 4623846', '8', NULL)
--end
INSERT INTO stm_territory (ter_id, ter_codter, ter_name, ter_admname, ter_address, ter_email, ter_scope, ter_logo, ter_extent, ter_blocked, ter_typid, ter_note, ter_created, ter_gtypid, ter_center, ter_zoom, ter_project) VALUES (10002, '60002', 'Municipio B', 'Municipio B', NULL, NULL, 'M', 'http://sitmun.diba.cat/sitmun2/img/logo/l08075.png', '448046 4603029 458244 4609234', false, 6, NULL, TIMESTAMP '2011-04-29 11:41:55', NULL, '453145 4606132', '10', 'EPSG:25830')
--end
INSERT INTO stm_territory (ter_id, ter_codter, ter_name, ter_admname, ter_address, ter_email, ter_scope, ter_logo, ter_extent, ter_blocked, ter_typid, ter_note, ter_created, ter_gtypid, ter_center, ter_zoom, ter_project) VALUES (10003, '70003', 'Otro C', 'Otro C', NULL, NULL, 'R', NULL, '430250 4612070 469609 4638298', false, 5, NULL, TIMESTAMP '2011-04-29 11:41:55', 10000, NULL, NULL, NULL)
--end
INSERT INTO stm_grp_ter (gte_terid, gte_termid) VALUES (10001, 10002)
--end
INSERT INTO stm_grp_ter (gte_terid, gte_termid) VALUES (10001, 10003)
--end
INSERT INTO stm_tree (tre_id, tre_name, tre_type) VALUES (10001, 'Provincial', 'cartography')
--end
INSERT INTO stm_tree (tre_id, tre_name, tre_type) VALUES (10002, 'Municipal', 'cartography')
--end
INSERT INTO stm_tree (tre_id, tre_name, tre_type) VALUES (10003, 'Supramunicipal', 'cartography')
--end
INSERT INTO stm_tree (tre_id, tre_name, tre_type) VALUES (10004, 'Turistico', 'touristic')
--end
INSERT INTO stm_usr_conf (uco_id, uco_userid, uco_terid, uco_roleid, uco_rolem, uco_created) VALUES (10000, 1, 10001, 10001, false, TIMESTAMP '2006-12-31 00:00:00')
--end
INSERT INTO stm_usr_conf (uco_id, uco_userid, uco_terid, uco_roleid, uco_rolem, uco_created) VALUES (10001, 1, 10002, 10001, false, TIMESTAMP '2006-12-31 00:00:00')
--end
INSERT INTO stm_usr_conf (uco_id, uco_userid, uco_terid, uco_roleid, uco_rolem, uco_created) VALUES (10002, 1, 10003, 10001, false, TIMESTAMP '2007-01-01 00:00:00')
--end
INSERT INTO stm_usr_conf (uco_id, uco_userid, uco_terid, uco_roleid, uco_rolem, uco_created) VALUES (10003, 2, 10001, 10001, false, TIMESTAMP '2007-01-01 00:00:00')
--end
INSERT INTO stm_usr_conf (uco_id, uco_userid, uco_terid, uco_roleid, uco_rolem, uco_created) VALUES (10004, 2, 10002, 10001, false, TIMESTAMP '2007-01-01 00:00:00')
--end
INSERT INTO stm_usr_conf (uco_id, uco_userid, uco_terid, uco_roleid, uco_rolem, uco_created) VALUES (10005, 2, 10003, 10001, false, TIMESTAMP '2007-01-01 00:00:00')
--end
INSERT INTO stm_usr_conf (uco_id, uco_userid, uco_terid, uco_roleid, uco_rolem, uco_created) VALUES (10006, 10003, 10001, 10001, false, TIMESTAMP '2007-01-01 00:00:00')
--end
INSERT INTO stm_usr_conf (uco_id, uco_userid, uco_terid, uco_roleid, uco_rolem, uco_created) VALUES (10007, 10003, 10002, 10001, false, TIMESTAMP '2007-01-01 00:00:00')
--end
INSERT INTO stm_usr_conf (uco_id, uco_userid, uco_terid, uco_roleid, uco_rolem, uco_created) VALUES (10008, 10003, 10003, 10001, false, TIMESTAMP '2007-01-01 00:00:00')
--end
INSERT INTO stm_usr_conf (uco_id, uco_userid, uco_terid, uco_roleid, uco_rolem, uco_created) VALUES (10009, 10004, 10001, 10001, false, TIMESTAMP '2007-01-01 00:00:00')
--end
INSERT INTO stm_usr_conf (uco_id, uco_userid, uco_terid, uco_roleid, uco_rolem, uco_created) VALUES (10010, 10004, 10002, 10001, false, TIMESTAMP '2007-01-02 00:00:00')
--end
INSERT INTO stm_usr_conf (uco_id, uco_userid, uco_terid, uco_roleid, uco_rolem, uco_created) VALUES (10011, 10004, 10003, 10001, false, TIMESTAMP '2007-01-02 00:00:00')
--end
INSERT INTO stm_usr_conf (uco_id, uco_userid, uco_terid, uco_roleid, uco_rolem, uco_created) VALUES (10012, 10004, 10001, 10002, false, TIMESTAMP '2007-01-02 00:00:00')
--end
INSERT INTO stm_geoinfo (geo_id, geo_name, geo_layers, geo_minscale, geo_maxscale, geo_order, geo_transp, geo_queryabl, geo_queryact, geo_querylay, geo_serid, geo_selectabl, geo_selectlay, geo_legendtip, geo_serselid, geo_created, geo_connid, geo_metaurl, geo_thematic, geo_geomtype, geo_blocked, geo_filter_gfi, geo_filter_ss) VALUES (10001, 'WMTS Bases - ICGC- Topo', 'topo', '500', '1000000', '10', '50', false, false, NULL, 10001, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, false, true, true)
--end
INSERT INTO stm_geoinfo (geo_id, geo_name, geo_layers, geo_minscale, geo_maxscale, geo_order, geo_transp, geo_queryabl, geo_queryact, geo_querylay, geo_serid, geo_selectabl, geo_selectlay, geo_legendtip, geo_serselid, geo_created, geo_connid, geo_metaurl, geo_thematic, geo_geomtype, geo_blocked, geo_filter_gfi, geo_filter_ss) VALUES (10002, 'WMTS Bases - ICGC- Orto', 'orto', NULL, NULL, '0', NULL, false, false, NULL, 10001, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, false, false, false)
--end
INSERT INTO stm_geoinfo (geo_id, geo_name, geo_layers, geo_minscale, geo_maxscale, geo_order, geo_transp, geo_queryabl, geo_queryact, geo_querylay, geo_serid, geo_selectabl, geo_selectlay, geo_legendtip, geo_serselid, geo_created, geo_connid, geo_metaurl, geo_thematic, geo_geomtype, geo_blocked, geo_filter_gfi, geo_filter_ss) VALUES (10003, 'PNOA', 'OI.OrthoimageCoverage', NULL, NULL, '0', NULL, false, false, NULL, 10002, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, false, false, false)
--end
INSERT INTO stm_geoinfo (geo_id, geo_name, geo_layers, geo_minscale, geo_maxscale, geo_order, geo_transp, geo_queryabl, geo_queryact, geo_querylay, geo_serid, geo_selectabl, geo_selectlay, geo_legendtip, geo_serselid, geo_created, geo_connid, geo_metaurl, geo_thematic, geo_geomtype, geo_blocked, geo_filter_gfi, geo_filter_ss) VALUES (10004, 'Límites administrativos', 'DTE50_MUN,DTE50_PROV', NULL, NULL, NULL, NULL, false, false, NULL, 10003, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, false, false, false)
--end
INSERT INTO stm_geoinfo (geo_id, geo_name, geo_layers, geo_minscale, geo_maxscale, geo_order, geo_transp, geo_queryabl, geo_queryact, geo_querylay, geo_serid, geo_selectabl, geo_selectlay, geo_legendtip, geo_serselid, geo_created, geo_connid, geo_metaurl, geo_thematic, geo_geomtype, geo_blocked, geo_filter_gfi, geo_filter_ss) VALUES (10005, 'Topográfico 1:25.000 (ICGC)', '02_ALTI_PA,03_POBL_PA,04_POBL_PA,05_VEGE_PA,06_VEGE_PA,07_POBL_PA,08_VEGE_PA,09_VEGE_LN,10_VEGE_LN,11_HIDR_PA,12_HIDR_PA,13_ALTI_LN,14_ALTI_LN,15_ALTI_LN,16_ALTI_LN,18_POBL_PA,19_HIDR_PA,20_HIDR_LN,21_HIDR_LN,22_HIDR_LN,23_HIDR_LN,24_POBL_LN,25_POBL_LN,26_ALTI_LN,27_ALTI_LN,28_POBL_LN,29_POBL_LN,30_POBL_PN,31_VIES_LN,32_VIES_LN,33_VIES_LN,34_VIES_LN,35_VIES_LN,36_VIES_LN,37_VIES_LN,38_POBL_LN,39_HIDR_LN,40_VIES_LN,41_VIES_LN,42_VIES_LN,43_POBL_LN,44_POBL_LN,45_TOPO_TX,46_PREF_PNTX,48_ALTI_TX', NULL, NULL, '0', NULL, false, false, NULL, 10004, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, false, false, false)
--end
INSERT INTO stm_geoinfo (geo_id, geo_name, geo_layers, geo_minscale, geo_maxscale, geo_order, geo_transp, geo_queryabl, geo_queryact, geo_querylay, geo_serid, geo_selectabl, geo_selectlay, geo_legendtip, geo_serselid, geo_created, geo_connid, geo_metaurl, geo_thematic, geo_geomtype, geo_blocked, geo_filter_gfi, geo_filter_ss) VALUES (10006, 'Toponimia 1:25.000 (ICGC)', '34_TOPO_TX', NULL, NULL, '0', NULL, false, false, NULL, 10005, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, false, false, false)
--end
INSERT INTO stm_geoinfo (geo_id, geo_name, geo_layers, geo_minscale, geo_maxscale, geo_order, geo_transp, geo_queryabl, geo_queryact, geo_querylay, geo_serid, geo_selectabl, geo_selectlay, geo_legendtip, geo_serselid, geo_created, geo_connid, geo_metaurl, geo_thematic, geo_geomtype, geo_blocked, geo_filter_gfi, geo_filter_ss) VALUES (10007, 'Altimetria 1:25.000 (ICGC)', '03_ALTI_LN,04_ALTI_LN,29_ALTI_PNTX,30_ALTI_TX', NULL, NULL, '0', NULL, false, false, NULL, 10005, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, false, false, false)
--end
INSERT INTO stm_geoinfo (geo_id, geo_name, geo_layers, geo_minscale, geo_maxscale, geo_order, geo_transp, geo_queryabl, geo_queryact, geo_querylay, geo_serid, geo_selectabl, geo_selectlay, geo_legendtip, geo_serselid, geo_created, geo_connid, geo_metaurl, geo_thematic, geo_geomtype, geo_blocked, geo_filter_gfi, geo_filter_ss) VALUES (10008, 'Ortofoto actual', 'orto', NULL, NULL, '0', NULL, false, false, NULL, 10006, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, false, false, false)
--end
INSERT INTO stm_geoinfo (geo_id, geo_name, geo_layers, geo_minscale, geo_maxscale, geo_order, geo_transp, geo_queryabl, geo_queryact, geo_querylay, geo_serid, geo_selectabl, geo_selectlay, geo_legendtip, geo_serselid, geo_created, geo_connid, geo_metaurl, geo_thematic, geo_geomtype, geo_blocked, geo_filter_gfi, geo_filter_ss) VALUES (10009, 'Ortofoto infrarroja', 'ortoi25m', NULL, NULL, '0', NULL, false, false, NULL, 10006, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, false, false, false)
--end
INSERT INTO stm_geoinfo (geo_id, geo_name, geo_layers, geo_minscale, geo_maxscale, geo_order, geo_transp, geo_queryabl, geo_queryact, geo_querylay, geo_serid, geo_selectabl, geo_selectlay, geo_legendtip, geo_serselid, geo_created, geo_connid, geo_metaurl, geo_thematic, geo_geomtype, geo_blocked, geo_filter_gfi, geo_filter_ss) VALUES (10010, 'Cartography with blocked service', 'blocked_layer', NULL, NULL, '0', NULL, false, false, NULL, 10008, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, false, false, false)
--end
INSERT INTO stm_geoinfo (geo_id, geo_name, geo_layers, geo_minscale, geo_maxscale, geo_order, geo_transp, geo_queryabl, geo_queryact, geo_querylay, geo_serid, geo_selectabl, geo_selectlay, geo_legendtip, geo_serselid, geo_created, geo_connid, geo_metaurl, geo_thematic, geo_geomtype, geo_blocked, geo_filter_gfi, geo_filter_ss) VALUES (10011, 'Blocked cartography (GEO_BLOCKED)', 'geo_blocked_layer', NULL, NULL, '0', NULL, false, false, NULL, 10006, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, true, false, false)
--end
INSERT INTO stm_sty_gi (sgi_id, sgi_name, sgi_giid) VALUES (10001, 'Style A', 10001)
--end
INSERT INTO stm_sty_gi (sgi_id, sgi_name, sgi_giid) VALUES (10002, 'Style B', 10001)
--end
INSERT INTO stm_sty_gi (sgi_id, sgi_name, sgi_giid) VALUES (10003, 'Style C', 10001)
--end
INSERT INTO stm_ggi_gi (ggg_ggiid, ggg_giid) VALUES (10001, 10003)
--end
INSERT INTO stm_ggi_gi (ggg_ggiid, ggg_giid) VALUES (10001, 10005)
--end
INSERT INTO stm_ggi_gi (ggg_ggiid, ggg_giid) VALUES (10001, 10006)
--end
INSERT INTO stm_ggi_gi (ggg_ggiid, ggg_giid) VALUES (10001, 10007)
--end
INSERT INTO stm_ggi_gi (ggg_ggiid, ggg_giid) VALUES (10001, 10008)
--end
INSERT INTO stm_ggi_gi (ggg_ggiid, ggg_giid) VALUES (10001, 10009)
--end
INSERT INTO stm_ggi_gi (ggg_ggiid, ggg_giid) VALUES (10002, 10001)
--end
INSERT INTO stm_ggi_gi (ggg_ggiid, ggg_giid) VALUES (10002, 10002)
--end
INSERT INTO stm_ggi_gi (ggg_ggiid, ggg_giid) VALUES (10002, 10010)
--end
INSERT INTO stm_ggi_gi (ggg_ggiid, ggg_giid) VALUES (10002, 10011)
--end
INSERT INTO stm_ggi_gi (ggg_ggiid, ggg_giid) VALUES (10003, 10004)
--end
INSERT INTO stm_ggi_gi (ggg_ggiid, ggg_giid) VALUES (10003, 10010)
--end
INSERT INTO stm_ggi_gi (ggg_ggiid, ggg_giid) VALUES (10003, 10011)
--end
INSERT INTO stm_rol_ggi (rgg_roleid, rgg_ggiid) VALUES (10001, 10001)
--end
INSERT INTO stm_rol_ggi (rgg_roleid, rgg_ggiid) VALUES (10001, 10002)
--end
INSERT INTO stm_rol_ggi (rgg_roleid, rgg_ggiid) VALUES (10001, 10003)
--end
INSERT INTO stm_backgrd (bac_id, bac_name, bac_desc, bac_active, bac_ggiid, bac_created, bac_image) VALUES (10001, 'Background Map', 'Background Map', true, 10002, NULL, 'http://example.com/background_map.png')
--end
INSERT INTO stm_app (app_id, app_name, app_type, app_title, app_theme, app_scales, app_project, app_template, app_refresh, app_ggiid, app_created, app_logo) VALUES (10001, 'SITMUN - Provincial', 'I', 'SITMUN - Provincial', 'sitmun-base', '2000000,1000000,700000,600000,500000,250000,100000,75000,50000,25000,20000,15000,10000,5000,2000,1000,500', 'EPSG:25831', NULL, true, 10003, TIMESTAMP '2011-04-29 11:41:56', 'https://sitmun.org/Documents/Imatges/8480img1320220524090127.jpg')
--end
INSERT INTO stm_app (app_id, app_name, app_type, app_title, app_theme, app_scales, app_project, app_template, app_refresh, app_ggiid, app_created, app_logo) VALUES (10002, 'SITMUN - Municipal', 'I', 'SITMUN - Municipal', 'sitmun-base', '100000,75000,50000,25000,20000,15000,10000,5000,2000,1000,500', 'EPSG:25831', NULL, true, NULL, TIMESTAMP '2011-04-29 11:41:56', NULL)
--end
INSERT INTO stm_app (app_id, app_name, app_type, app_title, app_theme, app_scales, app_project, app_template, app_refresh, app_ggiid, app_created, app_logo) VALUES (10003, 'SITMUN - Supramunicipal', 'I', 'SITMUN - Supramunicipal', 'sitmun-base', '2000000,1000000,500000,250000,100000,75000,50000,25000,20000,15000,10000,5000,2000,1000,500', 'EPSG:25831', NULL, true, NULL, TIMESTAMP '2011-04-29 11:41:56', NULL)
--end
INSERT INTO stm_app (app_id, app_name, app_type, app_title, app_theme, app_scales, app_project, app_template, app_refresh, app_ggiid, app_created, app_logo) VALUES (10004, 'SITMUN - Externa', 'E', 'SITMUN - Externa', NULL, NULL, NULL, 'http://example.com/?ter.codmun=${MUN_INE}&codusr=${USU_CODIGO}', false, NULL, TIMESTAMP '2011-04-29 11:41:56', NULL)
--end
INSERT INTO stm_app (app_id, app_name, app_type, app_title, app_theme, app_scales, app_project, app_template, app_refresh, app_ggiid, app_created, app_logo) VALUES (10005, 'SITMUN - Externa protegida', 'E', 'SITMUN - Externa protegida', NULL, NULL, NULL, 'http://example.com/?ter.codmun=${MUN_INE}&codusr=${USU_CODIGO}', false, NULL, TIMESTAMP '2011-04-29 11:41:56', NULL)
--end
INSERT INTO stm_app (app_id, app_name, app_type, app_title, app_theme, app_scales, app_project, app_template, app_refresh, app_ggiid, app_created, app_logo) VALUES (10006, 'SITMUN - Turistica', 'T', 'SITMUN - Turistica', NULL, NULL, NULL, NULL, false, NULL, TIMESTAMP '2011-04-29 11:41:56', NULL)
--end
INSERT INTO stm_app_tree (atr_id, atr_appid, atr_treeid, atr_order) VALUES (10001, 10001, 10001, '0')
--end
INSERT INTO stm_app_tree (atr_id, atr_appid, atr_treeid, atr_order) VALUES (10002, 10002, 10002, '0')
--end
INSERT INTO stm_app_tree (atr_id, atr_appid, atr_treeid, atr_order) VALUES (10003, 10003, 10003, '0')
--end
INSERT INTO stm_app_tree (atr_id, atr_appid, atr_treeid, atr_order) VALUES (10004, 10001, 10002, '2')
--end
INSERT INTO stm_app_rol (aro_roleid, aro_appid) VALUES (10001, 10001)
--end
INSERT INTO stm_app_rol (aro_roleid, aro_appid) VALUES (10001, 10002)
--end
INSERT INTO stm_app_rol (aro_roleid, aro_appid) VALUES (10001, 10003)
--end
INSERT INTO stm_app_rol (aro_roleid, aro_appid) VALUES (10001, 10004)
--end
INSERT INTO stm_app_rol (aro_roleid, aro_appid) VALUES (10002, 10005)
--end
INSERT INTO stm_par_app (pap_id, pap_name, pap_value, pap_type, pap_appid) VALUES (10011, 'A3 - Horitzontal', 'A3H.jasper', 'PRINT_TEMPLATE', 10001)
--end
INSERT INTO stm_par_app (pap_id, pap_name, pap_value, pap_type, pap_appid) VALUES (10012, 'A3 - Vertical', 'A3V.jasper', 'PRINT_TEMPLATE', 10001)
--end
INSERT INTO stm_par_app (pap_id, pap_name, pap_value, pap_type, pap_appid) VALUES (10013, 'A4 - Horitzontal', 'A4H.jasper', 'PRINT_TEMPLATE', 10001)
--end
INSERT INTO stm_par_app (pap_id, pap_name, pap_value, pap_type, pap_appid) VALUES (10014, 'A4 - Vertical', 'A4V.jasper', 'PRINT_TEMPLATE', 10001)
--end
INSERT INTO stm_par_app (pap_id, pap_name, pap_value, pap_type, pap_appid) VALUES (10015, 'A3 - Horitzontal', 'A3H.jasper', 'PRINT_TEMPLATE', 10002)
--end
INSERT INTO stm_par_app (pap_id, pap_name, pap_value, pap_type, pap_appid) VALUES (10016, 'A3 - Vertical', 'A3V.jasper', 'PRINT_TEMPLATE', 10002)
--end
INSERT INTO stm_par_app (pap_id, pap_name, pap_value, pap_type, pap_appid) VALUES (10017, 'A4 - Horitzontal', 'A4H.jasper', 'PRINT_TEMPLATE', 10002)
--end
INSERT INTO stm_par_app (pap_id, pap_name, pap_value, pap_type, pap_appid) VALUES (10018, 'A4 - Vertical', 'A4V.jasper', 'PRINT_TEMPLATE', 10002)
--end
INSERT INTO stm_par_app (pap_id, pap_name, pap_value, pap_type, pap_appid) VALUES (10019, 'A3 - Horitzontal', 'A3H.jasper', 'PRINT_TEMPLATE', 10003)
--end
INSERT INTO stm_par_app (pap_id, pap_name, pap_value, pap_type, pap_appid) VALUES (10020, 'A3 - Vertical', 'A3V.jasper', 'PRINT_TEMPLATE', 10003)
--end
INSERT INTO stm_par_app (pap_id, pap_name, pap_value, pap_type, pap_appid) VALUES (10021, 'A4 - Horitzontal', 'A4H.jasper', 'PRINT_TEMPLATE', 10003)
--end
INSERT INTO stm_par_app (pap_id, pap_name, pap_value, pap_type, pap_appid) VALUES (10022, 'A4 - Vertical', 'A4V.jasper', 'PRINT_TEMPLATE', 10003)
--end
INSERT INTO stm_app_bckg (abc_id, abc_appid, abc_backid, abc_order) VALUES (10001, 10001, 10001, '1')
--end
INSERT INTO stm_app_ter (ate_id, ate_appid, ate_terid, ate_iniext) VALUES (10001, 10001, 10001, NULL)
--end
INSERT INTO stm_app_ter (ate_id, ate_appid, ate_terid, ate_iniext) VALUES (10002, 10001, 10003, '430250 4612070 469609 4638298.5')
--end
INSERT INTO stm_avail_gi (agi_id, agi_terid, agi_giid, agi_created) VALUES (10001, 10001, 10001, TIMESTAMP '2011-04-29 11:41:57')
--end
INSERT INTO stm_avail_gi (agi_id, agi_terid, agi_giid, agi_created) VALUES (10002, 10001, 10002, TIMESTAMP '2011-04-29 11:41:57')
--end
INSERT INTO stm_avail_gi (agi_id, agi_terid, agi_giid, agi_created) VALUES (10003, 10001, 10003, TIMESTAMP '2011-04-29 11:41:57')
--end
INSERT INTO stm_avail_gi (agi_id, agi_terid, agi_giid, agi_created) VALUES (10004, 10001, 10004, TIMESTAMP '2011-04-29 11:41:57')
--end
INSERT INTO stm_avail_gi (agi_id, agi_terid, agi_giid, agi_created) VALUES (10005, 10001, 10005, TIMESTAMP '2011-04-29 11:41:57')
--end
INSERT INTO stm_avail_gi (agi_id, agi_terid, agi_giid, agi_created) VALUES (10006, 10001, 10006, TIMESTAMP '2011-04-29 11:41:57')
--end
INSERT INTO stm_avail_gi (agi_id, agi_terid, agi_giid, agi_created) VALUES (10007, 10001, 10007, TIMESTAMP '2011-04-29 11:41:57')
--end
INSERT INTO stm_avail_gi (agi_id, agi_terid, agi_giid, agi_created) VALUES (10008, 10001, 10008, TIMESTAMP '2011-04-29 11:41:57')
--end
INSERT INTO stm_avail_gi (agi_id, agi_terid, agi_giid, agi_created) VALUES (10009, 10001, 10009, TIMESTAMP '2011-04-29 11:41:57')
--end
INSERT INTO stm_avail_gi (agi_id, agi_terid, agi_giid, agi_created) VALUES (10010, 10001, 10010, TIMESTAMP '2011-04-29 11:41:57')
--end
INSERT INTO stm_avail_gi (agi_id, agi_terid, agi_giid, agi_created) VALUES (10011, 10001, 10011, TIMESTAMP '2011-04-29 11:41:57')
--end
INSERT INTO stm_tree_nod (tno_id, tno_parentid, tno_name, tno_tooltip, tno_default, tno_order, tno_treeid, tno_giid, tno_radio, tno_active, tno_load_data) VALUES (10001, NULL, 'Topográficos', 'Topográficos', false, '2', 10001, NULL, false, true, false)
--end
INSERT INTO stm_tree_nod (tno_id, tno_parentid, tno_name, tno_tooltip, tno_default, tno_order, tno_treeid, tno_giid, tno_radio, tno_active, tno_load_data) VALUES (10002, 10001, 'Topográfico 1:50.000', 'Topográfico 1:50.000', false, '1', 10001, NULL, false, true, false)
--end
INSERT INTO stm_tree_nod (tno_id, tno_parentid, tno_name, tno_tooltip, tno_default, tno_order, tno_treeid, tno_giid, tno_radio, tno_active, tno_load_data) VALUES (10003, 10002, 'Toponímia', 'Toponímia', false, '1', 10001, 10006, NULL, true, false)
--end
INSERT INTO stm_tree_nod (tno_id, tno_parentid, tno_name, tno_tooltip, tno_default, tno_order, tno_treeid, tno_giid, tno_radio, tno_active, tno_load_data) VALUES (10004, 10002, 'Altimetría', 'Altimetría', false, '2', 10001, 10007, NULL, true, false)
--end
INSERT INTO stm_tree_nod (tno_id, tno_parentid, tno_name, tno_tooltip, tno_default, tno_order, tno_treeid, tno_giid, tno_radio, tno_active, tno_load_data) VALUES (10005, 10001, 'Topográfico 1:25.000', 'Topográfico 1:25.000', false, '2', 10001, NULL, false, true, false)
--end
INSERT INTO stm_tree_nod (tno_id, tno_parentid, tno_name, tno_tooltip, tno_default, tno_order, tno_treeid, tno_giid, tno_radio, tno_active, tno_load_data) VALUES (10006, 10005, '1:25.000 ICGC', '1:25.000 ICGC', false, '0', 10001, 10005, NULL, true, false)
--end
INSERT INTO stm_tree_nod (tno_id, tno_parentid, tno_name, tno_tooltip, tno_default, tno_order, tno_treeid, tno_giid, tno_radio, tno_active, tno_load_data) VALUES (10007, NULL, 'Ortofotos', 'Ortofotos', false, '1', 10001, NULL, true, true, true)
--end
INSERT INTO stm_tree_nod (tno_id, tno_parentid, tno_name, tno_tooltip, tno_default, tno_order, tno_treeid, tno_giid, tno_radio, tno_active, tno_load_data) VALUES (10008, 10007, 'Actual', 'Actual', false, '2', 10001, 10008, NULL, true, false)
--end
INSERT INTO stm_tree_nod (tno_id, tno_parentid, tno_name, tno_tooltip, tno_default, tno_order, tno_treeid, tno_giid, tno_radio, tno_active, tno_load_data) VALUES (10009, 10007, 'Infrarrojo', 'Infrarrojo', true, '1', 10001, 10009, NULL, true, false)
--end
INSERT INTO stm_tree_nod (tno_id, tno_parentid, tno_name, tno_tooltip, tno_default, tno_order, tno_treeid, tno_giid, tno_radio, tno_active, tno_load_data) VALUES (10010, 10007, 'Blocked Service Layer', 'Blocked Service Layer', false, '3', 10001, 10010, NULL, true, false)
--end
INSERT INTO stm_tree_nod (tno_id, tno_parentid, tno_name, tno_tooltip, tno_default, tno_order, tno_treeid, tno_giid, tno_radio, tno_active, tno_load_data) VALUES (10011, 10007, 'Geo-Blocked Layer', 'Geo-Blocked Layer', false, '4', 10001, 10011, NULL, true, false)
--end
INSERT INTO stm_tree_nod (tno_id, tno_parentid, tno_name, tno_tooltip, tno_default, tno_order, tno_treeid, tno_giid, tno_radio, tno_active, tno_load_data) VALUES (10012, 10007, 'Inactive visible leaf', 'Inactive visible leaf', false, '5', 10001, 10008, NULL, false, false)
--end
INSERT INTO stm_tree_nod (tno_id, tno_parentid, tno_name, tno_tooltip, tno_default, tno_order, tno_treeid, tno_giid, tno_radio, tno_active, tno_load_data) VALUES (10013, 10001, 'Inactive folder subtree', 'Inactive folder subtree', false, '3', 10001, NULL, false, false, false)
--end
INSERT INTO stm_tree_nod (tno_id, tno_parentid, tno_name, tno_tooltip, tno_default, tno_order, tno_treeid, tno_giid, tno_radio, tno_active, tno_load_data) VALUES (10014, 10013, 'Child under inactive folder', 'Child under inactive folder', true, '1', 10001, NULL, false, true, false)
--end
INSERT INTO stm_tree_nod (tno_id, tno_parentid, tno_name, tno_tooltip, tno_default, tno_order, tno_treeid, tno_giid, tno_radio, tno_active, tno_load_data) VALUES (10015, NULL, 'Municipal root', 'Municipal root', false, '0', 10002, NULL, false, true, false)
--end
INSERT INTO stm_tree_rol (tro_treeid, tro_roleid) VALUES (10001, 10001)
--end
INSERT INTO stm_tree_rol (tro_treeid, tro_roleid) VALUES (10001, 10002)
--end
INSERT INTO stm_tree_rol (tro_treeid, tro_roleid) VALUES (10002, 10001)
--end
INSERT INTO stm_tree_rol (tro_treeid, tro_roleid) VALUES (10002, 10002)
--end
INSERT INTO stm_tree_rol (tro_treeid, tro_roleid) VALUES (10003, 10001)
--end
INSERT INTO stm_tree_rol (tro_treeid, tro_roleid) VALUES (10003, 10002)
--end
INSERT INTO stm_tsk_ui (tui_id, tui_name, tui_tooltip, tui_order) VALUES (10033, 'markup-help-panel', 'markup-help-panel', '33')
--end
INSERT INTO stm_task (tas_id, tas_name, tas_serid, tas_gtaskid, tas_ttaskid, tas_tuiid, tas_created, tas_connid, tas_giid, tas_params) VALUES (10034, 'Events', NULL, 10005, 5, NULL, NULL, 10001, NULL, '{"parameters":[{"variable": "limit","label": "limit","type": "query","required": true}],"scope":"sql-query","command":"select * from order limit {limit}"}')
--end
INSERT INTO stm_task (tas_id, tas_name, tas_serid, tas_gtaskid, tas_ttaskid, tas_tuiid, tas_created, tas_connid, tas_giid, tas_params) VALUES (10035, 'Timetable', NULL, 10005, 5, NULL, NULL, NULL, NULL, '{"command":"https://ide.cime.es/api_ide/Mobilitat/stops/Stopcode/{codigo}","scope":"web-api-query","parameters":[{"variable": "codigo","label":"codigo","type":"template","required":true}]}')
--end
INSERT INTO stm_task (tas_id, tas_name, tas_serid, tas_gtaskid, tas_ttaskid, tas_tuiid, tas_created, tas_connid, tas_giid, tas_params) VALUES (10036, 'Task with blocked service', 10008, 1, 1, 1, NULL, NULL, NULL, NULL)
--end
INSERT INTO stm_task (tas_id, tas_name, tas_serid, tas_gtaskid, tas_ttaskid, tas_tuiid, tas_created, tas_connid, tas_giid, tas_params) VALUES (10037, 'Web API proxied (query param)', NULL, 10005, 5, NULL, NULL, NULL, NULL, '{"command":"https://api.example.invalid/items","scope":"web-api-query","parameters":[{"variable":"limit","label":"limit","type":"query","required":false}]}')
--end
INSERT INTO stm_task (tas_id, tas_name, tas_serid, tas_gtaskid, tas_ttaskid, tas_tuiid, tas_created, tas_connid, tas_giid, tas_params) VALUES (10038, 'Web API direct (template param)', NULL, 10005, 5, NULL, NULL, NULL, NULL, '{"command":"https://api.example.invalid/stopcode/{codigo}","scope":"web-api-query-no-proxy","parameters":[{"variable":"codigo","label":"codigo","type":"template","required":true}]}')
--end
INSERT INTO stm_task (tas_id, tas_name, tas_serid, tas_gtaskid, tas_ttaskid, tas_tuiid, tas_created, tas_connid, tas_giid, tas_params) VALUES (10039, 'Web API direct (query param)', NULL, 10005, 5, NULL, NULL, NULL, NULL, '{"command":"https://api.example.invalid/page?limit={limit}","scope":"web-api-query-no-proxy","parameters":[{"variable":"limit","label":"limit","type":"query","required":true}]}')
--end
INSERT INTO stm_task (tas_id, tas_name, tas_serid, tas_gtaskid, tas_ttaskid, tas_tuiid, tas_created, tas_connid, tas_giid, tas_params) VALUES (10040, 'SQL sample (template param)', NULL, 10005, 5, NULL, NULL, 10001, NULL, '{"parameters":[{"variable":"codigo","label":"codigo","type":"template","required":true}],"scope":"sql-query","command":"select * from stops where code = {codigo}"}')
--end
INSERT INTO stm_task (tas_id, tas_name, tas_serid, tas_gtaskid, tas_ttaskid, tas_tuiid, tas_created, tas_connid, tas_giid, tas_params) VALUES (10041, 'Events locator', NULL, 1, 4, 24, NULL, NULL, NULL, '{"parameters":[{"variable":"resultsPath","label":"Results path","type":"I","value":"/features"},{"variable":"labelField","label":"Label","type":"I","value":"name"}]}')
--end
INSERT INTO stm_taskrel (tar_id, tar_type, tar_taskid, tar_taskrelid) VALUES (10001, 'query-task', 10041, 10034)
--end
INSERT INTO stm_rol_tsk (rts_roleid, rts_taskid) VALUES (10001, 1)
--end
INSERT INTO stm_rol_tsk (rts_roleid, rts_taskid) VALUES (10001, 2)
--end
INSERT INTO stm_rol_tsk (rts_roleid, rts_taskid) VALUES (10001, 3)
--end
INSERT INTO stm_rol_tsk (rts_roleid, rts_taskid) VALUES (10001, 4)
--end
INSERT INTO stm_rol_tsk (rts_roleid, rts_taskid) VALUES (10001, 5)
--end
INSERT INTO stm_rol_tsk (rts_roleid, rts_taskid) VALUES (10001, 6)
--end
INSERT INTO stm_rol_tsk (rts_roleid, rts_taskid) VALUES (10001, 7)
--end
INSERT INTO stm_rol_tsk (rts_roleid, rts_taskid) VALUES (10001, 8)
--end
INSERT INTO stm_rol_tsk (rts_roleid, rts_taskid) VALUES (10001, 9)
--end
INSERT INTO stm_rol_tsk (rts_roleid, rts_taskid) VALUES (10001, 10)
--end
INSERT INTO stm_rol_tsk (rts_roleid, rts_taskid) VALUES (10001, 11)
--end
INSERT INTO stm_rol_tsk (rts_roleid, rts_taskid) VALUES (10001, 12)
--end
INSERT INTO stm_rol_tsk (rts_roleid, rts_taskid) VALUES (10001, 13)
--end
INSERT INTO stm_rol_tsk (rts_roleid, rts_taskid) VALUES (10001, 14)
--end
INSERT INTO stm_rol_tsk (rts_roleid, rts_taskid) VALUES (10001, 15)
--end
INSERT INTO stm_rol_tsk (rts_roleid, rts_taskid) VALUES (10001, 16)
--end
INSERT INTO stm_rol_tsk (rts_roleid, rts_taskid) VALUES (10001, 17)
--end
INSERT INTO stm_rol_tsk (rts_roleid, rts_taskid) VALUES (10001, 18)
--end
INSERT INTO stm_rol_tsk (rts_roleid, rts_taskid) VALUES (10001, 19)
--end
INSERT INTO stm_rol_tsk (rts_roleid, rts_taskid) VALUES (10001, 20)
--end
INSERT INTO stm_rol_tsk (rts_roleid, rts_taskid) VALUES (10001, 21)
--end
INSERT INTO stm_rol_tsk (rts_roleid, rts_taskid) VALUES (10001, 22)
--end
INSERT INTO stm_rol_tsk (rts_roleid, rts_taskid) VALUES (10001, 23)
--end
INSERT INTO stm_rol_tsk (rts_roleid, rts_taskid) VALUES (10001, 24)
--end
INSERT INTO stm_rol_tsk (rts_roleid, rts_taskid) VALUES (10001, 25)
--end
INSERT INTO stm_rol_tsk (rts_roleid, rts_taskid) VALUES (10001, 26)
--end
INSERT INTO stm_rol_tsk (rts_roleid, rts_taskid) VALUES (10001, 27)
--end
INSERT INTO stm_rol_tsk (rts_roleid, rts_taskid) VALUES (10001, 28)
--end
INSERT INTO stm_rol_tsk (rts_roleid, rts_taskid) VALUES (10001, 29)
--end
INSERT INTO stm_rol_tsk (rts_roleid, rts_taskid) VALUES (10001, 30)
--end
INSERT INTO stm_rol_tsk (rts_roleid, rts_taskid) VALUES (10001, 31)
--end
INSERT INTO stm_rol_tsk (rts_roleid, rts_taskid) VALUES (10001, 32)
--end
INSERT INTO stm_rol_tsk (rts_roleid, rts_taskid) VALUES (10001, 33)
--end
INSERT INTO stm_rol_tsk (rts_roleid, rts_taskid) VALUES (10001, 10034)
--end
INSERT INTO stm_rol_tsk (rts_roleid, rts_taskid) VALUES (10001, 10035)
--end
INSERT INTO stm_rol_tsk (rts_roleid, rts_taskid) VALUES (10001, 10036)
--end
INSERT INTO stm_rol_tsk (rts_roleid, rts_taskid) VALUES (10001, 10037)
--end
INSERT INTO stm_rol_tsk (rts_roleid, rts_taskid) VALUES (10001, 10038)
--end
INSERT INTO stm_rol_tsk (rts_roleid, rts_taskid) VALUES (10001, 10039)
--end
INSERT INTO stm_rol_tsk (rts_roleid, rts_taskid) VALUES (10001, 10040)
--end
INSERT INTO stm_rol_tsk (rts_roleid, rts_taskid) VALUES (10001, 10041)
--end
INSERT INTO stm_avail_tsk (ats_id, ats_terid, ats_taskid) VALUES (10001, 10001, 1)
--end
INSERT INTO stm_avail_tsk (ats_id, ats_terid, ats_taskid) VALUES (10002, 10001, 20)
--end
INSERT INTO stm_avail_tsk (ats_id, ats_terid, ats_taskid) VALUES (10003, 10001, 10034)
--end
INSERT INTO stm_avail_tsk (ats_id, ats_terid, ats_taskid) VALUES (10004, 10001, 10035)
--end
INSERT INTO stm_avail_tsk (ats_id, ats_terid, ats_taskid) VALUES (10005, 10001, 23)
--end
INSERT INTO stm_avail_tsk (ats_id, ats_terid, ats_taskid) VALUES (10006, 10001, 27)
--end
INSERT INTO stm_avail_tsk (ats_id, ats_terid, ats_taskid) VALUES (10007, 10001, 28)
--end
INSERT INTO stm_avail_tsk (ats_id, ats_terid, ats_taskid) VALUES (10008, 10001, 10037)
--end
INSERT INTO stm_avail_tsk (ats_id, ats_terid, ats_taskid) VALUES (10009, 10001, 10038)
--end
INSERT INTO stm_avail_tsk (ats_id, ats_terid, ats_taskid) VALUES (10010, 10001, 10039)
--end
INSERT INTO stm_avail_tsk (ats_id, ats_terid, ats_taskid) VALUES (10011, 10001, 10040)
--end
INSERT INTO stm_avail_tsk (ats_id, ats_terid, ats_taskid) VALUES (10012, 10001, 10041)
--end
INSERT INTO stm_par_ser (pse_id, pse_serid, pse_type, pse_name, pse_value) VALUES (10001, 10001, 'WMTS', 'format', 'image/jpeg')
--end
INSERT INTO stm_par_ser (pse_id, pse_serid, pse_type, pse_name, pse_value) VALUES (10002, 10001, 'WMTS', 'matrixSet', 'UTM25831')
--end
INSERT INTO stm_par_ser (pse_id, pse_serid, pse_type, pse_name, pse_value) VALUES (10003, 10006, 'WMS', 'SRS', 'EPSG:25831')
--end
INSERT INTO stm_par_ser (pse_id, pse_serid, pse_type, pse_name, pse_value) VALUES (10004, 10006, 'WMS', 'VERSION', '1.1.1')
--end
INSERT INTO stm_post (pos_id, pos_post, pos_org, pos_email, pos_created, pos_expiration, pos_userid, pos_terid) VALUES (10611, 'Job 611', 'Org 611', 'job611@example.com', NULL, NULL, 10004, 10002)
--end
INSERT INTO stm_post (pos_id, pos_post, pos_org, pos_email, pos_created, pos_expiration, pos_userid, pos_terid) VALUES (10622, 'Job 622', 'Org 622', 'job622@example.com', TIMESTAMP '2016-03-18 13:29:24', NULL, 10003, 10001)
--end
INSERT INTO stm_post (pos_id, pos_post, pos_org, pos_email, pos_created, pos_expiration, pos_userid, pos_terid) VALUES (10648, 'Job 648', 'Org 648', 'job648@example.com', TIMESTAMP '2016-03-24 08:34:15', NULL, 10004, 10001)
--end
INSERT INTO stm_post (pos_id, pos_post, pos_org, pos_email, pos_created, pos_expiration, pos_userid, pos_terid) VALUES (10668, 'Job 668', 'Org 668', 'job668@example.com', TIMESTAMP '2016-04-05 10:06:55', NULL, 10012, 10001)
--end
INSERT INTO stm_post (pos_id, pos_post, pos_org, pos_email, pos_created, pos_expiration, pos_userid, pos_terid) VALUES (10855, 'Job 855', 'Org 855', 'job855@example.com', NULL, NULL, 10012, 10002)
--end
INSERT INTO stm_post (pos_id, pos_post, pos_org, pos_email, pos_created, pos_expiration, pos_userid, pos_terid) VALUES (11211, 'Job 1211', 'Org 1211', 'job1211@example.com', NULL, NULL, 10003, 10003)
--end
INSERT INTO stm_post (pos_id, pos_post, pos_org, pos_email, pos_created, pos_expiration, pos_userid, pos_terid) VALUES (11238, 'Job 1238', 'Org 1238', 'job1238@example.com', NULL, NULL, 10004, 10003)
--end
INSERT INTO stm_post (pos_id, pos_post, pos_org, pos_email, pos_created, pos_expiration, pos_userid, pos_terid) VALUES (11485, 'Job 1485', 'Org 1485', 'job1485@example.com', NULL, NULL, 10012, 10003)
--end
INSERT INTO stm_task (tas_id, tas_name, tas_gtaskid, tas_ttaskid, tas_tuiid) VALUES (10043, 'More Info Advanced', 1, 1, 34)
--end
INSERT INTO stm_task (tas_id, tas_name, tas_gtaskid, tas_ttaskid, tas_giid, tas_params) VALUES (10042, 'E2E MIA parent Toponimia', 1, 16, 10006, '{"parentLayout":"tabs","moreInfoAdvanced":true,"childTaskOrderIds":[10038],"parameters":[]}')
--end
INSERT INTO stm_rol_tsk (rts_roleid, rts_taskid) VALUES (10001, 10043)
--end
INSERT INTO stm_rol_tsk (rts_roleid, rts_taskid) VALUES (10001, 10042)
--end
INSERT INTO stm_avail_tsk (ats_id, ats_terid, ats_taskid) VALUES (10101, 10001, 10043)
--end
INSERT INTO stm_avail_tsk (ats_id, ats_terid, ats_taskid) VALUES (10100, 10001, 10042)
--end
INSERT INTO stm_task (tas_id, tas_name, tas_gtaskid, tas_ttaskid, tas_tuiid, tas_connid, tas_params) VALUES (10023, 'scaleSelector', 1, 1, 23, 10001, '{"parameters":[{"variable":"columnA"},{"variable":"columnB"}],"command": "SELECT * FROM EXAMPLE"}')
--end
INSERT INTO stm_rol_tsk (rts_roleid, rts_taskid) VALUES (10001, 10023)
--end
INSERT INTO stm_avail_tsk (ats_id, ats_terid, ats_taskid) VALUES (10023, 10001, 10023)
--end
INSERT INTO stm_task (tas_id, tas_name, tas_gtaskid, tas_ttaskid, tas_tuiid, tas_connid, tas_params) VALUES (10027, 'threed', 1, 1, 27, 10001, '{"parameters":[{"variable":"columnA"}],"command": "SELECT * FROM EXAMPLE WHERE TERR_COD=#{TERR_COD}"}')
--end
INSERT INTO stm_rol_tsk (rts_roleid, rts_taskid) VALUES (10001, 10027)
--end
INSERT INTO stm_avail_tsk (ats_id, ats_terid, ats_taskid) VALUES (10027, 10001, 10027)
--end
INSERT INTO stm_task (tas_id, tas_name, tas_gtaskid, tas_ttaskid, tas_tuiid, tas_connid, tas_params) VALUES (10028, 'TOC', 1, 1, 28, 10001, '{"command": "SELECT * FROM EXAMPLE WHERE USER_ID=#{USER_ID} AND TERR_ID=#{TERR_ID} AND APP_ID=#{APP_ID} AND TERR_COD=#{TERR_COD}"}')
--end
INSERT INTO stm_rol_tsk (rts_roleid, rts_taskid) VALUES (10001, 10028)
--end
INSERT INTO stm_avail_tsk (ats_id, ats_terid, ats_taskid) VALUES (10028, 10001, 10028)
--end
INSERT INTO stm_translation (tra_id, tra_eleid, tra_column, tra_lanid, tra_name) VALUES (19301, 10001, 'Background.name', 2, 'Mapa de fondo')
--end
INSERT INTO stm_codelist (cod_id, cod_list, cod_value, cod_system, cod_default, cod_description) VALUES (19001, 'service.nativeProtocol', 'NONE', false, false, 'NONE')
--end
INSERT INTO stm_codelist (cod_id, cod_list, cod_value, cod_system, cod_default, cod_description) VALUES (19002, 'databaseConnection.driver', 'org.h2.Driver', true, false, 'H2 JDBC Driver')
--end
INSERT INTO stm_translation (tra_id, tra_eleid, tra_column, tra_lanid, tra_name) VALUES (19201, 19002, 'CodeListValue.description', 2, 'Controlador JDBC H2')
--end
INSERT INTO stm_translation (tra_id, tra_eleid, tra_column, tra_lanid, tra_name) VALUES (19202, 19002, 'CodeListValue.description', 3, 'Controlador JDBC H2')
--end
INSERT INTO stm_translation (tra_id, tra_eleid, tra_column, tra_lanid, tra_name) VALUES (19203, 19002, 'CodeListValue.description', 4, 'Controlador JDBC H2')
--end
INSERT INTO stm_translation (tra_id, tra_eleid, tra_column, tra_lanid, tra_name) VALUES (19204, 19002, 'CodeListValue.description', 5, 'Pilote JDBC H2')
--end
INSERT INTO stm_codelist (cod_id, cod_list, cod_value, cod_system, cod_default, cod_description) VALUES (19003, 'databaseConnection.driver', 'org.postgresql.Driver', true, false, 'PostgreSQL JDBC Driver')
--end
INSERT INTO stm_translation (tra_id, tra_eleid, tra_column, tra_lanid, tra_name) VALUES (19205, 19003, 'CodeListValue.description', 2, 'Controlador JDBC PostgreSQL')
--end
INSERT INTO stm_translation (tra_id, tra_eleid, tra_column, tra_lanid, tra_name) VALUES (19206, 19003, 'CodeListValue.description', 3, 'Controlador JDBC PostgreSQL')
--end
INSERT INTO stm_translation (tra_id, tra_eleid, tra_column, tra_lanid, tra_name) VALUES (19207, 19003, 'CodeListValue.description', 4, 'Controlador JDBC PostgreSQL')
--end
INSERT INTO stm_translation (tra_id, tra_eleid, tra_column, tra_lanid, tra_name) VALUES (19208, 19003, 'CodeListValue.description', 5, 'Pilote JDBC PostgreSQL')
--end
INSERT INTO stm_codelist (cod_id, cod_list, cod_value, cod_system, cod_default, cod_description) VALUES (19004, 'databaseConnection.driver', 'oracle.jdbc.OracleDriver', true, false, 'Oracle JDBC driver')
--end
INSERT INTO stm_translation (tra_id, tra_eleid, tra_column, tra_lanid, tra_name) VALUES (19209, 19004, 'CodeListValue.description', 2, 'Controlador JDBC Oracle')
--end
INSERT INTO stm_translation (tra_id, tra_eleid, tra_column, tra_lanid, tra_name) VALUES (19210, 19004, 'CodeListValue.description', 3, 'Controlador JDBC Oracle')
--end
INSERT INTO stm_translation (tra_id, tra_eleid, tra_column, tra_lanid, tra_name) VALUES (19211, 19004, 'CodeListValue.description', 4, 'Controlador JDBC Oracle')
--end
INSERT INTO stm_translation (tra_id, tra_eleid, tra_column, tra_lanid, tra_name) VALUES (19212, 19004, 'CodeListValue.description', 5, 'Pilote JDBC Oracle')
--end
INSERT INTO stm_codelist (cod_id, cod_list, cod_value, cod_system, cod_default, cod_description) VALUES (19005, 'databaseConnection.driver', 'com.microsoft.sqlserver.jdbc.SQLServerDriver', true, false, 'Microsoft SQL Server JDBC Driver')
--end
INSERT INTO stm_translation (tra_id, tra_eleid, tra_column, tra_lanid, tra_name) VALUES (19213, 19005, 'CodeListValue.description', 2, 'Controlador JDBC Microsoft SQL Server')
--end
INSERT INTO stm_translation (tra_id, tra_eleid, tra_column, tra_lanid, tra_name) VALUES (19214, 19005, 'CodeListValue.description', 3, 'Controlador JDBC Microsoft SQL Server')
--end
INSERT INTO stm_translation (tra_id, tra_eleid, tra_column, tra_lanid, tra_name) VALUES (19215, 19005, 'CodeListValue.description', 4, 'Controlador JDBC Microsoft SQL Server')
--end
INSERT INTO stm_translation (tra_id, tra_eleid, tra_column, tra_lanid, tra_name) VALUES (19216, 19005, 'CodeListValue.description', 5, 'Pilote JDBC Microsoft SQL Server')
--end
