import fetch from 'node-fetch';

const API_BASE_URL = 'http://localhost:5000/api';
const STUDENT_ID = '69476fc35753619d1c245a50';

console.log("🧪 Testing Individual Student Fetch...\n");

const testStudentById = async () => {
  try {
    // Step 1: Login as admin
    console.log("🔄 Step 1: Logging in as admin...");
    const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: "testadmin",
        password: "admin123"
      })
    });

    const loginResult = await loginResponse.json();
    
    if (!loginResponse.ok || !loginResult.success) {
      console.log("❌ FAILED! Admin login failed:", loginResult.message);
      return;
    }

    console.log("✅ SUCCESS! Admin logged in");
    const authToken = loginResult.token;

    // Step 2: Test the specific student ID
    console.log(`\n🔄 Step 2: Fetching student with ID: ${STUDENT_ID}...`);
    const studentResponse = await fetch(`${API_BASE_URL}/students/${STUDENT_ID}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`📡 Response status: ${studentResponse.status}`);
    
    const studentResult = await studentResponse.json();
    console.log("📋 Response body:", JSON.stringify(studentResult, null, 2));
    
    if (studentResponse.ok && studentResult.success) {
      console.log("✅ SUCCESS! Student found");
      console.log(`👤 Student: ${studentResult.data.firstName} ${studentResult.data.lastName}`);
    } else {
      console.log("❌ FAILED! Error:", studentResult.message || 'Unknown error');
    }

    // Step 3: Test with a potentially invalid ID
    console.log("\n🔄 Step 3: Testing with invalid ID...");
    const invalidResponse = await fetch(`${API_BASE_URL}/students/invalid-id`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    const invalidResult = await invalidResponse.json();
    console.log(`📡 Invalid ID response status: ${invalidResponse.status}`);
    console.log("📋 Invalid ID response:", JSON.stringify(invalidResult, null, 2));

  } catch (error) {
    console.error("💥 ERROR:", error.message);
  }
};

testStudentById();