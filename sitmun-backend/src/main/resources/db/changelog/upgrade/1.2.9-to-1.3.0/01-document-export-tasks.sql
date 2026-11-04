UPDATE stm_task
SET tas_gtaskid = CASE WHEN tas_gtaskid IS NULL THEN 1 ELSE tas_gtaskid END,
    tas_tuiid = CASE WHEN tas_tuiid = 1 THEN NULL ELSE tas_tuiid END
WHERE tas_ttaskid = 17
  AND tas_name IN (
    'Exportar PDF A4 Vertical',
    'Exportar PDF A3 Vertical',
    'Exportar PDF A4 Horitzontal',
    'Exportar PDF A3 Horitzontal')
  AND (tas_gtaskid IS NULL OR tas_tuiid = 1);
