type RequestRateLimitResult = {
	allowed: boolean;
	retryAfterSeconds?: number;
};

type SessionUploadBudgetResult = {
	allowed: boolean;
	message?: string;
};

type SessionUploadUsage = {
	uploadRequestCount: number;
	uploadedFileCount: number;
	uploadedTotalBytes: number;
	updatedAt: number;
};

const SESSION_TOKEN_WINDOW_MS = 10 * 60 * 1000;
const SESSION_TOKEN_MAX_REQUESTS = 20;
const SESSION_TOKEN_MIN_INTERVAL_MS = 500;

const IMAGE_UPLOAD_WINDOW_MS = 10 * 60 * 1000;
const IMAGE_UPLOAD_MAX_REQUESTS = 12;
const IMAGE_UPLOAD_MIN_INTERVAL_MS = 1_500;

const SESSION_UPLOAD_USAGE_TTL_MS = 24 * 60 * 60 * 1000;
const SESSION_UPLOAD_MAX_REQUESTS = 10;
const SESSION_UPLOAD_MAX_FILES = 15;
const SESSION_UPLOAD_MAX_TOTAL_BYTES = 50 * 1024 * 1024;

const sessionTokenRateLimitStore = new Map<string, number[]>();
const imageUploadRateLimitStore = new Map<string, number[]>();
const sessionUploadUsageStore = new Map<string, SessionUploadUsage>();

function maybeCleanupRateLimitStore(
	store: Map<string, number[]>,
	windowMs: number,
	now: number,
) {
	if (store.size < 200 || Math.random() > 0.02) return;
	for (const [key, timestamps] of store.entries()) {
		const active = timestamps.filter((timestamp) => now - timestamp < windowMs);
		if (active.length === 0) {
			store.delete(key);
			continue;
		}
		store.set(key, active);
	}
}

function checkAndRecordRateLimit(
	store: Map<string, number[]>,
	key: string,
	{
		windowMs,
		maxRequests,
		minIntervalMs,
	}: {
		windowMs: number;
		maxRequests: number;
		minIntervalMs: number;
	},
): RequestRateLimitResult {
	const now = Date.now();
	maybeCleanupRateLimitStore(store, windowMs, now);

	const timestamps = (store.get(key) ?? []).filter(
		(timestamp) => now - timestamp < windowMs,
	);
	const lastRequestAt = timestamps[timestamps.length - 1];

	if (lastRequestAt && now - lastRequestAt < minIntervalMs) {
		return {
			allowed: false,
			retryAfterSeconds: Math.ceil(
				(minIntervalMs - (now - lastRequestAt)) / 1000,
			),
		};
	}

	if (timestamps.length >= maxRequests) {
		const oldest = timestamps[0];
		return {
			allowed: false,
			retryAfterSeconds: oldest
				? Math.ceil((windowMs - (now - oldest)) / 1000)
				: 60,
		};
	}

	timestamps.push(now);
	store.set(key, timestamps);
	return { allowed: true };
}

function maybeCleanupSessionUploadUsageStore(now: number) {
	if (sessionUploadUsageStore.size < 200 || Math.random() > 0.02) return;
	for (const [sessionId, usage] of sessionUploadUsageStore.entries()) {
		if (now - usage.updatedAt > SESSION_UPLOAD_USAGE_TTL_MS) {
			sessionUploadUsageStore.delete(sessionId);
		}
	}
}

function getSessionUploadUsage(sessionId: string): SessionUploadUsage {
	const now = Date.now();
	maybeCleanupSessionUploadUsageStore(now);

	const usage = sessionUploadUsageStore.get(sessionId);
	if (!usage) {
		return {
			uploadRequestCount: 0,
			uploadedFileCount: 0,
			uploadedTotalBytes: 0,
			updatedAt: now,
		};
	}

	if (now - usage.updatedAt > SESSION_UPLOAD_USAGE_TTL_MS) {
		sessionUploadUsageStore.delete(sessionId);
		return {
			uploadRequestCount: 0,
			uploadedFileCount: 0,
			uploadedTotalBytes: 0,
			updatedAt: now,
		};
	}

	return usage;
}

export function checkAndRecordSessionTokenRateLimit(
	key: string,
): RequestRateLimitResult {
	return checkAndRecordRateLimit(sessionTokenRateLimitStore, key, {
		windowMs: SESSION_TOKEN_WINDOW_MS,
		maxRequests: SESSION_TOKEN_MAX_REQUESTS,
		minIntervalMs: SESSION_TOKEN_MIN_INTERVAL_MS,
	});
}

export function checkAndRecordImageUploadRateLimit(
	key: string,
): RequestRateLimitResult {
	return checkAndRecordRateLimit(imageUploadRateLimitStore, key, {
		windowMs: IMAGE_UPLOAD_WINDOW_MS,
		maxRequests: IMAGE_UPLOAD_MAX_REQUESTS,
		minIntervalMs: IMAGE_UPLOAD_MIN_INTERVAL_MS,
	});
}

export function checkSessionUploadBudget(
	sessionId: string,
	{
		incomingFileCount,
		incomingTotalBytes,
	}: {
		incomingFileCount: number;
		incomingTotalBytes: number;
	},
): SessionUploadBudgetResult {
	const usage = getSessionUploadUsage(sessionId);

	if (usage.uploadRequestCount + 1 > SESSION_UPLOAD_MAX_REQUESTS) {
		return {
			allowed: false,
			message:
				"このセッションでの画像アップロード回数が上限に達しました。フォームを再読み込みして再試行してください。",
		};
	}
	if (usage.uploadedFileCount + incomingFileCount > SESSION_UPLOAD_MAX_FILES) {
		return {
			allowed: false,
			message:
				"このセッションで添付できる画像枚数の上限に達しました。フォームを再読み込みして再試行してください。",
		};
	}
	if (
		usage.uploadedTotalBytes + incomingTotalBytes >
		SESSION_UPLOAD_MAX_TOTAL_BYTES
	) {
		return {
			allowed: false,
			message:
				"このセッションでアップロードできる画像容量の上限に達しました。フォームを再読み込みして再試行してください。",
		};
	}

	return { allowed: true };
}

export function recordSessionUploadSuccess(
	sessionId: string,
	{
		uploadedFileCount,
		uploadedTotalBytes,
	}: {
		uploadedFileCount: number;
		uploadedTotalBytes: number;
	},
) {
	const usage = getSessionUploadUsage(sessionId);
	sessionUploadUsageStore.set(sessionId, {
		uploadRequestCount: usage.uploadRequestCount + 1,
		uploadedFileCount: usage.uploadedFileCount + uploadedFileCount,
		uploadedTotalBytes: usage.uploadedTotalBytes + uploadedTotalBytes,
		updatedAt: Date.now(),
	});
}
