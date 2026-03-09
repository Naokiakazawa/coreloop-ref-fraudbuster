export function isSwaggerPubliclyAccessible(): boolean {
	return process.env.NODE_ENV !== "production";
}

export function createSwaggerUnavailableResponse(): Response {
	return new Response("Not Found", {
		status: 404,
		headers: {
			"Cache-Control": "no-store",
		},
	});
}
