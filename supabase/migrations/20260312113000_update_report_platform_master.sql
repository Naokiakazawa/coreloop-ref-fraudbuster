BEGIN;

UPDATE platforms
SET name = 'Google検索'
WHERE name = 'Google';

UPDATE platforms
SET name = 'その他'
WHERE name = 'Meta Audience Network';

INSERT INTO platforms (name, icon_url, is_active)
SELECT 'YouTube', NULL, TRUE
WHERE NOT EXISTS (
	SELECT 1
	FROM platforms
	WHERE name = 'YouTube'
);

COMMIT;
