-- Export task-owned language data before destructive rollback; baseline tables are never cascaded.
BEGIN;
DROP TABLE language_feedback_events,language_lexicon_versions,language_contributions,shared_language_lexicon,personal_language_mappings,language_learning_settings;
DELETE FROM schema_migrations WHERE filename='20261114_16_adaptive_language.sql';
COMMIT;
