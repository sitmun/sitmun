# SITMUN seed data

`baseline/` is what every 1.3.0 database needs. Edit a translation by list, value, and language in `baseline/translations.csv`. The database default language is `language.default` in `baseline/configuration.csv`. A code-value label in that language is the `cod_description` in `baseline/codelists.csv` and is not stored again in `translations.csv`. Template sentences are `baseline/literal_translations.csv`. Their text per language is `baseline/literal_translation_values.csv`. An upgrade inserts a missing value and does not change one that is already there.

`upgrade/<from>-to-<to>/` holds facts about one hop that a fresh install never needs. `upgrade/1.2.9-to-1.3.0/codelists-promoted.csv` lists the code values that become system on that hop. `upgrade/1.2.9-to-1.3.0/translations-en-repair.csv` lists the English labels that hop corrects.

Regenerate the shipped SQL after a CSV edit:

```bash
python3 tools/bin/generate_baseline_seed.py
python3 tools/bin/generate_legacy_upgrade.py
```

`check_translations.py` lists code values, tasks, territory types, and task groups that have no row for a language other than the default. It also lists a template sentence that has no value for a language in `languages.csv`. It reports those gaps and exits 0.
