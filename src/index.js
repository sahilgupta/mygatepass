/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

// export default {
// 	async fetch(request, env, ctx) {
// 		return new Response('Hello World 2!');
// 	},
// };

const HTML_CONTENT = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MyGate Pre-approval Form</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 min-h-screen flex items-center justify-center">
    <div class="bg-white p-8 rounded-lg shadow-md w-96">
        <h1 class="text-2xl font-bold mb-4">Bypass MyGate</h1>
        <p class="text-lg font-medium text-gray-600 mb-4">Pre-approve multiple entries. For free!</p>

        <!-- Step 1: Mobile Number -->
        <div id="step1" class="mb-4">
            <label for="mobileNumber" class="block mb-2">Mobile Number:</label>
            <input type="tel" id="mobileNumber" class="w-full p-2 border rounded" required>
            <button onclick="sendOTP()" class="mt-4 bg-blue-500 text-white p-2 rounded hover:bg-blue-600">Send OTP</button>
        </div>

        <!-- Step 2: OTP -->
        <div id="step2" class="mb-4 hidden">
            <label for="otp" class="block mb-2">Enter OTP:</label>
            <input type="text" id="otp" class="w-full p-2 border rounded" required>
            <button onclick="verifyOTP()" class="mt-4 bg-blue-500 text-white p-2 rounded hover:bg-blue-600">Verify OTP</button>
        </div>

        <!-- Step 3: Additional Details -->
        <div id="step3" class="hidden">
            <label for="companyName" class="block mb-2">Company Name:</label>
            <input type="text" id="companyName" class="w-full p-2 border rounded mb-4" required>

            <label for="startTime" class="block mb-2">Start Time:</label>
            <input type="time" id="startTime" value="08:00" class="w-full p-2 border rounded mb-4" required>

            <label for="endTime" class="block mb-2">End Time:</label>
            <input type="time" id="endTime" value="22:00" class="w-full p-2 border rounded mb-4" required>

            <label for="numDays" class="block mb-2">Number of Days:</label>
            <input type="number" id="numDays" class="w-full p-2 border rounded mb-4" min="1" value="30" required>

            <button onclick="submitForm()" class="bg-green-500 text-white p-2 rounded hover:bg-green-600">Submit</button>
        </div>

        <div id="result" class="mt-4 text-sm"></div>
    </div>

    <script>
        var accessKey, userId, mobileNumber;

        window.onload = function() {
            accessKey = localStorage.getItem('accessKey');
            mobileNumber = localStorage.getItem('mobileNumber');
            userId = localStorage.getItem('userId');

            if (accessKey && userId && mobileNumber) {
                // Show step 3 form directly if accessKey is present
                document.getElementById('step1').classList.add('hidden');
                document.getElementById('step2').classList.add('hidden');
                document.getElementById('step3').classList.remove('hidden');
            }
        };

        async function sendOTP() {
            mobileNumber = document.getElementById('mobileNumber').value;
            try {
                const response = await fetch('/send-otp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mobile_number: mobileNumber })
                });
                const data = await response.json();
                if (data.success) {
                    document.getElementById('step1').classList.add('hidden');
                    document.getElementById('step2').classList.remove('hidden');
                } else {
                    document.getElementById('result').textContent = data.error;
                }
            } catch (error) {
                document.getElementById('result').textContent = 'Error sending OTP';
            }
        }

        async function verifyOTP() {
            mobileNumber = document.getElementById('mobileNumber').value;
            const otp = document.getElementById('otp').value;
            try {
                const response = await fetch('/verify-otp', {
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
                } else {
                    document.getElementById('result').textContent = data.error;
                }
            } catch (error) {
                document.getElementById('result').textContent = 'Error verifying OTP';
            }
        }

        async function submitForm() {
            const formData = {
                user_id: userId,
                access_key: accessKey,
                mobile_number: mobileNumber,
                company_name: document.getElementById('companyName').value,
                start_time: document.getElementById('startTime').value,
                end_time: document.getElementById('endTime').value,
                num_days: document.getElementById('numDays').value,
            };

            try {
                const response = await fetch('/pre-approve', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                const data = await response.json();
                if (data.success) {
                    document.getElementById('result').textContent = 'Pre-approval successful!';
                } else {
                    document.getElementById('result').textContent = data.error;
                }
            } catch (error) {
                document.getElementById('result').textContent = 'Error submitting form';
            }
        }
    </script>
</body>
</html>
`;

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

function generateEpochIntervals(startTimeStr, endTimeStr, numDays = 1) {
    const startTime = new Date(`1970-01-01T${startTimeStr}:00Z`);
    const endTime = new Date(`1970-01-01T${endTimeStr}:00Z`);
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

async function sendPreapproveRequest(accessKey, userId, flatId, companyName, startTime, endTime) {
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
    return await makeRequest("POST", PREAPPROVE_URL, headers, payload);
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

        return new Response(JSON.stringify({ success: true, message: "OTP verified successfully",
        		data: {"mobile_number": mobileNumber, "access_key": accessKey, "user_id": userId}}), { status: 200 });
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
        const startTime = requestBody.start_time;
        const endTime = requestBody.end_time;
        const numDays = parseInt(requestBody.num_days, 10);

        if (!userId || !mobileNumber || !companyName || !startTime || !endTime || !accessKey) {
            return new Response(JSON.stringify({ error: "Missing required parameters" }), { status: 400 });
        }

        const userData = await getUserInfo(accessKey, userId);
        const flatId = userData.activeflat;

        if (!flatId) {
            return new Response(JSON.stringify({ error: "flat_id not found in the user info response" }), { status: 400 });
        }

        const intervals = generateEpochIntervals(startTime, endTime, numDays);
        const responses = [];
        for (const [start, end] of intervals) {
            const response = await sendPreapproveRequest(accessKey, userId, flatId, companyName.toUpperCase(), start, end);
            responses.push(response);
        }

        return new Response(JSON.stringify({ success: true, responses: responses }), { status: 200 });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}

async function handleRequest(request) {
    const url = new URL(request.url);
    if (request.method === "GET") {
        return new Response(HTML_CONTENT, {
            headers: { "content-type": "text/html;charset=UTF-8" },
        });
    } else if (request.method === "POST") {
        const reqBody = await readRequestBody(request);

        if (url.pathname === '/send-otp') {
            return await handleSendOtp(reqBody);
        } else if (url.pathname === '/verify-otp') {
            return await handleVerifyOtp(reqBody);
        } else if (url.pathname === '/pre-approve') {
            return await handlePreApprove(reqBody);
        }
    }

    return new Response(JSON.stringify({ error: "Invalid endpoint" }), { status: 404 });
}

addEventListener("fetch", (event) => {
    event.respondWith(handleRequest(event.request));
});
