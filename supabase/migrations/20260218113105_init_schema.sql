-- =============================================
-- 1. マスタデータ (Master Data / Lookups)
-- =============================================

-- 詐欺カテゴリ（例：投資詐欺、フィッシング、出会い系）
CREATE TABLE fraud_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    color_code VARCHAR(7) DEFAULT '#CCCCCC', -- UI表示用カラー
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
);

-- プラットフォーム（例：Facebook, LINE, Instagram）
CREATE TABLE platforms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    icon_url VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE
);

-- 案件ステータス（例：調査中、高リスク、詐欺確定、安全）
CREATE TABLE report_statuses (
    id SERIAL PRIMARY KEY,
    status_code VARCHAR(20) UNIQUE NOT NULL, -- システム識別用 (例: PENDING, CONFIRMED)
    label VARCHAR(50) NOT NULL, -- 表示用 (例: 詐欺確定)
    badge_color VARCHAR(20) DEFAULT 'gray' -- フロントエンド用スタイル
);

-- =============================================
-- 2. ユーザー・管理者 (Users & Admins)
-- =============================================

-- 一般ユーザー（通報者）
-- 連絡先メールアドレスを保持。プライバシー保護のため最小限の情報のみ保持。
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMPTZ
);

-- 管理者
CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100),
    role VARCHAR(20) DEFAULT 'MODERATOR', -- SUPER_ADMIN, MODERATOR
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 3. 通報・案件データ (Reports & Cases)
-- =============================================

-- 通報案件メインテーブル
CREATE TABLE reports (
    id VARCHAR(64) PRIMARY KEY, -- nanoid をアプリケーション側で生成
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- 通報者
    
    -- 案件基本情報
    url TEXT NOT NULL, -- 疑わしいURL（通報フォーム必須）
    title VARCHAR(255), -- 自動取得またはユーザー入力のタイトル
    description TEXT, -- 詳細説明
    
    -- 分類・状態
    platform_id INT REFERENCES platforms(id),
    category_id INT REFERENCES fraud_categories(id),
    status_id INT REFERENCES report_statuses(id),
    
    -- 統計・指標
    risk_score INT DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100), -- 0-100のリスクスコア
    view_count INT DEFAULT 0 CHECK (view_count >= 0), -- 閲覧数
    report_count INT DEFAULT 1 CHECK (report_count >= 1), -- 同じURLに対する通報数（集約用）
    
    -- メタデータ
    source_ip INET, -- スパム対策用
    privacy_policy_agreed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, -- 規約同意日時
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 案件に関連する画像（証拠スクショなど）
CREATE TABLE report_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id VARCHAR(64) NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 案件の進捗タイムライン（詳細画面の時系列表示用）
-- 例：「通報受付」→「分析中」→「Facebookへ通報済」
CREATE TABLE report_timelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id VARCHAR(64) NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    action_label VARCHAR(100) NOT NULL, -- 例: "プラットフォームへ通知"
    description TEXT, -- 詳細
    created_by UUID REFERENCES admins(id), -- 操作した管理者（システム自動の場合はNULL）
    occurred_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP -- 実際の発生日時
);

-- =============================================
-- 4. コンテンツ・お知らせ (CMS)
-- =============================================

-- 告知・ニュース
CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL, -- HTMLまたはMarkdown
    thumbnail_url VARCHAR(255),
    is_important BOOLEAN DEFAULT FALSE, -- 「重要」フラグ
    is_published BOOLEAN DEFAULT FALSE, -- 公開/非公開設定
    published_at TIMESTAMPTZ, -- 公開日時（公開時に設定）
    created_by UUID REFERENCES admins(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 告知に紐づくタグ（例：#重要情報 #システムメンテ）
CREATE TABLE announcement_tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE announcement_tag_relations (
    announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE,
    tag_id INT REFERENCES announcement_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (announcement_id, tag_id)
);

-- トップページ等の緊急告知バナー
CREATE TABLE banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link_url TEXT,
    bg_color VARCHAR(20) DEFAULT '#FFF3CD',
    text_color VARCHAR(20) DEFAULT '#664D03',
    is_active BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    created_by UUID REFERENCES admins(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 5. 統計・集計 (Statistics)
-- =============================================

-- 日次統計（ダッシュボード表示の高速化用）
-- 夜間バッチなどで計算して格納することを想定
CREATE TABLE daily_statistics (
    date DATE PRIMARY KEY,
    total_reports INT DEFAULT 0,
    high_risk_count INT DEFAULT 0,
    confirmed_fraud_count INT DEFAULT 0,
    platform_stats JSONB NOT NULL DEFAULT '{}'::jsonb, -- プラットフォーム別の内訳をJSONで保存 {"line": 10, "fb": 5}
    category_stats JSONB NOT NULL DEFAULT '{}'::jsonb, -- カテゴリ別の内訳をJSONで保存
    status_stats JSONB NOT NULL DEFAULT '{}'::jsonb, -- ステータス別の内訳をJSONで保存
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 6. インデックス (Indexes)
-- =============================================

-- 検索パフォーマンス向上のためのインデックス
CREATE INDEX idx_reports_url ON reports(url); -- URL完全一致検索用
CREATE INDEX idx_reports_created_at ON reports(created_at DESC); -- 「近期」表示用
CREATE INDEX idx_reports_view_count ON reports(view_count DESC); -- 「熱門」表示用
CREATE INDEX idx_reports_platform ON reports(platform_id); -- プラットフォームフィルタ用
CREATE INDEX idx_reports_category ON reports(category_id); -- カテゴリフィルタ用
CREATE INDEX idx_reports_status ON reports(status_id); -- ステータスフィルタ用
CREATE INDEX idx_report_timelines_report_occurred ON report_timelines(report_id, occurred_at DESC); -- タイムライン時系列表示用
CREATE INDEX idx_announcements_published ON announcements(is_published, published_at DESC); -- 公開記事一覧用
CREATE INDEX idx_banners_active_period ON banners(is_active, starts_at, ends_at, display_order); -- 掲載中バナー取得用

-- 全文検索用（タイトルと詳細） - 日本語/中国語対応の場合はpg_trgm等の検討が必要
CREATE INDEX idx_reports_search ON reports USING GIN (to_tsvector('english', title || ' ' || coalesce(description, '')));

-- =============================================
-- 7. コメント (Documentation)
-- =============================================

COMMENT ON TABLE reports IS '通報された詐欺案件のメインテーブル';
COMMENT ON COLUMN reports.report_count IS '同一URLに対する重複通報をカウントする（正規化せずにまとめる場合）';
COMMENT ON TABLE report_timelines IS '案件ごとの処理履歴。詳細画面のタイムラインに使用';
COMMENT ON COLUMN daily_statistics.status_stats IS 'ステータス別件数のJSON集計。統計ダッシュボードの高速表示に使用';
