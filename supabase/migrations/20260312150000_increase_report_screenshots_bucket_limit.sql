-- report-screenshots バケットのファイルサイズ上限を 10MB に引き上げ
UPDATE storage.buckets
SET file_size_limit = 10485760
WHERE id = 'report-screenshots';
