INSERT INTO stm_tsk_typ (tty_id, tty_name, tty_title, tty_enabled, tty_parentid, tty_order, tty_spec) VALUES (0, 'edit', 'Edit', true, NULL, 3, NULL)
--end
INSERT INTO stm_tsk_typ (tty_id, tty_name, tty_title, tty_enabled, tty_parentid, tty_order, tty_spec) VALUES (1, 'basic', 'Basic', true, NULL, 1, NULL)
--end
INSERT INTO stm_tsk_typ (tty_id, tty_name, tty_title, tty_enabled, tty_parentid, tty_order, tty_spec) VALUES (4, 'localizador', 'Locator', true, NULL, 6, NULL)
--end
INSERT INTO stm_tsk_typ (tty_id, tty_name, tty_title, tty_enabled, tty_parentid, tty_order, tty_spec) VALUES (5, 'query', 'Query', true, NULL, 2, NULL)
--end
INSERT INTO stm_tsk_typ (tty_id, tty_name, tty_title, tty_enabled, tty_parentid, tty_order, tty_spec) VALUES (6, 'moreInfo', 'More Info', true, NULL, 4, NULL)
--end
INSERT INTO stm_tsk_typ (tty_id, tty_name, tty_title, tty_enabled, tty_parentid, tty_order, tty_spec) VALUES (15, 'template', 'Template', true, NULL, 15, NULL)
--end
INSERT INTO stm_tsk_typ (tty_id, tty_name, tty_title, tty_enabled, tty_parentid, tty_order, tty_spec) VALUES (16, 'moreInfoAdvanced', 'More Info Advanced', true, NULL, 16, NULL)
--end
INSERT INTO stm_tsk_typ (tty_id, tty_name, tty_title, tty_enabled, tty_parentid, tty_order, tty_spec) VALUES (17, 'documentExport', 'Document Export', true, NULL, 18, '{  "form": {    "label": "tasksEntity.generalData",    "elements": {      "type": {        "hidden": true,        "value": 17,        "required": true      },      "name": {        "label": "tasksEntity.name",        "control": "input",        "required": true      },      "group": {        "label": "tasksEntity.group",        "control": "selector",        "selector": {          "data": "taskGroup",          "name": "name",          "value": "id"        },        "required": true      },      "exportEngine": {        "label": "tasksDocumentExportEntity.engine",        "control": "selector",        "selector": {          "data": "codelist-values",          "queryParams": {            "codeListName": "documentExport.engine",            "projection": "view"          },          "name": "description",          "value": "value"        },        "required": true,        "jsonParams": true      },      "downloadFormat": {        "label": "tasksDocumentExportEntity.output",        "control": "selector",        "selector": {          "data": "codelist-values",          "queryParams": {            "codeListName": "documentExport.output",            "projection": "view"          },          "name": "description",          "value": "value"        },        "required": true,        "jsonParams": true      },      "downloadSource": {        "label": "tasksDocumentExportEntity.sourcePath",        "control": "input",        "required": false,        "jsonParams": true      }    }  }}')
--end
INSERT INTO stm_tsk_typ (tty_id, tty_name, tty_title, tty_enabled, tty_parentid, tty_order, tty_spec) VALUES (18, 'mapImage', 'Map Image', true, NULL, 19, '{  "form": {    "label": "entity.task.mapImage.label",    "elements": {      "type": {        "hidden": true,        "value": 18,        "required": true      },      "name": {        "label": "tasksEntity.name",        "control": "input",        "required": true      },      "group": {        "label": "tasksEntity.group",        "control": "selector",        "selector": {          "data": "taskGroup",          "name": "name",          "value": "id"        },        "required": true      }    }  }}')
--end
INSERT INTO stm_ter_typ (tet_id, tet_name, tet_official, tet_top, tet_bottom) VALUES (1, 'Country', true, true, false)
--end
INSERT INTO stm_ter_typ (tet_id, tet_name, tet_official, tet_top, tet_bottom) VALUES (2, 'Autonomous Community', true, false, false)
--end
INSERT INTO stm_ter_typ (tet_id, tet_name, tet_official, tet_top, tet_bottom) VALUES (3, 'Autonomous City', true, false, false)
--end
INSERT INTO stm_ter_typ (tet_id, tet_name, tet_official, tet_top, tet_bottom) VALUES (4, 'Provincial Council', true, false, false)
--end
INSERT INTO stm_ter_typ (tet_id, tet_name, tet_official, tet_top, tet_bottom) VALUES (5, 'Island Council (Balearic)', true, false, false)
--end
INSERT INTO stm_ter_typ (tet_id, tet_name, tet_official, tet_top, tet_bottom) VALUES (6, 'Island Council (Canary)', true, false, false)
--end
INSERT INTO stm_ter_typ (tet_id, tet_name, tet_official, tet_top, tet_bottom) VALUES (7, 'Municipality', true, false, true)
--end
INSERT INTO stm_ter_typ (tet_id, tet_name, tet_official, tet_top, tet_bottom) VALUES (8, 'Comarca', false, false, false)
--end
INSERT INTO stm_ter_typ (tet_id, tet_name, tet_official, tet_top, tet_bottom) VALUES (9, 'Metropolitan Area', false, false, false)
--end
INSERT INTO stm_ter_typ (tet_id, tet_name, tet_official, tet_top, tet_bottom) VALUES (10, 'Commonwealth of Municipalities', false, false, false)
--end
INSERT INTO stm_ter_typ (tet_id, tet_name, tet_official, tet_top, tet_bottom) VALUES (11, 'Municipal Grouping', false, false, false)
--end
INSERT INTO stm_ter_typ (tet_id, tet_name, tet_official, tet_top, tet_bottom) VALUES (12, 'Sub-municipal Entity', false, false, false)
--end
INSERT INTO stm_grp_tsk (gts_id, gts_name) VALUES (1, 'Basic')
--end
INSERT INTO stm_tsk_ui (tui_id, tui_name, tui_tooltip, tui_order, tui_type) VALUES (1, 'sitna.attribution', 'Attribution', 0, NULL)
--end
INSERT INTO stm_tsk_ui (tui_id, tui_name, tui_tooltip, tui_order, tui_type) VALUES (2, 'sitna.basemapSelector', 'Basemap Selector', 0, NULL)
--end
INSERT INTO stm_tsk_ui (tui_id, tui_name, tui_tooltip, tui_order, tui_type) VALUES (3, 'sitna.click', 'Click', 0, NULL)
--end
INSERT INTO stm_tsk_ui (tui_id, tui_name, tui_tooltip, tui_order, tui_type) VALUES (4, 'sitna.coordinates', 'Coordinates', 0, NULL)
--end
INSERT INTO stm_tsk_ui (tui_id, tui_name, tui_tooltip, tui_order, tui_type) VALUES (5, 'sitna.dataLoader', 'Data Loader', 0, NULL)
--end
INSERT INTO stm_tsk_ui (tui_id, tui_name, tui_tooltip, tui_order, tui_type) VALUES (6, 'sitna.download', 'Download', 0, NULL)
--end
INSERT INTO stm_tsk_ui (tui_id, tui_name, tui_tooltip, tui_order, tui_type) VALUES (7, 'sitna.drawMeasureModify', 'Draw, Measure and Modify', 0, NULL)
--end
INSERT INTO stm_tsk_ui (tui_id, tui_name, tui_tooltip, tui_order, tui_type) VALUES (8, 'sitna.featureInfo', 'Feature Info', 0, NULL)
--end
INSERT INTO stm_tsk_ui (tui_id, tui_name, tui_tooltip, tui_order, tui_type) VALUES (9, 'sitna.fullScreen', 'Full Screen', 0, NULL)
--end
INSERT INTO stm_tsk_ui (tui_id, tui_name, tui_tooltip, tui_order, tui_type) VALUES (10, 'sitna.geolocation', 'Geolocation', 0, NULL)
--end
INSERT INTO stm_tsk_ui (tui_id, tui_name, tui_tooltip, tui_order, tui_type) VALUES (11, 'sitna.layerCatalog', 'Layer Catalog', 0, NULL)
--end
INSERT INTO stm_tsk_ui (tui_id, tui_name, tui_tooltip, tui_order, tui_type) VALUES (12, 'sitna.legend', 'Legend', 0, NULL)
--end
INSERT INTO stm_tsk_ui (tui_id, tui_name, tui_tooltip, tui_order, tui_type) VALUES (13, 'sitna.loadingIndicator', 'Loading Indicator', 0, NULL)
--end
INSERT INTO stm_tsk_ui (tui_id, tui_name, tui_tooltip, tui_order, tui_type) VALUES (14, 'sitna.measure', 'Measure', 0, NULL)
--end
INSERT INTO stm_tsk_ui (tui_id, tui_name, tui_tooltip, tui_order, tui_type) VALUES (15, 'sitna.multiFeatureInfo', 'Multi Feature Info', 0, NULL)
--end
INSERT INTO stm_tsk_ui (tui_id, tui_name, tui_tooltip, tui_order, tui_type) VALUES (16, 'sitna.navBar', 'Navigation Bar', 0, NULL)
--end
INSERT INTO stm_tsk_ui (tui_id, tui_name, tui_tooltip, tui_order, tui_type) VALUES (17, 'sitna.offlineMapMaker', 'Offline Map Maker', 0, NULL)
--end
INSERT INTO stm_tsk_ui (tui_id, tui_name, tui_tooltip, tui_order, tui_type) VALUES (18, 'sitna.overviewMap', 'Overview Map', 0, NULL)
--end
INSERT INTO stm_tsk_ui (tui_id, tui_name, tui_tooltip, tui_order, tui_type) VALUES (19, 'sitna.popup', 'Popup', 0, NULL)
--end
INSERT INTO stm_tsk_ui (tui_id, tui_name, tui_tooltip, tui_order, tui_type) VALUES (20, 'sitna.printMap', 'Print Map', 0, NULL)
--end
INSERT INTO stm_tsk_ui (tui_id, tui_name, tui_tooltip, tui_order, tui_type) VALUES (21, 'sitna.scale', 'Scale', 0, NULL)
--end
INSERT INTO stm_tsk_ui (tui_id, tui_name, tui_tooltip, tui_order, tui_type) VALUES (22, 'sitna.scaleBar', 'Scale Bar', 0, NULL)
--end
INSERT INTO stm_tsk_ui (tui_id, tui_name, tui_tooltip, tui_order, tui_type) VALUES (23, 'sitna.scaleSelector', 'Scale Selector', 0, NULL)
--end
INSERT INTO stm_tsk_ui (tui_id, tui_name, tui_tooltip, tui_order, tui_type) VALUES (24, 'sitna.search', 'Search', 0, NULL)
--end
INSERT INTO stm_tsk_ui (tui_id, tui_name, tui_tooltip, tui_order, tui_type) VALUES (25, 'sitna.share', 'Share', 0, NULL)
--end
INSERT INTO stm_tsk_ui (tui_id, tui_name, tui_tooltip, tui_order, tui_type) VALUES (26, 'sitna.streetView', 'Street View', 0, NULL)
--end
INSERT INTO stm_tsk_ui (tui_id, tui_name, tui_tooltip, tui_order, tui_type) VALUES (27, 'sitna.threed', '3D View', 0, NULL)
--end
INSERT INTO stm_tsk_ui (tui_id, tui_name, tui_tooltip, tui_order, tui_type) VALUES (28, 'sitna.WFSEdit', 'WFSEdit', 0, NULL)
--end
INSERT INTO stm_tsk_ui (tui_id, tui_name, tui_tooltip, tui_order, tui_type) VALUES (29, 'sitna.WFSQuery', 'WFS Query', 0, NULL)
--end
INSERT INTO stm_tsk_ui (tui_id, tui_name, tui_tooltip, tui_order, tui_type) VALUES (30, 'sitna.workLayerManager', 'Work Layer Manager', 0, NULL)
--end
INSERT INTO stm_tsk_ui (tui_id, tui_name, tui_tooltip, tui_order, tui_type) VALUES (31, 'sitmun.moreInfo', 'More Info', 0, 'moreInfo')
--end
INSERT INTO stm_tsk_ui (tui_id, tui_name, tui_tooltip, tui_order, tui_type) VALUES (32, 'sitmun.locator', 'Locator', 0, 'locator')
--end
INSERT INTO stm_tsk_ui (tui_id, tui_name, tui_tooltip, tui_order, tui_type) VALUES (34, 'sitna.moreInfoAdvanced', 'More Info Advanced', 0, 'moreInfoAdvanced')
--end
INSERT INTO stm_user (use_id, use_user, use_pwd, use_name, use_surname, use_ident, use_identtype, use_email, use_adm, use_blocked, use_created, use_updated, use_last_password_change) VALUES (1, 'admin', '$2a$10$fxkKe8bLwlWNitI49I6DBeNtOhjTqkMw2KKWg8pPd8k2jOT5dYc/W', 'Administrator', NULL, NULL, NULL, NULL, true, false, TIMESTAMP '2006-12-31 00:00:00', NULL, NULL)
--end
INSERT INTO stm_user (use_id, use_user, use_pwd, use_name, use_surname, use_ident, use_identtype, use_email, use_adm, use_blocked, use_created, use_updated, use_last_password_change) VALUES (2, 'public', NULL, NULL, NULL, NULL, NULL, NULL, false, false, TIMESTAMP '2006-12-31 00:00:00', NULL, NULL)
--end
INSERT INTO stm_task (tas_id, tas_name, tas_created, tas_order, tas_giid, tas_serid, tas_gtaskid, tas_ttaskid, tas_tuiid, tas_connid, tas_params) VALUES (1, 'Attribution', NULL, NULL, NULL, NULL, 1, 1, 1, NULL, NULL)
--end
INSERT INTO stm_task (tas_id, tas_name, tas_created, tas_order, tas_giid, tas_serid, tas_gtaskid, tas_ttaskid, tas_tuiid, tas_connid, tas_params) VALUES (2, 'Basemap Selector', NULL, NULL, NULL, NULL, 1, 1, 2, NULL, NULL)
--end
INSERT INTO stm_task (tas_id, tas_name, tas_created, tas_order, tas_giid, tas_serid, tas_gtaskid, tas_ttaskid, tas_tuiid, tas_connid, tas_params) VALUES (3, 'Click', NULL, NULL, NULL, NULL, 1, 1, 3, NULL, NULL)
--end
INSERT INTO stm_task (tas_id, tas_name, tas_created, tas_order, tas_giid, tas_serid, tas_gtaskid, tas_ttaskid, tas_tuiid, tas_connid, tas_params) VALUES (4, 'Coordinates', NULL, NULL, NULL, NULL, 1, 1, 4, NULL, NULL)
--end
INSERT INTO stm_task (tas_id, tas_name, tas_created, tas_order, tas_giid, tas_serid, tas_gtaskid, tas_ttaskid, tas_tuiid, tas_connid, tas_params) VALUES (5, 'Data Loader', NULL, NULL, NULL, NULL, 1, 1, 5, NULL, NULL)
--end
INSERT INTO stm_task (tas_id, tas_name, tas_created, tas_order, tas_giid, tas_serid, tas_gtaskid, tas_ttaskid, tas_tuiid, tas_connid, tas_params) VALUES (6, 'Download', NULL, NULL, NULL, NULL, 1, 1, 6, NULL, NULL)
--end
INSERT INTO stm_task (tas_id, tas_name, tas_created, tas_order, tas_giid, tas_serid, tas_gtaskid, tas_ttaskid, tas_tuiid, tas_connid, tas_params) VALUES (7, 'Draw, Measure and Modify', NULL, NULL, NULL, NULL, 1, 1, 7, NULL, NULL)
--end
INSERT INTO stm_task (tas_id, tas_name, tas_created, tas_order, tas_giid, tas_serid, tas_gtaskid, tas_ttaskid, tas_tuiid, tas_connid, tas_params) VALUES (8, 'Feature Info', NULL, NULL, NULL, NULL, 1, 1, 8, NULL, NULL)
--end
INSERT INTO stm_task (tas_id, tas_name, tas_created, tas_order, tas_giid, tas_serid, tas_gtaskid, tas_ttaskid, tas_tuiid, tas_connid, tas_params) VALUES (9, 'Full Screen', NULL, NULL, NULL, NULL, 1, 1, 9, NULL, NULL)
--end
INSERT INTO stm_task (tas_id, tas_name, tas_created, tas_order, tas_giid, tas_serid, tas_gtaskid, tas_ttaskid, tas_tuiid, tas_connid, tas_params) VALUES (10, 'Geolocation', NULL, NULL, NULL, NULL, 1, 1, 10, NULL, NULL)
--end
INSERT INTO stm_task (tas_id, tas_name, tas_created, tas_order, tas_giid, tas_serid, tas_gtaskid, tas_ttaskid, tas_tuiid, tas_connid, tas_params) VALUES (11, 'Layer Catalog', NULL, NULL, NULL, NULL, 1, 1, 11, NULL, NULL)
--end
INSERT INTO stm_task (tas_id, tas_name, tas_created, tas_order, tas_giid, tas_serid, tas_gtaskid, tas_ttaskid, tas_tuiid, tas_connid, tas_params) VALUES (12, 'Legend', NULL, NULL, NULL, NULL, 1, 1, 12, NULL, NULL)
--end
INSERT INTO stm_task (tas_id, tas_name, tas_created, tas_order, tas_giid, tas_serid, tas_gtaskid, tas_ttaskid, tas_tuiid, tas_connid, tas_params) VALUES (13, 'Loading Indicator', NULL, NULL, NULL, NULL, 1, 1, 13, NULL, NULL)
--end
INSERT INTO stm_task (tas_id, tas_name, tas_created, tas_order, tas_giid, tas_serid, tas_gtaskid, tas_ttaskid, tas_tuiid, tas_connid, tas_params) VALUES (14, 'Measure', NULL, NULL, NULL, NULL, 1, 1, 14, NULL, NULL)
--end
INSERT INTO stm_task (tas_id, tas_name, tas_created, tas_order, tas_giid, tas_serid, tas_gtaskid, tas_ttaskid, tas_tuiid, tas_connid, tas_params) VALUES (15, 'Multi Feature Info', NULL, NULL, NULL, NULL, 1, 1, 15, NULL, NULL)
--end
INSERT INTO stm_task (tas_id, tas_name, tas_created, tas_order, tas_giid, tas_serid, tas_gtaskid, tas_ttaskid, tas_tuiid, tas_connid, tas_params) VALUES (16, 'Navigation Bar', NULL, NULL, NULL, NULL, 1, 1, 16, NULL, NULL)
--end
INSERT INTO stm_task (tas_id, tas_name, tas_created, tas_order, tas_giid, tas_serid, tas_gtaskid, tas_ttaskid, tas_tuiid, tas_connid, tas_params) VALUES (17, 'Offline Map Maker', NULL, NULL, NULL, NULL, 1, 1, 17, NULL, NULL)
--end
INSERT INTO stm_task (tas_id, tas_name, tas_created, tas_order, tas_giid, tas_serid, tas_gtaskid, tas_ttaskid, tas_tuiid, tas_connid, tas_params) VALUES (18, 'Overview Map', NULL, NULL, NULL, NULL, 1, 1, 18, NULL, NULL)
--end
INSERT INTO stm_task (tas_id, tas_name, tas_created, tas_order, tas_giid, tas_serid, tas_gtaskid, tas_ttaskid, tas_tuiid, tas_connid, tas_params) VALUES (19, 'Popup', NULL, NULL, NULL, NULL, 1, 1, 19, NULL, NULL)
--end
INSERT INTO stm_task (tas_id, tas_name, tas_created, tas_order, tas_giid, tas_serid, tas_gtaskid, tas_ttaskid, tas_tuiid, tas_connid, tas_params) VALUES (20, 'Print Map', NULL, NULL, NULL, NULL, 1, 1, 20, NULL, NULL)
--end
INSERT INTO stm_task (tas_id, tas_name, tas_created, tas_order, tas_giid, tas_serid, tas_gtaskid, tas_ttaskid, tas_tuiid, tas_connid, tas_params) VALUES (21, 'Scale', NULL, NULL, NULL, NULL, 1, 1, 21, NULL, NULL)
--end
INSERT INTO stm_task (tas_id, tas_name, tas_created, tas_order, tas_giid, tas_serid, tas_gtaskid, tas_ttaskid, tas_tuiid, tas_connid, tas_params) VALUES (22, 'Scale Bar', NULL, NULL, NULL, NULL, 1, 1, 22, NULL, NULL)
--end
INSERT INTO stm_task (tas_id, tas_name, tas_created, tas_order, tas_giid, tas_serid, tas_gtaskid, tas_ttaskid, tas_tuiid, tas_connid, tas_params) VALUES (23, 'Scale Selector', NULL, NULL, NULL, NULL, 1, 1, 23, NULL, NULL)
--end
INSERT INTO stm_task (tas_id, tas_name, tas_created, tas_order, tas_giid, tas_serid, tas_gtaskid, tas_ttaskid, tas_tuiid, tas_connid, tas_params) VALUES (24, 'Search', NULL, NULL, NULL, NULL, 1, 1, 24, NULL, NULL)
--end
INSERT INTO stm_task (tas_id, tas_name, tas_created, tas_order, tas_giid, tas_serid, tas_gtaskid, tas_ttaskid, tas_tuiid, tas_connid, tas_params) VALUES (25, 'Share', NULL, NULL, NULL, NULL, 1, 1, 25, NULL, NULL)
--end
INSERT INTO stm_task (tas_id, tas_name, tas_created, tas_order, tas_giid, tas_serid, tas_gtaskid, tas_ttaskid, tas_tuiid, tas_connid, tas_params) VALUES (26, 'Street View', NULL, NULL, NULL, NULL, 1, 1, 26, NULL, NULL)
--end
INSERT INTO stm_task (tas_id, tas_name, tas_created, tas_order, tas_giid, tas_serid, tas_gtaskid, tas_ttaskid, tas_tuiid, tas_connid, tas_params) VALUES (27, '3D View', NULL, NULL, NULL, NULL, 1, 1, 27, NULL, NULL)
--end
INSERT INTO stm_task (tas_id, tas_name, tas_created, tas_order, tas_giid, tas_serid, tas_gtaskid, tas_ttaskid, tas_tuiid, tas_connid, tas_params) VALUES (28, 'WFSEdit', NULL, NULL, NULL, NULL, 1, 1, 28, NULL, NULL)
--end
INSERT INTO stm_task (tas_id, tas_name, tas_created, tas_order, tas_giid, tas_serid, tas_gtaskid, tas_ttaskid, tas_tuiid, tas_connid, tas_params) VALUES (29, 'WFS Query', NULL, NULL, NULL, NULL, 1, 1, 29, NULL, NULL)
--end
INSERT INTO stm_task (tas_id, tas_name, tas_created, tas_order, tas_giid, tas_serid, tas_gtaskid, tas_ttaskid, tas_tuiid, tas_connid, tas_params) VALUES (30, 'Work Layer Manager', NULL, NULL, NULL, NULL, 1, 1, 30, NULL, NULL)
--end
INSERT INTO stm_task (tas_id, tas_name, tas_created, tas_order, tas_giid, tas_serid, tas_gtaskid, tas_ttaskid, tas_tuiid, tas_connid, tas_params) VALUES (31, 'Exportar PDF A4 Vertical', NULL, NULL, NULL, NULL, 1, 17, NULL, NULL, '{"exportEngine":"openhtmltopdf","downloadFormat":"pdf","pageSize":"A4","pageOrientation":"portrait"}')
--end
INSERT INTO stm_task (tas_id, tas_name, tas_created, tas_order, tas_giid, tas_serid, tas_gtaskid, tas_ttaskid, tas_tuiid, tas_connid, tas_params) VALUES (32, 'Exportar PDF A3 Vertical', NULL, NULL, NULL, NULL, 1, 17, NULL, NULL, '{"exportEngine":"openhtmltopdf","downloadFormat":"pdf","pageSize":"A3","pageOrientation":"portrait"}')
--end
INSERT INTO stm_task (tas_id, tas_name, tas_created, tas_order, tas_giid, tas_serid, tas_gtaskid, tas_ttaskid, tas_tuiid, tas_connid, tas_params) VALUES (33, 'Exportar PDF A4 Horitzontal', NULL, NULL, NULL, NULL, 1, 17, NULL, NULL, '{"exportEngine":"openhtmltopdf","downloadFormat":"pdf","pageSize":"A4","pageOrientation":"landscape"}')
--end
INSERT INTO stm_task (tas_id, tas_name, tas_created, tas_order, tas_giid, tas_serid, tas_gtaskid, tas_ttaskid, tas_tuiid, tas_connid, tas_params) VALUES (34, 'Exportar PDF A3 Horitzontal', NULL, NULL, NULL, NULL, 1, 17, NULL, NULL, '{"exportEngine":"openhtmltopdf","downloadFormat":"pdf","pageSize":"A3","pageOrientation":"landscape"}')
--end
INSERT INTO stm_task (tas_id, tas_name, tas_created, tas_order, tas_giid, tas_serid, tas_gtaskid, tas_ttaskid, tas_tuiid, tas_connid, tas_params) VALUES (35, 'Capçalera per defecte', NULL, NULL, NULL, NULL, 1, 15, NULL, NULL, '{"parameters":[],"templateHtml":"<table class=\"sitmun-pdf-header-full-bleed\" style=\"width:100%;background-color:#FF9300;border-collapse:collapse\"><tbody><tr><td style=\"width:33%;text-align:left\"><img src=\"data:image/png;base64,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\" alt=\"SITMUN\" style=\"max-width:180px\"></td><td style=\"width:34%;text-align:center\">Capçalera per defecte</td><td style=\"width:33%;text-align:right\">{{currentDate}}</td></tr></tbody></table>"}')
--end
INSERT INTO stm_task (tas_id, tas_name, tas_created, tas_order, tas_giid, tas_serid, tas_gtaskid, tas_ttaskid, tas_tuiid, tas_connid, tas_params) VALUES (36, 'Peu de pàgina per defecte', NULL, NULL, NULL, NULL, 1, 15, NULL, NULL, '{"parameters":[],"templateHtml":"<table class=\"sitmun-pdf-footer-full-bleed\" style=\"width:100%;border-collapse:collapse\"><tbody><tr><td style=\"width:25%;text-align:left\">&nbsp;</td><td style=\"width:50%;text-align:center\">Peu de pàgina per defecte</td><td style=\"width:25%;text-align:right;padding-right:8mm\"><p class=\"sitmun-pdf-page-number\">&nbsp;</p></td></tr></tbody></table>"}')
--end
INSERT INTO stm_task (tas_id, tas_name, tas_created, tas_order, tas_giid, tas_serid, tas_gtaskid, tas_ttaskid, tas_tuiid, tas_connid, tas_params) VALUES (37, 'More Info Advanced', TIMESTAMP '2026-05-04 18:38:16', NULL, NULL, NULL, 1, 1, 34, NULL, '{"parameters":[]}')
--end
INSERT INTO stm_conf (cnf_id, cnf_name, cnf_value) VALUES (1, 'language.default', 'en')
--end
INSERT INTO stm_conf (cnf_id, cnf_name, cnf_value) VALUES (2, 'srs.default.identifier', 'EPSG:25831')
--end
INSERT INTO stm_conf (cnf_id, cnf_name, cnf_value) VALUES (3, 'srs.default.x', 'x')
--end
INSERT INTO stm_conf (cnf_id, cnf_name, cnf_value) VALUES (4, 'srs.default.y', 'y')
--end
INSERT INTO stm_conf (cnf_id, cnf_name, cnf_value) VALUES (5, 'srs.default.proj4', '+proj=utm +zone=31 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs')
--end
INSERT INTO stm_conf (cnf_id, cnf_name, cnf_value) VALUES (6, 'setup.languageConfigured', 'false')
--end
INSERT INTO stm_literal_translation (ltr_id, ltr_literal, ltr_lanid) SELECT 1, 'No data', lang.lan_id FROM stm_language lang WHERE lang.lan_shortname = 'en'
--end
INSERT INTO stm_literal_translation (ltr_id, ltr_literal, ltr_lanid) SELECT 2, 'Error executing task', lang.lan_id FROM stm_language lang WHERE lang.lan_shortname = 'en'
--end
INSERT INTO stm_literal_translation (ltr_id, ltr_literal, ltr_lanid) SELECT 3, 'Query', lang.lan_id FROM stm_language lang WHERE lang.lan_shortname = 'en'
--end
INSERT INTO stm_literal_translation (ltr_id, ltr_literal, ltr_lanid) SELECT 4, 'Invalid child task id', lang.lan_id FROM stm_language lang WHERE lang.lan_shortname = 'en'
--end
INSERT INTO stm_literal_translation (ltr_id, ltr_literal, ltr_lanid) SELECT 5, 'task not executed', lang.lan_id FROM stm_language lang WHERE lang.lan_shortname = 'en'
--end
INSERT INTO stm_literal_translation (ltr_id, ltr_literal, ltr_lanid) SELECT 6, 'Binary content cannot be embedded: server authentication required', lang.lan_id FROM stm_language lang WHERE lang.lan_shortname = 'en'
--end
INSERT INTO stm_literal_translation (ltr_id, ltr_literal, ltr_lanid) SELECT 7, '[binary content]', lang.lan_id FROM stm_language lang WHERE lang.lan_shortname = 'en'
--end
INSERT INTO stm_literal_translation_value (ltv_id, ltv_ltrid, ltv_lanid, ltv_value) SELECT 1, 1, lang.lan_id, 'Sense dades' FROM stm_language lang WHERE lang.lan_shortname = 'ca'
--end
INSERT INTO stm_literal_translation_value (ltv_id, ltv_ltrid, ltv_lanid, ltv_value) SELECT 2, 1, lang.lan_id, 'Sin datos' FROM stm_language lang WHERE lang.lan_shortname = 'es'
--end
INSERT INTO stm_literal_translation_value (ltv_id, ltv_ltrid, ltv_lanid, ltv_value) SELECT 3, 1, lang.lan_id, 'No data' FROM stm_language lang WHERE lang.lan_shortname = 'en'
--end
INSERT INTO stm_literal_translation_value (ltv_id, ltv_ltrid, ltv_lanid, ltv_value) SELECT 4, 1, lang.lan_id, 'Aucune donnee' FROM stm_language lang WHERE lang.lan_shortname = 'fr'
--end
INSERT INTO stm_literal_translation_value (ltv_id, ltv_ltrid, ltv_lanid, ltv_value) SELECT 5, 2, lang.lan_id, 'Error executant la tasca' FROM stm_language lang WHERE lang.lan_shortname = 'ca'
--end
INSERT INTO stm_literal_translation_value (ltv_id, ltv_ltrid, ltv_lanid, ltv_value) SELECT 6, 2, lang.lan_id, 'Error ejecutando tarea' FROM stm_language lang WHERE lang.lan_shortname = 'es'
--end
INSERT INTO stm_literal_translation_value (ltv_id, ltv_ltrid, ltv_lanid, ltv_value) SELECT 7, 2, lang.lan_id, 'Error executing task' FROM stm_language lang WHERE lang.lan_shortname = 'en'
--end
INSERT INTO stm_literal_translation_value (ltv_id, ltv_ltrid, ltv_lanid, ltv_value) SELECT 8, 2, lang.lan_id, 'Erreur d execution de la tache' FROM stm_language lang WHERE lang.lan_shortname = 'fr'
--end
INSERT INTO stm_literal_translation_value (ltv_id, ltv_ltrid, ltv_lanid, ltv_value) SELECT 9, 3, lang.lan_id, 'Consulta' FROM stm_language lang WHERE lang.lan_shortname = 'ca'
--end
INSERT INTO stm_literal_translation_value (ltv_id, ltv_ltrid, ltv_lanid, ltv_value) SELECT 10, 3, lang.lan_id, 'Consulta' FROM stm_language lang WHERE lang.lan_shortname = 'es'
--end
INSERT INTO stm_literal_translation_value (ltv_id, ltv_ltrid, ltv_lanid, ltv_value) SELECT 11, 3, lang.lan_id, 'Query' FROM stm_language lang WHERE lang.lan_shortname = 'en'
--end
INSERT INTO stm_literal_translation_value (ltv_id, ltv_ltrid, ltv_lanid, ltv_value) SELECT 12, 3, lang.lan_id, 'Requete' FROM stm_language lang WHERE lang.lan_shortname = 'fr'
--end
INSERT INTO stm_literal_translation_value (ltv_id, ltv_ltrid, ltv_lanid, ltv_value) SELECT 13, 4, lang.lan_id, 'Identificador de tasca fill no valid' FROM stm_language lang WHERE lang.lan_shortname = 'ca'
--end
INSERT INTO stm_literal_translation_value (ltv_id, ltv_ltrid, ltv_lanid, ltv_value) SELECT 14, 4, lang.lan_id, 'Id de tarea hija no valido' FROM stm_language lang WHERE lang.lan_shortname = 'es'
--end
INSERT INTO stm_literal_translation_value (ltv_id, ltv_ltrid, ltv_lanid, ltv_value) SELECT 15, 4, lang.lan_id, 'Invalid child task id' FROM stm_language lang WHERE lang.lan_shortname = 'en'
--end
INSERT INTO stm_literal_translation_value (ltv_id, ltv_ltrid, ltv_lanid, ltv_value) SELECT 16, 4, lang.lan_id, 'Identifiant de tache enfant invalide' FROM stm_language lang WHERE lang.lan_shortname = 'fr'
--end
INSERT INTO stm_literal_translation_value (ltv_id, ltv_ltrid, ltv_lanid, ltv_value) SELECT 17, 5, lang.lan_id, 'cal executar la tasca' FROM stm_language lang WHERE lang.lan_shortname = 'ca'
--end
INSERT INTO stm_literal_translation_value (ltv_id, ltv_ltrid, ltv_lanid, ltv_value) SELECT 18, 5, lang.lan_id, 'falta ejecutar tarea' FROM stm_language lang WHERE lang.lan_shortname = 'es'
--end
INSERT INTO stm_literal_translation_value (ltv_id, ltv_ltrid, ltv_lanid, ltv_value) SELECT 19, 5, lang.lan_id, 'task not executed' FROM stm_language lang WHERE lang.lan_shortname = 'en'
--end
INSERT INTO stm_literal_translation_value (ltv_id, ltv_ltrid, ltv_lanid, ltv_value) SELECT 20, 5, lang.lan_id, 'tache non executee' FROM stm_language lang WHERE lang.lan_shortname = 'fr'
--end
INSERT INTO stm_literal_translation_value (ltv_id, ltv_ltrid, ltv_lanid, ltv_value) SELECT 21, 6, lang.lan_id, 'Contingut binari no incrustable: cal autenticacio de servidor' FROM stm_language lang WHERE lang.lan_shortname = 'ca'
--end
INSERT INTO stm_literal_translation_value (ltv_id, ltv_ltrid, ltv_lanid, ltv_value) SELECT 22, 6, lang.lan_id, 'Contenido binario no embebible: requiere autenticacion de servidor' FROM stm_language lang WHERE lang.lan_shortname = 'es'
--end
INSERT INTO stm_literal_translation_value (ltv_id, ltv_ltrid, ltv_lanid, ltv_value) SELECT 23, 6, lang.lan_id, 'Binary content cannot be embedded: server authentication required' FROM stm_language lang WHERE lang.lan_shortname = 'en'
--end
INSERT INTO stm_literal_translation_value (ltv_id, ltv_ltrid, ltv_lanid, ltv_value) SELECT 24, 6, lang.lan_id, 'Contenu binaire non integrable: authentification serveur requise' FROM stm_language lang WHERE lang.lan_shortname = 'fr'
--end
INSERT INTO stm_literal_translation_value (ltv_id, ltv_ltrid, ltv_lanid, ltv_value) SELECT 25, 7, lang.lan_id, '[contingut binari]' FROM stm_language lang WHERE lang.lan_shortname = 'ca'
--end
INSERT INTO stm_literal_translation_value (ltv_id, ltv_ltrid, ltv_lanid, ltv_value) SELECT 26, 7, lang.lan_id, '[contenido binario]' FROM stm_language lang WHERE lang.lan_shortname = 'es'
--end
INSERT INTO stm_literal_translation_value (ltv_id, ltv_ltrid, ltv_lanid, ltv_value) SELECT 27, 7, lang.lan_id, '[binary content]' FROM stm_language lang WHERE lang.lan_shortname = 'en'
--end
INSERT INTO stm_literal_translation_value (ltv_id, ltv_ltrid, ltv_lanid, ltv_value) SELECT 28, 7, lang.lan_id, '[contenu binaire]' FROM stm_language lang WHERE lang.lan_shortname = 'fr'
--end
INSERT INTO stm_literal_translation_value (ltv_id, ltv_ltrid, ltv_lanid, ltv_value) SELECT 29, 1, lang.lan_id, 'Cap de donades' FROM stm_language lang WHERE lang.lan_shortname = 'oc-aranes'
--end
INSERT INTO stm_literal_translation_value (ltv_id, ltv_ltrid, ltv_lanid, ltv_value) SELECT 30, 2, lang.lan_id, 'Error en executar era tasca' FROM stm_language lang WHERE lang.lan_shortname = 'oc-aranes'
--end
INSERT INTO stm_literal_translation_value (ltv_id, ltv_ltrid, ltv_lanid, ltv_value) SELECT 31, 3, lang.lan_id, 'Consulta' FROM stm_language lang WHERE lang.lan_shortname = 'oc-aranes'
--end
INSERT INTO stm_literal_translation_value (ltv_id, ltv_ltrid, ltv_lanid, ltv_value) SELECT 32, 4, lang.lan_id, 'Identificador de tasca hilha non valid' FROM stm_language lang WHERE lang.lan_shortname = 'oc-aranes'
--end
INSERT INTO stm_literal_translation_value (ltv_id, ltv_ltrid, ltv_lanid, ltv_value) SELECT 33, 5, lang.lan_id, 'Cau executar era tasca' FROM stm_language lang WHERE lang.lan_shortname = 'oc-aranes'
--end
INSERT INTO stm_literal_translation_value (ltv_id, ltv_ltrid, ltv_lanid, ltv_value) SELECT 34, 6, lang.lan_id, 'Contengut binari non incrustable: cau autenticacion deth servidor' FROM stm_language lang WHERE lang.lan_shortname = 'oc-aranes'
--end
INSERT INTO stm_literal_translation_value (ltv_id, ltv_ltrid, ltv_lanid, ltv_value) SELECT 35, 7, lang.lan_id, '[contengut binari]' FROM stm_language lang WHERE lang.lan_shortname = 'oc-aranes'
--end
