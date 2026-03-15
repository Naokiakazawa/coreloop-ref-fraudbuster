DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_type
		WHERE typname = 'ReportVerdict'
	) THEN
		CREATE TYPE "ReportVerdict" AS ENUM (
			'CONFIRMED_FRAUD',
			'HIGH_RISK',
			'SAFE',
			'UNKNOWN'
		);
	END IF;
END $$;

ALTER TABLE reports
	ADD COLUMN IF NOT EXISTS verdict "ReportVerdict",
	ADD COLUMN IF NOT EXISTS labels TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE report_statuses
SET status_code = 'INVESTIGATING',
	label = '調査中',
	badge_color = 'blue'
WHERE status_code = 'UNDER_REVIEW';

UPDATE report_statuses
SET label = '処理待ち',
	badge_color = 'gray'
WHERE status_code = 'PENDING';

INSERT INTO report_statuses (status_code, label, badge_color)
VALUES ('COMPLETED', '完了', 'emerald')
ON CONFLICT (status_code) DO UPDATE
SET label = EXCLUDED.label,
	badge_color = EXCLUDED.badge_color;

WITH completed_status AS (
	SELECT id
	FROM report_statuses
	WHERE status_code = 'COMPLETED'
)
UPDATE reports AS report
SET verdict = CASE status.status_code
		WHEN 'CONFIRMED_FRAUD' THEN 'CONFIRMED_FRAUD'::"ReportVerdict"
		WHEN 'HIGH_RISK' THEN 'HIGH_RISK'::"ReportVerdict"
		WHEN 'SAFE' THEN 'SAFE'::"ReportVerdict"
		WHEN 'INSUFFICIENT_INFO' THEN 'UNKNOWN'::"ReportVerdict"
		ELSE report.verdict
	END,
	status_id = (SELECT id FROM completed_status)
FROM report_statuses AS status
WHERE report.status_id = status.id
	AND status.status_code IN (
		'CONFIRMED_FRAUD',
		'HIGH_RISK',
		'SAFE',
		'INSUFFICIENT_INFO'
	);

UPDATE reports
SET status_id = (
	SELECT id
	FROM report_statuses
	WHERE status_code = 'PENDING'
)
WHERE status_id IS NULL;

DELETE FROM report_statuses
WHERE status_code IN (
	'CONFIRMED_FRAUD',
	'HIGH_RISK',
	'SAFE',
	'INSUFFICIENT_INFO'
);
