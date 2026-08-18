/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

const HTML_CONTENT = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MyGatePass: Pre-Approve Frequent MyGate Deliveries. Instantly.</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 min-h-screen flex items-center justify-center p-4">
    <div class="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <h1 class="text-4xl text-center font-bold mb-4">
            <span class="text-blue-600">My</span><span class="text-green-600">Gate</span><span class="text-gray-800">Pass</span>
        </h1>
        <p class="text-lg font-medium text-center text-gray-700 mb-2">Pre-Approve Frequent Deliveries. Instantly.</p>
        <div class="mb-8 text-center">
            <p class="text-gray-600 mb-4">Tired of manually approving regular deliveries? MyGatePass lets you pre-approve trusted delivery partners for specific time slots.</p>
        </div>

        <!-- Step 1: Mobile Number -->
        <div id="step1" class="mb-6">
            <label for="mobileNumber" class="block text-sm font-semibold mb-2 text-gray-700">Mobile Number:</label>
            <input type="tel" id="mobileNumber" class="w-full p-3 border rounded-lg focus:border-blue-500 focus:ring focus:ring-blue-200 outline-none transition" placeholder="Enter mobile number" required>
            <button onclick="sendOTP()" class="mt-4 w-full bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600 transition">Send OTP</button>
        </div>

        <!-- Step 2: OTP -->
        <div id="step2" class="mb-6 hidden">
            <label for="otp" class="block text-sm font-semibold mb-2 text-gray-700">Enter OTP:</label>
            <input type="text" id="otp" class="w-full p-3 border rounded-lg focus:border-blue-500 focus:ring focus:ring-blue-200 outline-none transition" placeholder="Enter OTP" required>
            <button onclick="verifyOTP()" class="mt-4 w-full bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600 transition">Verify OTP</button>
        </div>

        <!-- Step 3: Additional Details -->
        <div id="step3" class="hidden">
            <label for="companyName" class="block text-sm font-semibold mb-2 text-gray-700">Company Name:</label>
            <input type="text" id="companyName" placeholder="e.g. Amazon" autofocus class="w-full p-3 border rounded-lg mb-6 focus:border-blue-500 focus:ring focus:ring-blue-200 outline-none transition" required>

            <!-- Flex container for Start and End Time -->
            <div class="flex space-x-4 mb-6">
                <div class="flex-1">
                    <label for="startTime" class="block text-sm font-semibold mb-2 text-gray-700">Start Time:</label>
                    <input type="time" id="startTime" value="07:00" class="w-full p-3 border rounded-lg focus:border-blue-500 focus:ring focus:ring-blue-200 outline-none transition" required>
                </div>
                <div class="flex-1">
                    <label for="endTime" class="block text-sm font-semibold mb-2 text-gray-700">End Time:</label>
                    <input type="time" id="endTime" value="23:00" class="w-full p-3 border rounded-lg focus:border-blue-500 focus:ring focus:ring-blue-200 outline-none transition" required>
                </div>
            </div>

            <label for="numDays" class="block text-sm font-semibold mb-2 text-gray-700">Number of Days:</label>
            <input type="number" id="numDays" class="w-full p-3 border rounded-lg mb-6 focus:border-blue-500 focus:ring focus:ring-blue-200 outline-none transition" min="1" value="365" required>

            <button id="submitPreApprovalsBtn" onclick="submitForm()" class="w-full bg-green-500 text-white p-3 rounded-lg hover:bg-green-600 transition">Create Pre-Approvals</button>
        </div>

        <div id="result" class="mt-4 text-sm text-gray-600"></div>
    </div>

    <script>
        var accessKey, userId, mobileNumber;

        // Get all input fields
        const mobileNumberInput = document.getElementById('mobileNumber');
        const otpInput = document.getElementById('otp');
        const companyNameInput = document.getElementById('companyName');
        const startTimeInput = document.getElementById('startTime');
        const endTimeInput = document.getElementById('endTime');
        const numDaysInput = document.getElementById('numDays');
        const submitPreApprovalsBtn = document.getElementById('submitPreApprovalsBtn');
        const resultDiv = document.getElementById('result');

        // Clear result when any input field is changed
        function clearResult() {
            resultDiv.textContent = '';
        }

        // Add event listeners for all inputs to clear result div
        companyNameInput.addEventListener('input', clearResult);
        startTimeInput.addEventListener('input', clearResult);
        endTimeInput.addEventListener('input', clearResult);
        numDaysInput.addEventListener('input', clearResult);

        // Function to dynamically get the base path
        function getBasePath() {
            const pathname = window.location.pathname;
            return pathname.includes('/mygatepass') ? '/mygatepass' : '';
        }

        window.onload = function() {
            mobileNumberInput.focus();
            accessKey = localStorage.getItem('accessKey');
            mobileNumber = localStorage.getItem('mobileNumber');
            userId = localStorage.getItem('userId');

            if (accessKey && userId && mobileNumber) {
                // Show step 3 form directly if accessKey is present
                document.getElementById('step1').classList.add('hidden');
                document.getElementById('step2').classList.add('hidden');
                document.getElementById('step3').classList.remove('hidden');
                companyNameInput.focus(); // Focus on Company Name input field
            }
        };

        async function sendOTP() {
            mobileNumber = mobileNumberInput.value;
            const basePath = getBasePath();  // Dynamically determine the base path
            try {
                const response = await fetch(\`\${basePath}/send-otp\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mobile_number: mobileNumber })
                });
                const data = await response.json();
                if (data.success) {
                    document.getElementById('step1').classList.add('hidden');
                    document.getElementById('step2').classList.remove('hidden');
                    otpInput.focus(); // Focus on OTP input field
                } else {
                    document.getElementById('result').textContent = data.error;
                }
            } catch (error) {
                document.getElementById('result').textContent = 'Error sending OTP';
            }
        }

        async function verifyOTP() {
            mobileNumber = mobileNumberInput.value;
            const otp = otpInput.value;
            const basePath = getBasePath();  // Dynamically determine the base path
            try {
                const response = await fetch(\`\${basePath}/verify-otp\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mobile_number: mobileNumber, otp: otp })
                });
                const data = await response.json();
                if (data.success) {
                    accessKey = data.data.access_key;
                    userId = data.data.user_id;
                    mobileNumber = data.data.mobile_number;

                    // Store the data in local storage
                    localStorage.setItem('accessKey', accessKey);
                    localStorage.setItem('mobileNumber', mobileNumber);
                    localStorage.setItem('userId', userId);

                    document.getElementById('step2').classList.add('hidden');
                    document.getElementById('step3').classList.remove('hidden');
                    companyNameInput.focus(); // Focus on Company Name input field
                } else {
                    document.getElementById('result').textContent = data.error;
                }
            } catch (error) {
                document.getElementById('result').textContent = 'Error verifying OTP';
            }
        }

        function generateEpochIntervals(startTimeStr, endTimeStr, numDays = 1) {
            const startTime = new Date(\`1970-01-01T\${startTimeStr}:00Z\`);
            const endTime = new Date(\`1970-01-01T\${endTimeStr}:00Z\`);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            let intervals = [];
            for (let i = 0; i < numDays; i++) {
                const currentDate = new Date(today.getTime() + i * 86400000);
                const startEpoch = Math.floor(currentDate.getTime() / 1000) + startTime.getTime() / 1000;
                const endEpoch = Math.floor(currentDate.getTime() / 1000) + endTime.getTime() / 1000;
                intervals.push([startEpoch, endEpoch]);
            }
            return intervals;
        }

        // MyGate (behind Cloudflare) answers bursts of pre-approval calls with
        // HTTP 429 / Cloudflare error 1015, so each Worker invocation paces and
        // retries the calls of its batch. The batches themselves are sent
        // together, and every request carries the time budget it may use, so a
        // whole run stays inside TOTAL_DEADLINE_MS.
        const BATCH_SIZE = 35;              // keeps a Worker invocation inside its subrequest budget
        const TOTAL_DEADLINE_MS = 9000;     // upper bound on how long a run may take
        const NETWORK_RESERVE_MS = 500;     // allowance for the round trip to the Worker
        const MIN_RETRY_BUDGET_MS = 1500;   // skip the retry pass below this much remaining budget

        function chunk(items, size) {
            const chunks = [];
            for (let i = 0; i < items.length; i += size) {
                chunks.push(items.slice(i, i + size));
            }
            return chunks;
        }

        async function submitBatchRequest(formData, intervals, deadlineMs) {
            const basePath = getBasePath();
            formData.allowed_times = intervals;
            formData.deadline_ms = deadlineMs;

            try {
                const response = await fetch(\`\${basePath}/pre-approve\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                return await response.json();
            } catch (error) {
                return { success: false, error: error.message };
            }
        }

        // Sends every batch of the given intervals in parallel and collects what failed.
        async function runPass(formData, intervals, deadlineMs, onBatchDone) {
            const batches = chunk(intervals, BATCH_SIZE);
            const outcomes = await Promise.all(batches.map(async (batch) => {
                const result = await submitBatchRequest({ ...formData }, batch, deadlineMs);
                onBatchDone(result);
                return { result: result, batch: batch };
            }));

            const failed = [];
            const errors = new Set();
            for (const { result, batch } of outcomes) {
                if (Array.isArray(result.failed_intervals)) {
                    failed.push(...result.failed_intervals);
                } else if (!result.success) {
                    failed.push(...batch);
                }
                if (result.error) {
                    errors.add(result.error);
                }
            }
            return { failed: failed, errors: [...errors] };
        }

        async function createPreApprovals(formData, intervals, onProgress) {
            const startedAt = Date.now();
            const budgetLeft = () => TOTAL_DEADLINE_MS - (Date.now() - startedAt) - NETWORK_RESERVE_MS;

            let created = 0;
            const onBatchDone = (result) => {
                created += result.created || 0;
                onProgress(created, intervals.length);
            };

            let { failed, errors } = await runPass(formData, intervals, budgetLeft(), onBatchDone);

            // One retry pass for whatever got throttled, if the budget allows it.
            if (failed.length > 0 && budgetLeft() >= MIN_RETRY_BUDGET_MS) {
                ({ failed, errors } = await runPass(formData, failed, budgetLeft(), onBatchDone));
            }

            return { created: created, failed: failed, errors: errors };
        }

        async function submitForm() {
            submitPreApprovalsBtn.disabled = true;
            resultDiv.textContent = 'Processing...';

            var start_time = startTimeInput.value,
            end_time = endTimeInput.value,
            num_days = parseInt(numDaysInput.value);

            const formData = {
                user_id: userId,
                access_key: accessKey,
                mobile_number: mobileNumber,
                company_name: companyNameInput.value
            };

            const allIntervals = generateEpochIntervals(start_time, end_time, num_days);

            try {
                const { created, failed, errors } = await createPreApprovals(formData, allIntervals, (done, total) => {
                    resultDiv.textContent = \`Creating pre-approvals... \${done}/\${total}\`;
                });

                if (failed.length === 0) {
                    resultDiv.textContent = \`Pre-approvals created successfully for \${created} day(s)!\`;
                } else {
                    const details = errors.length ? \` (\${errors.join('; ')})\` : '';
                    resultDiv.textContent = \`Created \${created} of \${allIntervals.length} pre-approvals. \${failed.length} could not be created\${details}. Try again for the remaining days, or use a smaller number of days; days that already succeeded may get a duplicate pass.\`;
                }
            } catch (error) {
                resultDiv.textContent = 'Error submitting form: ' + error.message;
            } finally {
                submitPreApprovalsBtn.disabled = false;
            }
        }

        // Function to handle Enter key press for form submission
        function handleEnterKeyPress(event, callback) {
            if (event.key === 'Enter') {
                event.preventDefault(); // Prevent form from submitting normally
                callback();
            }
        }

        // Attach the event listeners for Enter key press
        mobileNumberInput.addEventListener('keypress', (event) => handleEnterKeyPress(event, sendOTP));
        otpInput.addEventListener('keypress', (event) => handleEnterKeyPress(event, verifyOTP));
        companyNameInput.addEventListener('keypress', (event) => handleEnterKeyPress(event, submitForm));
        startTimeInput.addEventListener('keypress', (event) => handleEnterKeyPress(event, submitForm));
        endTimeInput.addEventListener('keypress', (event) => handleEnterKeyPress(event, submitForm));
        numDaysInput.addEventListener('keypress', (event) => handleEnterKeyPress(event, submitForm));
    </script>
</body>
</html>`;

const VALIDATE_URL = "https://app.mygate.in/auth/v2/user/validate";
const LOGIN_URL = "https://app.mygate.in/auth/v2/login";
const INFO_URL = "https://app.mygate.in/user/v3/info";
const PREAPPROVE_URL = "https://ack.mygate.in/preapprove/v2/send";

const COMMON_HEADERS = {
    "Accept": "application/json",
    "Accept-Language": "en-IN,en-GB;q=0.9,en;q=0.8",
    "User-Agent": "MyGate/14 CFNetwork/1568.100.1 Darwin/24.0.0",
    "Connection": "keep-alive",
    "Accept-Encoding": "gzip, deflate, br",
    "Content-Type": "application/json"
};

// MyGate sits behind Cloudflare and answers bursts of requests with HTTP 429
// (Cloudflare error 1015). Pre-approvals are therefore capped at a few calls in
// flight and retried with an exponential backoff, all of it bounded by a
// deadline so a run never drags on. Exported so tests can dial it down.
export const TUNING = {
    // A Worker invocation may make at most 50 subrequests on the free plan,
    // and retries count against that budget too.
    maxSubrequests: 50,
    // How many pre-approval calls may be in flight at once, per invocation.
    concurrency: 4,
    // Longest an invocation may spend on MyGate, retries included. The page
    // sends a smaller budget when it has already used part of its own.
    deadlineMs: 8000,
    // A request is only started when at least this much of the budget is left.
    minRequestBudgetMs: 400,
    // Attempts per request, first attempt included.
    maxAttempts: 3,
    baseBackoffMs: 250,
    maxBackoffMs: 1500,
    jitterMs: 150
};

const RETRYABLE_STATUSES = [429, 500, 502, 503, 504];

function sleep(ms) {
    return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
}

// Tracks how many subrequests this invocation may still make, and how long it
// may keep trying.
function createCallContext(deadlineMs = TUNING.deadlineMs) {
    return {
        budget: createSubrequestBudget(),
        deadlineAt: Date.now() + deadlineMs,
        get timeLeft() {
            return this.deadlineAt - Date.now();
        }
    };
}

function createSubrequestBudget(limit = TUNING.maxSubrequests) {
    let remaining = limit;
    return {
        get remaining() {
            return remaining;
        },
        take() {
            if (remaining <= 0) {
                return false;
            }
            remaining -= 1;
            return true;
        }
    };
}

function parseRetryAfter(value) {
    if (!value) {
        return null;
    }
    const seconds = Number(value);
    if (Number.isFinite(seconds)) {
        return Math.max(0, seconds * 1000);
    }
    const timestamp = Date.parse(value);
    if (!Number.isNaN(timestamp)) {
        return Math.max(0, timestamp - Date.now());
    }
    return null;
}

function backoffDelay(attempt, retryAfterHeader) {
    const retryAfter = parseRetryAfter(retryAfterHeader);
    if (retryAfter !== null) {
        return Math.min(retryAfter, TUNING.maxBackoffMs);
    }
    const exponential = Math.min(TUNING.baseBackoffMs * 2 ** (attempt - 1), TUNING.maxBackoffMs);
    // Jitter keeps the parallel calls of a batch from retrying in lockstep.
    return exponential + Math.floor(Math.random() * TUNING.jitterMs);
}

function describeFailure(status) {
    if (status === 429) {
        return "MyGate is rate limiting requests (HTTP 429). Please wait a few minutes and try again.";
    }
    if (status === 0) {
        return "Could not reach MyGate.";
    }
    return `MyGate responded with HTTP ${status}.`;
}

// The page tells the Worker how much of its own time budget is left.
function clampDeadline(deadlineMs) {
    const requested = Number(deadlineMs);
    if (!Number.isFinite(requested)) {
        return TUNING.deadlineMs;
    }
    return Math.min(Math.max(requested, TUNING.minRequestBudgetMs), TUNING.deadlineMs);
}

function parseJson(body) {
    try {
        return JSON.parse(body);
    } catch (error) {
        return null;
    }
}

/**
 * Performs a request against MyGate, retrying rate limited and transient
 * failures with an exponential backoff until the subrequest budget or the
 * deadline runs out. Never throws: the outcome is reported as
 * `{ ok, status, body, attempts, error }`.
 */
async function requestWithRetry(method, url, headers, jsonData, context) {
    const body = JSON.stringify(jsonData);
    let attempt = 0;
    let status = 0;
    let responseBody = "";
    let retryAfterHeader = null;

    while (attempt < TUNING.maxAttempts) {
        if (context.timeLeft < TUNING.minRequestBudgetMs) {
            return giveUp(attempt, status, responseBody, "Ran out of time before MyGate answered. Please try again.");
        }
        if (!context.budget.take()) {
            return giveUp(attempt, status, responseBody, "Too many requests in a single call, please retry.");
        }
        attempt += 1;

        try {
            const response = await fetch(url, { method: method, headers: headers, body: body });
            status = response.status;
            responseBody = await response.text();
            retryAfterHeader = response.headers.get("Retry-After");
            if (response.ok) {
                return { ok: true, status: status, body: responseBody, attempts: attempt };
            }
            if (!RETRYABLE_STATUSES.includes(status)) {
                break;
            }
        } catch (error) {
            status = 0;
            responseBody = error.message;
            retryAfterHeader = null;
        }

        if (attempt >= TUNING.maxAttempts || context.budget.remaining <= 0) {
            break;
        }
        // Only wait out the backoff when there is still time to use the retry.
        const delay = backoffDelay(attempt, retryAfterHeader);
        if (delay + TUNING.minRequestBudgetMs > context.timeLeft) {
            break;
        }
        await sleep(delay);
    }

    return {
        ok: false,
        status: status,
        body: responseBody,
        attempts: attempt,
        error: describeFailure(status)
    };
}

function giveUp(attempt, status, body, messageWhenUntried) {
    return {
        ok: false,
        status: status,
        body: body,
        attempts: attempt,
        error: attempt === 0 ? messageWhenUntried : describeFailure(status)
    };
}

/**
 * Runs `task` over `items` with at most `TUNING.concurrency` calls in flight.
 */
async function mapWithConcurrency(items, task) {
    const results = new Array(items.length);
    let next = 0;

    async function runSlot() {
        while (true) {
            const index = next;
            next += 1;
            if (index >= items.length) {
                return;
            }
            results[index] = await task(items[index], index);
        }
    }

    const slots = [];
    for (let slot = 0; slot < Math.min(TUNING.concurrency, items.length); slot++) {
        slots.push(runSlot());
    }
    await Promise.all(slots);
    return results;
}

async function makeRequest(method, url, headers, jsonData, context) {
    const result = await requestWithRetry(method, url, headers, jsonData, context);
    if (!result.ok) {
        const error = new Error(result.error);
        error.status = result.status;
        throw error;
    }
    return parseJson(result.body) ?? {};
}

async function readRequestBody(request) {
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
        return request.json();
    }
    return request.text();
}

async function validateUser(mobileNumber, context) {
    const payload = {
        uname: mobileNumber,
        devicetype: "O",
        country_code: "91"
    };
    return await makeRequest("POST", VALIDATE_URL, COMMON_HEADERS, payload, context);
}

async function loginWithOtp(mobileNumber, otp, context) {
    const payload = {
        username: mobileNumber,
        country_code: "91",
        password: otp,
        appversion: "7.7.0",
        version: "3",
        type: "O"
    };
    return await makeRequest("POST", LOGIN_URL, COMMON_HEADERS, payload, context);
}

async function getUserInfo(accessKey, userId, context) {
    const headers = { ...COMMON_HEADERS, "access-key": accessKey };
    const payload = { userid: userId };
    return await makeRequest("POST", INFO_URL, headers, payload, context);
}

async function setupPreapproveRequest(accessKey, userId, flatId, companyName, startTime, endTime, context) {
    const headers = { ...COMMON_HEADERS, "access-key": accessKey };
    const payload = {
        isMulti: 0,
        visitorAddress: companyName,
        userid: userId,
        gateMessageType: "2305",
        flatid: flatId,
        userTypeId: "1008",
        isDeliveryDelegated: "0",
        startTime: startTime,
        endTime: endTime
    };
    return requestWithRetry("POST", PREAPPROVE_URL, headers, payload, context);
}

function errorResponse(error, fallbackStatus = 500) {
    const rateLimited = error.status === 429;
    return new Response(JSON.stringify({
        success: false,
        error: error.message,
        rate_limited: rateLimited
    }), { status: rateLimited ? 429 : fallbackStatus });
}

async function handleSendOtp(requestBody) {
    try {
        const mobileNumber = requestBody.mobile_number;

        if (!mobileNumber) {
            return new Response(JSON.stringify({ error: "Missing mobile number" }), { status: 400 });
        }

        await validateUser(mobileNumber, createCallContext());

        return new Response(JSON.stringify({ success: true, message: "OTP sent successfully" }), { status: 200 });
    } catch (error) {
        return errorResponse(error);
    }
}

async function handleVerifyOtp(requestBody) {
    try {
        const mobileNumber = requestBody.mobile_number;
        const otp = requestBody.otp;

        if (!mobileNumber || !otp) {
            return new Response(JSON.stringify({ error: "Missing mobile number or OTP" }), { status: 400 });
        }

        const loginData = await loginWithOtp(mobileNumber, otp, createCallContext());
        const accessKey = loginData.api_key;
        const userId = loginData.userid;

        if (!accessKey || !userId) {
            return new Response(JSON.stringify({ error: "Invalid OTP" }), { status: 400 });
        }

        return new Response(JSON.stringify({
            success: true,
            message: "OTP verified successfully",
            data: { "mobile_number": mobileNumber, "access_key": accessKey, "user_id": userId }
        }), { status: 200 });
    } catch (error) {
        return errorResponse(error);
    }
}

async function handlePreApprove(requestBody) {
    try {
        const userId = requestBody.user_id;
        const accessKey = requestBody.access_key;
        const mobileNumber = requestBody.mobile_number;
        const companyName = requestBody.company_name;
        const intervals = Array.isArray(requestBody.allowed_times) ? requestBody.allowed_times : [];

        if (!userId || !mobileNumber || !companyName || !accessKey) {
            return new Response(JSON.stringify({ error: "Missing required parameters" }), { status: 400 });
        }

        const context = createCallContext(clampDeadline(requestBody.deadline_ms));
        const userData = await getUserInfo(accessKey, userId, context);
        const flatId = userData.activeflat;

        if (!flatId) {
            return new Response(JSON.stringify({ error: "flat_id not found in the user info response" }), { status: 400 });
        }

        const results = await mapWithConcurrency(intervals, async ([start, end]) => {
            const result = await setupPreapproveRequest(accessKey, userId, flatId, companyName.toUpperCase(), start, end, context);
            return { start: start, end: end, ...result };
        });

        const failures = results.filter(result => !result.ok);
        const rateLimited = failures.some(result => result.status === 429);
        const errors = [...new Set(failures.map(result => result.error))];

        return new Response(JSON.stringify({
            success: failures.length === 0,
            total: results.length,
            created: results.length - failures.length,
            failed: failures.length,
            rate_limited: rateLimited,
            failed_intervals: failures.map(result => [result.start, result.end]),
            error: errors.join(" ") || undefined
        }), { status: failures.length === 0 ? 200 : (rateLimited ? 429 : 207) });
    } catch (error) {
        return errorResponse(error);
    }
}

async function handleRequest(request) {
    const url = new URL(request.url);
    const basePath = url.pathname.startsWith('/mygatepass') ? '/mygatepass' : '';

    // Adjusting routes based on the base path
    if (request.method === "GET") {
        return new Response(HTML_CONTENT, {
            headers: { "content-type": "text/html;charset=UTF-8" },
        });
    } else if (request.method === "POST") {
        const reqBody = await readRequestBody(request);

        if (url.pathname === `${basePath}/send-otp`) {
            return await handleSendOtp(reqBody);
        } else if (url.pathname === `${basePath}/verify-otp`) {
            return await handleVerifyOtp(reqBody);
        } else if (url.pathname === `${basePath}/pre-approve`) {
            return await handlePreApprove(reqBody);
        }
    }

    return new Response(JSON.stringify({ error: "Invalid endpoint" }), { status: 404 });
}

export default {
    fetch(request) {
        return handleRequest(request);
    }
};
