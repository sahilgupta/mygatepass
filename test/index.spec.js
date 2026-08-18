import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import worker, { TUNING } from '../src';

const DEFAULT_TUNING = { ...TUNING };

function jsonResponse(body, init = {}) {
	return new Response(JSON.stringify(body), {
		status: 200,
		headers: { 'content-type': 'application/json' },
		...init,
	});
}

/**
 * Replaces the global fetch with a handler and records every outbound call,
 * tracking how many were in flight at the same time.
 */
function stubFetch(handler) {
	const calls = [];
	let inFlight = 0;
	let maxInFlight = 0;

	vi.stubGlobal('fetch', async (url, options) => {
		const call = { url: String(url), body: JSON.parse(options.body) };
		calls.push(call);
		inFlight += 1;
		maxInFlight = Math.max(maxInFlight, inFlight);
		try {
			return await handler(call, calls.length);
		} finally {
			inFlight -= 1;
		}
	});

	return {
		calls,
		get maxInFlight() {
			return maxInFlight;
		},
		countTo(substring) {
			return calls.filter((call) => call.url.includes(substring)).length;
		},
	};
}

async function post(path, body) {
	const request = new Request(`http://example.com${path}`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body),
	});
	const ctx = createExecutionContext();
	const response = await worker.fetch(request, {}, ctx);
	await waitOnExecutionContext(ctx);
	return response;
}

function preApproveBody(numIntervals) {
	const allowed_times = [];
	for (let i = 0; i < numIntervals; i++) {
		allowed_times.push([1700000000 + i * 86400, 1700050000 + i * 86400]);
	}
	return {
		user_id: 'user-1',
		access_key: 'key-1',
		mobile_number: '9999999999',
		company_name: 'amazon',
		allowed_times,
	};
}

beforeEach(() => {
	// Keep the retry/backoff behaviour but make the waits negligible in tests.
	Object.assign(TUNING, DEFAULT_TUNING, { spacingMs: 0, baseBackoffMs: 1, maxBackoffMs: 2, jitterMs: 0 });
});

afterEach(() => {
	vi.unstubAllGlobals();
	Object.assign(TUNING, DEFAULT_TUNING);
});

describe('landing page', () => {
	it('serves the HTML app on GET', async () => {
		const ctx = createExecutionContext();
		const response = await worker.fetch(new Request('http://example.com'), {}, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
		expect(await response.text()).toContain('MyGatePass');
	});
});

describe('pre-approve', () => {
	it('creates every interval and reports the count', async () => {
		const stub = stubFetch(async (call) => {
			if (call.url.includes('/user/v3/info')) {
				return jsonResponse({ activeflat: 'flat-1' });
			}
			return jsonResponse({ status: 'ok' });
		});

		const response = await post('/pre-approve', preApproveBody(10));
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data).toMatchObject({ success: true, total: 10, created: 10, failed: 0, rate_limited: false });
		expect(stub.countTo('/preapprove/v2/send')).toBe(10);
		expect(data.failed_intervals).toEqual([]);
	});

	it('never runs more pre-approval calls in parallel than the concurrency limit', async () => {
		const stub = stubFetch(async (call) => {
			if (call.url.includes('/user/v3/info')) {
				return jsonResponse({ activeflat: 'flat-1' });
			}
			await new Promise((resolve) => setTimeout(resolve, 5));
			return jsonResponse({ status: 'ok' });
		});

		await post('/pre-approve', preApproveBody(20));

		expect(stub.maxInFlight).toBeLessThanOrEqual(TUNING.concurrency);
	});

	it('retries rate limited calls and succeeds once MyGate stops throttling', async () => {
		const attemptsPerInterval = new Map();
		const stub = stubFetch(async (call) => {
			if (call.url.includes('/user/v3/info')) {
				return jsonResponse({ activeflat: 'flat-1' });
			}
			const key = call.body.startTime;
			const attempt = (attemptsPerInterval.get(key) || 0) + 1;
			attemptsPerInterval.set(key, attempt);
			if (attempt < 3) {
				return jsonResponse({ error: 'rate limited' }, { status: 429, headers: { 'Retry-After': '0' } });
			}
			return jsonResponse({ status: 'ok' });
		});

		const response = await post('/pre-approve', preApproveBody(5));
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data).toMatchObject({ success: true, created: 5, failed: 0 });
		expect(stub.countTo('/preapprove/v2/send')).toBe(15);
	});

	it('reports the intervals that stayed rate limited instead of claiming success', async () => {
		stubFetch(async (call) => {
			if (call.url.includes('/user/v3/info')) {
				return jsonResponse({ activeflat: 'flat-1' });
			}
			if (call.body.startTime === 1700000000) {
				return jsonResponse({ status: 'ok' });
			}
			return jsonResponse({ error: 'rate limited' }, { status: 429 });
		});

		const response = await post('/pre-approve', preApproveBody(3));
		const data = await response.json();

		expect(response.status).toBe(429);
		expect(data).toMatchObject({ success: false, total: 3, created: 1, failed: 2, rate_limited: true });
		expect(data.failed_intervals).toEqual([
			[1700086400, 1700136400],
			[1700172800, 1700222800],
		]);
		expect(data.error).toContain('429');
	});

	it('stays within the Worker subrequest budget even while retrying', async () => {
		Object.assign(TUNING, { maxSubrequests: 12 });
		const stub = stubFetch(async (call) => {
			if (call.url.includes('/user/v3/info')) {
				return jsonResponse({ activeflat: 'flat-1' });
			}
			return jsonResponse({ error: 'rate limited' }, { status: 429 });
		});

		const response = await post('/pre-approve', preApproveBody(10));
		const data = await response.json();

		expect(stub.calls.length).toBeLessThanOrEqual(12);
		expect(data.success).toBe(false);
		expect(data.failed).toBe(10);
	});

	it('surfaces a rate limited user-info lookup as a 429', async () => {
		stubFetch(async () => jsonResponse({ error: 'rate limited' }, { status: 429 }));

		const response = await post('/pre-approve', preApproveBody(2));
		const data = await response.json();

		expect(response.status).toBe(429);
		expect(data).toMatchObject({ success: false, rate_limited: true });
		expect(data.error).toContain('rate limiting');
	});
});

describe('otp endpoints', () => {
	it('retries a rate limited OTP request before giving up', async () => {
		const stub = stubFetch(async () => jsonResponse({ error: 'rate limited' }, { status: 429 }));

		const response = await post('/send-otp', { mobile_number: '9999999999' });
		const data = await response.json();

		expect(response.status).toBe(429);
		expect(data.rate_limited).toBe(true);
		expect(stub.calls.length).toBe(TUNING.maxAttempts);
	});

	it('sends the OTP when MyGate answers', async () => {
		stubFetch(async () => jsonResponse({ status: 'ok' }));

		const response = await post('/send-otp', { mobile_number: '9999999999' });

		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({ success: true });
	});
});
