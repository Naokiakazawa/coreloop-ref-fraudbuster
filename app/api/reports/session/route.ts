import { customAlphabet } from "nanoid";
import {
	createReportSessionToken,
	getClientIp,
	successResponse,
} from "@/lib/api-utils";
import { checkAndRecordSessionTokenRateLimit } from "@/lib/upload-abuse-guard";

// 読みやすく、かつ衝突しにくいIDを生成
const nanoid = customAlphabet("6789BCDFGHJKLMNPQRSTVWXYZ", 12);

export async function POST(request: Request) {
	const clientIp = getClientIp(request);
	const userAgent = request.headers.get("user-agent")?.trim() || "unknown";
	const rateLimitKey = clientIp
		? `ip:${clientIp}`
		: `ua:${userAgent.slice(0, 160).toLowerCase()}`;
	const rateLimit = checkAndRecordSessionTokenRateLimit(rateLimitKey);

	if (!rateLimit.allowed) {
		return Response.json(
			{
				error:
					"セッション発行のリクエストが多すぎます。時間を空けて再試行してください。",
			},
			{
				status: 429,
				headers: {
					"Retry-After": String(rateLimit.retryAfterSeconds ?? 60),
				},
			},
		);
	}

	const sessionId = nanoid();
	const token = createReportSessionToken(sessionId);

	return successResponse({
		token,
		sessionId, // フロントエンドでの表示やデバッグ用（検証は署名付きtokenで行う）
	});
}
