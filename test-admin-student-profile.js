import fetch from 'node-fetch';

const API_BASE_URL = 'http://localhost:5000/api';

console.log("🧪 Testing Admin Student Profile Access...\n");

const testAdminStudentProfile = async () => {
  let authToken = null;

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
    
    if (loginResponse.ok && loginResult.success) {
      console.log("✅ SUCCESS! Admin logged in");
      authToken = loginResult.token;
    } else {
      console.log("❌ FAILED! Admin login failed:", loginResult.message);
      return;
    }

    // Step 2: Get list of students
    console.log("\n🔄 Step 2: Getting student list...");
    const studentsResponse = await fetch(`${API_BASE_URL}/students`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const studentsResult = await studentsResponse.json();
    
    if (studentsResponse.ok && studentsResult.success) {
      console.log("✅ SUCCESS! Got student list");
      console.log(`📊 Found ${studentsResult.data.length} students`);
      
      if (studentsResult.data.length > 0) {
        const firstStudent = studentsResult.data[0];
        console.log(`👤 First student: ${firstStudent.firstName} ${firstStudent.lastName} (ID: ${firstStudent._id})`);
        
        // Step 3: Get individual student details
        console.log("\n🔄 Step 3: Getting individual student details...");
        const studentResponse = await fetch(`${API_BASE_URL}/students/${firstStudent._id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        });

        const studentResult = await studentResponse.json();
        
        if (studentResponse.ok && studentResult.success) {
          console.log("✅ SUCCESS! Got student details");
          console.log("📋 Student Details:");
          console.log(`   Name: ${studentResult.data.firstName} ${studentResult.data.lastName}`);
          console.log(`   Roll Number: ${studentResult.data.rollNumber}`);
          console.log(`   Class: ${studentResult.data.class}`);
          console.log(`   Section: ${studentResult.data.section}`);
          console.log(`   Email: ${studentResult.data.email}`);
          console.log(`   Status: ${studentResult.data.status}`);
          
          console.log("\n🎉 Admin Student Profile API is working correctly!");
          console.log(`🔗 Frontend URL: http://localhost:3000/student-profile/${firstStudent._id}`);
        } else {
          console.log("❌ FAILED! Error getting student details:", studentResult.message);
        }
      } else {
        console.log("⚠️ No students found in the system");
      }
    } else {
      console.log("❌ FAILED! Error getting student list:", studentsResult.message);
    }

  } catch (error) {
    console.error("💥 ERROR:", error.message);
  }
};

testAdminStudentProfile();