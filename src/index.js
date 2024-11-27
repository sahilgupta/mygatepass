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
                    <input type="time" id="startTime" value="08:00" class="w-full p-3 border rounded-lg focus:border-blue-500 focus:ring focus:ring-blue-200 outline-none transition" required>
                </div>
                <div class="flex-1">
                    <label for="endTime" class="block text-sm font-semibold mb-2 text-gray-700">End Time:</label>
                    <input type="time" id="endTime" value="22:00" class="w-full p-3 border rounded-lg focus:border-blue-500 focus:ring focus:ring-blue-200 outline-none transition" required>
                </div>
            </div>

            <label for="numDays" class="block text-sm font-semibold mb-2 text-gray-700">Number of Days:</label>
            <input type="number" id="numDays" class="w-full p-3 border rounded-lg mb-6 focus:border-blue-500 focus:ring focus:ring-blue-200 outline-none transition" min="1" value="30" required>

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

        async function submitBatchRequest(formData, intervals) {
            const basePath = getBasePath();
            formData.allowed_times = intervals;

            const response = await fetch(\`\${basePath}/pre-approve\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            return response.json();
        }

        async function submitForm() {
            const basePath = getBasePath();
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
            const batchSize = 45;
            const batches = [];

            for (let i = 0; i < allIntervals.length; i += batchSize) {
                batches.push(allIntervals.slice(i, i + batchSize));
            }

            try {
                const results = await Promise.all(batches.map(batch => submitBatchRequest({...formData}, batch)));

                const allSuccessful = results.every(result => result.success);

                submitPreApprovalsBtn.disabled = false;

                if (allSuccessful) {
                    resultDiv.textContent = 'Pre-approvals created successfully!';
                } else {
                    const errors = results.filter(result => !result.success).map(result => result.error).join(', ');
                    resultDiv.textContent = \`Some pre-approvals failed. Errors: \${errors}\`;
                }
            } catch (error) {
                submitPreApprovalsBtn.disabled = false;
                resultDiv.textContent = 'Error submitting form: ' + error.message;
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

async function makeRequest(method, url, headers, jsonData) {
    const response = await fetch(url, {
        method: method,
        headers: headers,
        body: JSON.stringify(jsonData)
    });
    if (!response.ok) {
        throw new Error(`Request to ${url} failed with status ${response.status}`);
    }
    return response.json();
}

async function createRequest(method, url, headers, jsonData) {
    return fetch(url, {
        method: method,
        headers: headers,
        body: JSON.stringify(jsonData)
    });
}

async function readRequestBody(request) {
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
        return request.json();
    }
    return request.text();
}

async function validateUser(mobileNumber) {
    const payload = {
        uname: mobileNumber,
        devicetype: "O",
        country_code: "91"
    };
    return await makeRequest("POST", VALIDATE_URL, COMMON_HEADERS, payload);
}

async function loginWithOtp(mobileNumber, otp) {
    const payload = {
        username: mobileNumber,
        country_code: "91",
        password: otp,
        appversion: "7.7.0",
        version: "3",
        type: "O"
    };
    return await makeRequest("POST", LOGIN_URL, COMMON_HEADERS, payload);
}

async function getUserInfo(accessKey, userId) {
    const headers = { ...COMMON_HEADERS, "access-key": accessKey };
    const payload = { userid: userId };
    return await makeRequest("POST", INFO_URL, headers, payload);
}

async function setupPreapproveRequest(accessKey, userId, flatId, companyName, startTime, endTime) {
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
    return createRequest("POST", PREAPPROVE_URL, headers, payload);
}

async function handleSendOtp(requestBody) {
    try {
        const mobileNumber = requestBody.mobile_number;

        if (!mobileNumber) {
            return new Response(JSON.stringify({ error: "Missing mobile number" }), { status: 400 });
        }

        await validateUser(mobileNumber);

        return new Response(JSON.stringify({ success: true, message: "OTP sent successfully" }), { status: 200 });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}

async function handleVerifyOtp(requestBody) {
    try {
        const mobileNumber = requestBody.mobile_number;
        const otp = requestBody.otp;

        if (!mobileNumber || !otp) {
            return new Response(JSON.stringify({ error: "Missing mobile number or OTP" }), { status: 400 });
        }

        const loginData = await loginWithOtp(mobileNumber, otp);
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
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}

async function handlePreApprove(requestBody) {
    try {
        const userId = requestBody.user_id;
        const accessKey = requestBody.access_key;
        const mobileNumber = requestBody.mobile_number;
        const companyName = requestBody.company_name;
        const intervals = requestBody.allowed_times;

        if (!userId || !mobileNumber || !companyName || !accessKey) {
            return new Response(JSON.stringify({ error: "Missing required parameters" }), { status: 400 });
        }

        const userData = await getUserInfo(accessKey, userId);
        const flatId = userData.activeflat;

        if (!flatId) {
            return new Response(JSON.stringify({ error: "flat_id not found in the user info response" }), { status: 400 });
        }

        const requests = [];
        for (const [start, end] of intervals) {
            const request = setupPreapproveRequest(accessKey, userId, flatId, companyName.toUpperCase(), start, end);
            requests.push(request);
        }

        const responses = await Promise.all(requests);

        return new Response(JSON.stringify({ success: true, responses: responses }), { status: 200 });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
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

addEventListener("fetch", (event) => {
    event.respondWith(handleRequest(event.request));
});