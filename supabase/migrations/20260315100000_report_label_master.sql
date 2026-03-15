CREATE TABLE IF NOT EXISTS report_labels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS report_label_relations (
    report_id VARCHAR(64) NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    label_id INT NOT NULL REFERENCES report_labels(id) ON DELETE CASCADE,
    PRIMARY KEY (report_id, label_id)
);

INSERT INTO report_labels (name) VALUES
    ('なりすまし'),
    ('美容系'),
    ('投資系'),
    ('オンラインカジノ')
ON CONFLICT (name) DO NOTHING;

WITH expanded_labels AS (
    SELECT
        report.id AS report_id,
        trim(label_name) AS label_name
    FROM reports AS report,
    unnest(COALESCE(report.labels, ARRAY[]::TEXT[])) AS label_name
    WHERE trim(label_name) <> ''
)
INSERT INTO report_labels (name)
SELECT DISTINCT label_name
FROM expanded_labels
ON CONFLICT (name) DO NOTHING;

WITH expanded_labels AS (
    SELECT
        report.id AS report_id,
        trim(label_name) AS label_name
    FROM reports AS report,
    unnest(COALESCE(report.labels, ARRAY[]::TEXT[])) AS label_name
    WHERE trim(label_name) <> ''
)
INSERT INTO report_label_relations (report_id, label_id)
SELECT
    expanded_labels.report_id,
    report_labels.id
FROM expanded_labels
INNER JOIN report_labels
    ON report_labels.name = expanded_labels.label_name
ON CONFLICT (report_id, label_id) DO NOTHING;

ALTER TABLE reports
    DROP COLUMN IF EXISTS labels;
