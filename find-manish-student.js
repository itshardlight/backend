import fetch from 'node-fetch';

const API_BASE_URL = 'http://localhost:5000/api';

console.log("🔍 Searching for student named Manish...\n");

const findManishStudent = async () => {
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

    // Step 2: Get all students and search for Manish
    console.log("\n🔄 Step 2: Searching for Manish in student list...");
    const studentsResponse = await fetch(`${API_BASE_URL}/students?limit=100`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const studentsResult = await studentsResponse.json();
    
    if (studentsResponse.ok && studentsResult.success) {
      console.log(`📊 Found ${studentsResult.data.length} students total`);
      
      // Search for Manish (case insensitive)
      const manishStudents = studentsResult.data.filter(student => 
        student.firstName.toLowerCase().includes('manish') || 
        student.lastName.toLowerCase().includes('manish') ||
        student.fullName?.toLowerCase().includes('manish')
      );

      if (manishStudents.length > 0) {
        console.log(`\n🎉 Found ${manishStudents.length} student(s) with name containing "Manish":\n`);
        
        manishStudents.forEach((student, index) => {
          console.log(`👤 Student ${index + 1}:`);
          console.log(`   📋 ID: ${student._id}`);
          console.log(`   👤 Name: ${student.firstName} ${student.lastName}`);
          console.log(`   📧 Email: ${student.email}`);
          console.log(`   🎫 Roll Number: ${student.rollNumber}`);
          console.log(`   🏫 Class: ${student.class}-${student.section}`);
          console.log(`   📱 Phone: ${student.phone || 'Not provided'}`);
          console.log(`   ✅ Status: ${student.status}`);
          
          // Generate likely login credentials based on the pattern
          const username = `${student.firstName.toLowerCase()}_${student.rollNumber}`;
          const password = `${student.firstName.toLowerCase()}@${student.rollNumber}`;
          
          console.log(`   🔑 Likely Login Credentials:`);
          console.log(`      Username: ${username}`);
          console.log(`      Password: ${password}`);
          console.log(`   🔗 Profile URL: http://localhost:3000/student-profile/${student._id}`);
          console.log('');
        });
      } else {
        console.log("❌ No students found with name containing 'Manish'");
        console.log("\n📋 All students in the system:");
        studentsResult.data.forEach((student, index) => {
          console.log(`${index + 1}. ${student.firstName} ${student.lastName} (${student.rollNumber})`);
        });
      }
    } else {
      console.log("❌ FAILED! Error getting student list:", studentsResult.message);
    }

  } catch (error) {
    console.error("💥 ERROR:", error.message);
  }
};

findManishStudent();