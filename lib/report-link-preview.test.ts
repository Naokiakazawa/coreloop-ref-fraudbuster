import assert from "node:assert/strict";
import test from "node:test";

const { fetchReportLinkPreview } = await import(
	new URL("./report-link-preview.ts", import.meta.url).href
);

function createLookupHostname(records: Record<string, string[]>) {
	return async (hostname: string): Promise<string[]> => records[hostname] ?? [];
}

test("follows a safe redirect chain and extracts preview metadata", async () => {
	const fetchCalls: string[] = [];
	const fetchFn: typeof fetch = async (input, init) => {
		const url = String(input);
		fetchCalls.push(url);
		assert.equal(init?.redirect, "manual");

		if (url === "https://public.example/start") {
			return new Response(null, {
				status: 302,
				headers: { location: "/final" },
			});
		}

		if (url === "https://public.example/final") {
			return new Response(
				`<html><head><title>Safe Preview</title><meta property="og:image" content="/thumb.png" /></head></html>`,
				{
					status: 200,
					headers: { "content-type": "text/html; charset=utf-8" },
				},
			);
		}

		assert.fail(`unexpected fetch to ${url}`);
	};
	const preview = await fetchReportLinkPreview("https://public.example/start", {
		lookupHostname: createLookupHostname({
			"public.example": ["93.184.216.34"],
		}),
		fetchFn,
	});

	assert.deepEqual(preview, {
		title: "Safe Preview",
		thumbnailUrl: "https://public.example/thumb.png",
	});
	assert.deepEqual(fetchCalls, [
		"https://public.example/start",
		"https://public.example/final",
	]);
});

test("blocks redirects to an explicit private IP target", async () => {
	const fetchCalls: string[] = [];
	const fetchFn: typeof fetch = async (input) => {
		const url = String(input);
		fetchCalls.push(url);

		if (url === "https://public.example/start") {
			return new Response(null, {
				status: 302,
				headers: { location: "http://127.0.0.1/private" },
			});
		}

		assert.fail(`unexpected fetch to ${url}`);
	};
	const preview = await fetchReportLinkPreview("https://public.example/start", {
		lookupHostname: createLookupHostname({
			"public.example": ["93.184.216.34"],
		}),
		fetchFn,
	});

	assert.deepEqual(preview, {
		title: null,
		thumbnailUrl: null,
	});
	assert.deepEqual(fetchCalls, ["https://public.example/start"]);
});

test("blocks redirects when the next hostname resolves to a private address", async () => {
	const fetchCalls: string[] = [];
	const fetchFn: typeof fetch = async (input) => {
		const url = String(input);
		fetchCalls.push(url);

		if (url === "https://public.example/start") {
			return new Response(null, {
				status: 302,
				headers: { location: "https://redirected.example/private" },
			});
		}

		assert.fail(`unexpected fetch to ${url}`);
	};
	const preview = await fetchReportLinkPreview("https://public.example/start", {
		lookupHostname: createLookupHostname({
			"public.example": ["93.184.216.34"],
			"redirected.example": ["127.0.0.1"],
		}),
		fetchFn,
	});

	assert.deepEqual(preview, {
		title: null,
		thumbnailUrl: null,
	});
	assert.deepEqual(fetchCalls, ["https://public.example/start"]);
});

test("stops after exceeding the redirect hop limit", async () => {
	const fetchCalls: string[] = [];
	const fetchFn: typeof fetch = async (input) => {
		const url = String(input);
		fetchCalls.push(url);
		const hop = Number.parseInt(url.match(/hop-(\d+)$/)?.[1] ?? "", 10);
		assert.equal(Number.isNaN(hop), false);

		return new Response(null, {
			status: 302,
			headers: { location: `/hop-${hop + 1}` },
		});
	};
	const preview = await fetchReportLinkPreview("https://public.example/hop-0", {
		lookupHostname: createLookupHostname({
			"public.example": ["93.184.216.34"],
		}),
		fetchFn,
	});

	assert.deepEqual(preview, {
		title: null,
		thumbnailUrl: null,
	});
	assert.deepEqual(fetchCalls, [
		"https://public.example/hop-0",
		"https://public.example/hop-1",
		"https://public.example/hop-2",
		"https://public.example/hop-3",
		"https://public.example/hop-4",
	]);
});
