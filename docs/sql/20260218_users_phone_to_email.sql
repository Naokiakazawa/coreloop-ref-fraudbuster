BEGIN;

-- 1) Add the new email column.
ALTER TABLE users
	ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- 2) Backfill placeholder addresses for legacy rows.
-- Replace these values with real addresses if user contact is required.
UPDATE users
SET email = CONCAT('legacy-', id::text, '@migrated.local')
WHERE email IS NULL OR email = '';

-- 3) Enforce the new constraints.
ALTER TABLE users
	ALTER COLUMN email SET NOT NULL;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'users_email_key'
	) THEN
		ALTER TABLE users
			ADD CONSTRAINT users_email_key UNIQUE (email);
	END IF;
END $$;

-- 4) Drop old phone/SMS columns.
ALTER TABLE users
	DROP COLUMN IF EXISTS phone_hash,
	DROP COLUMN IF EXISTS phone_verified_at;

COMMIT;
