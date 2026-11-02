# SITMUN seed data

`baseline/*.csv` is the source for the shipped seed. Edit a translation by list, value, and language in `baseline/translations.csv`. The database default language is `language.default` in `baseline/configuration.csv`. A code-value label in that language is the `cod_description` in `baseline/codelists.csv` and is not stored again in `translations.csv`.

Regenerate the shipped SQL after a CSV edit:

```bash
python3 tools/bin/generate_baseline_seed.py
python3 tools/bin/generate_legacy_upgrade.py
```

`check_translations.py` lists code values, tasks, territory types, and task groups that have no row for a language other than the default. It reports those gaps and exits 0.
