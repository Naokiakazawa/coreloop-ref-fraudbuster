BEGIN;

-- Drop FK constraints first because reports.id type is changing from UUID to VARCHAR.
ALTER TABLE report_images
	DROP CONSTRAINT IF EXISTS report_images_report_id_fkey;
ALTER TABLE report_timelines
	DROP CONSTRAINT IF EXISTS report_timelines_report_id_fkey;

-- Keep existing IDs by casting UUID values to text.
ALTER TABLE reports
	ALTER COLUMN id TYPE VARCHAR(64) USING id::text,
	ALTER COLUMN id DROP DEFAULT;
ALTER TABLE report_images
	ALTER COLUMN report_id TYPE VARCHAR(64) USING report_id::text;
ALTER TABLE report_timelines
	ALTER COLUMN report_id TYPE VARCHAR(64) USING report_id::text;

-- Restore FK constraints after type change.
ALTER TABLE report_images
	ADD CONSTRAINT report_images_report_id_fkey
	FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE;
ALTER TABLE report_timelines
	ADD CONSTRAINT report_timelines_report_id_fkey
	FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE;

COMMIT;
