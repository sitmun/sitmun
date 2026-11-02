-- Trees loaded before TRE_TYPE existed have an empty type. A tree with a layer and no task is a cartography tree.
UPDATE stm_tree
SET tre_type = 'cartography'
WHERE (tre_type IS NULL OR TRIM(tre_type) = '')
  AND EXISTS (
    SELECT 1 FROM stm_tree_nod n
    WHERE n.tno_treeid = stm_tree.tre_id
      AND n.tno_giid IS NOT NULL
  )
  AND NOT EXISTS (
    SELECT 1 FROM stm_tree_nod n
    WHERE n.tno_treeid = stm_tree.tre_id
      AND n.tno_taskid IS NOT NULL
  );

-- A layer node is cartography. A node with neither a layer nor a task is a folder. A type already set is left as it is.
UPDATE stm_tree_nod
SET tno_type = 'cartography'
WHERE (tno_type IS NULL OR TRIM(tno_type) = '')
  AND tno_giid IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM stm_tree t
    WHERE t.tre_id = stm_tree_nod.tno_treeid
      AND t.tre_type IN ('cartography', 'edition')
  );

UPDATE stm_tree_nod
SET tno_type = 'folder'
WHERE (tno_type IS NULL OR TRIM(tno_type) = '')
  AND tno_giid IS NULL
  AND tno_taskid IS NULL
  AND EXISTS (
    SELECT 1 FROM stm_tree t
    WHERE t.tre_id = stm_tree_nod.tno_treeid
      AND t.tre_type IN ('cartography', 'edition')
  );
