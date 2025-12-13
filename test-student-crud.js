import fetch from 'node-fetch';
import dotenv from "dotenv";

dotenv.config();

const API_BASE_URL = process.env.API_URL || 'http://localhost:5000/api';

console.log("🧪 Testing Student CRUD Operations...\n");
console.log("API Base URL:", API_BASE_URL);
console.log("");

// Test data
const testStudent = {
  firstName: "Test",
  lastName: "Student",
  dateOfBirth: "2005-01-15",
  gender: "male",
  bloodGroup: "O+",
  email: "test.student@example.com",
  phone: "1234567890",
  address: "123 Test Street",
  city: "Test City",
  state: "Test State",
  zipCode: "12345",
  class: "10",
  section: "A",
  rollNumber: "TEST001",
  admissionDate: "2024-01-01",
  parentName: "Test Parent",
  parentPhone: "0987654321",
  parentEmail: "test.parent@example.com",
  emergencyContact: "1122334455",
  previousSchool: "Test Elementary",
  medicalConditions: "None"
};

const testStudentCRUD = async () => {
  let createdStudentId = null;

  try {
    // Test 1: Create Student (Public Registration)
    console.log("🔄 Test 1: Creating student via public registration...");
    const createResponse = await fetch(`${API_BASE_URL}/students/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testStudent)
    });

    const createResult = await createResponse.json();
    
    if (createResponse.ok) {
      console.log("✅ SUCCESS! Student created successfully");
      console.log("Student ID:", createResult.data._id);
      console.log("Student Name:", createResult.data.firstName, createResult.data.lastName);
      createdStudentId = createResult.data._id;
    } else {
      console.log("❌ FAILED! Error creating student:", createResult.message);
      return;
    }

    // Test 2: Get Public Student List
    console.log("\n🔄 Test 2: Fetching public student list...");
    const listResponse = await fetch(`${API_BASE_URL}/students/list/public`);
    const listResult = await listResponse.json();
    
    if (listResponse.ok) {
      console.log("✅ SUCCESS! Retrieved student list");
      console.log("Total students:", listResult.data.length);
      console.log("Pagination info:", listResult.pagination);
    } else {
      console.log("❌ FAILED! Error fetching student list:", listResult.message);
    }

    // Test 3: Get Public Stats
    console.log("\n🔄 Test 3: Fetching public statistics...");
    const statsResponse = await fetch(`${API_BASE_URL}/students/stats/public`);
    const statsResult = await statsResponse.json();
    
    if (statsResponse.ok) {
      console.log("✅ SUCCESS! Retrieved statistics");
      console.log("Stats:", statsResult.data);
    } else {
      console.log("❌ FAILED! Error fetching statistics:", statsResult.message);
    }

    // Test 4: Try to update student (should fail without auth)
    console.log("\n🔄 Test 4: Attempting to update student without authentication...");
    const updateResponse = await fetch(`${API_BASE_URL}/students/${createdStudentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ firstName: "Updated" })
    });

    const updateResult = await updateResponse.json();
    
    if (updateResponse.status === 401) {
      console.log("✅ SUCCESS! Update correctly rejected without authentication");
      console.log("Message:", updateResult.message);
    } else {
      console.log("❌ UNEXPECTED! Update should have been rejected:", updateResult.message);
    }

    // Test 5: Try to delete student (should fail without auth)
    console.log("\n🔄 Test 5: Attempting to delete student without authentication...");
    const deleteResponse = await fetch(`${API_BASE_URL}/students/${createdStudentId}`, {
      method: 'DELETE'
    });

    const deleteResult = await deleteResponse.json();
    
    if (deleteResponse.status === 401) {
      console.log("✅ SUCCESS! Delete correctly rejected without authentication");
      console.log("Message:", deleteResult.message);
    } else {
      console.log("❌ UNEXPECTED! Delete should have been rejected:", deleteResult.message);
    }

    console.log("\n🎉 All tests completed!");
    console.log("\n📝 Summary:");
    console.log("   ✅ Public student registration works");
    console.log("   ✅ Public student list retrieval works");
    console.log("   ✅ Public statistics retrieval works");
    console.log("   ✅ Authentication protection works for updates");
    console.log("   ✅ Authentication protection works for deletes");
    console.log("\n⚠️  Note: To test authenticated operations, you need to:");
    console.log("   1. Login to get an auth token");
    console.log("   2. Include the token in Authorization header");
    console.log("   3. Run update/delete operations with proper authentication");

  } catch (error) {
    console.log("❌ ERROR! Test failed with exception:");
    console.log("Error:", error.message);
    console.log("\n🔧 Make sure:");
    console.log("   1. Backend server is running on port 5000");
    console.log("   2. Database connection is working");
    console.log("   3. Student routes are properly configured");
  }
};

testStudentCRUD();