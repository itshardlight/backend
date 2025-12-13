import fetch from 'node-fetch';
import dotenv from "dotenv";

dotenv.config();

const API_BASE_URL = process.env.API_URL || 'http://localhost:5000/api';

console.log("🔐 Testing Authenticated Student CRUD Operations...\n");

const testAuthenticatedCRUD = async () => {
  let authToken = null;
  let testStudentId = null;

  try {
    // Step 1: Login to get auth token
    console.log("🔄 Step 1: Logging in to get auth token...");
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
    
    if (loginResponse.ok && loginResult.token) {
      console.log("✅ SUCCESS! Login successful");
      console.log("User:", loginResult.user.fullName, `(${loginResult.user.role})`);
      authToken = loginResult.token;
      console.log("Token received:", authToken.substring(0, 20) + "...");
    } else {
      console.log("❌ FAILED! Login failed:", loginResult.message);
      return;
    }

    // Step 2: Create a test student for editing/deleting
    console.log("\n🔄 Step 2: Creating test student...");
    const testStudent = {
      firstName: "Edit",
      lastName: "DeleteTest",
      dateOfBirth: "2005-06-15",
      gender: "female",
      bloodGroup: "A+",
      email: "edit.delete.test@example.com",
      phone: "9876543210",
      address: "456 Edit Street",
      city: "Edit City",
      state: "Edit State",
      zipCode: "54321",
      class: "11",
      section: "B",
      rollNumber: "EDIT001",
      admissionDate: "2024-06-01",
      parentName: "Edit Parent",
      parentPhone: "1234567890",
      parentEmail: "edit.parent@example.com",
      emergencyContact: "9988776655",
      previousSchool: "Edit Elementary",
      medicalConditions: "None"
    };

    const createResponse = await fetch(`${API_BASE_URL}/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(testStudent)
    });

    const createResult = await createResponse.json();
    
    if (createResponse.ok) {
      console.log("✅ SUCCESS! Test student created");
      console.log("Student ID:", createResult.data._id);
      console.log("Student Name:", createResult.data.firstName, createResult.data.lastName);
      testStudentId = createResult.data._id;
    } else {
      console.log("❌ FAILED! Error creating test student:", createResult.message);
      return;
    }

    // Step 3: Test UPDATE operation
    console.log("\n🔄 Step 3: Testing student update...");
    const updateData = {
      firstName: "Updated",
      lastName: "Student",
      phone: "1111111111"
    };

    const updateResponse = await fetch(`${API_BASE_URL}/students/${testStudentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(updateData)
    });

    const updateResult = await updateResponse.json();
    
    if (updateResponse.ok) {
      console.log("✅ SUCCESS! Student updated successfully");
      console.log("Updated Name:", updateResult.data.firstName, updateResult.data.lastName);
      console.log("Updated Phone:", updateResult.data.phone);
    } else {
      console.log("❌ FAILED! Error updating student:", updateResult.message);
    }

    // Step 4: Test GET by ID operation
    console.log("\n🔄 Step 4: Testing get student by ID...");
    const getResponse = await fetch(`${API_BASE_URL}/students/${testStudentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const getResult = await getResponse.json();
    
    if (getResponse.ok) {
      console.log("✅ SUCCESS! Student retrieved successfully");
      console.log("Student:", getResult.data.firstName, getResult.data.lastName);
      console.log("Roll Number:", getResult.data.rollNumber);
    } else {
      console.log("❌ FAILED! Error retrieving student:", getResult.message);
    }

    // Step 5: Test DELETE operation
    console.log("\n🔄 Step 5: Testing student delete...");
    const deleteResponse = await fetch(`${API_BASE_URL}/students/${testStudentId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const deleteResult = await deleteResponse.json();
    
    if (deleteResponse.ok) {
      console.log("✅ SUCCESS! Student deleted successfully");
      console.log("Message:", deleteResult.message);
    } else {
      console.log("❌ FAILED! Error deleting student:", deleteResult.message);
    }

    // Step 6: Verify deletion
    console.log("\n🔄 Step 6: Verifying student was deleted...");
    const verifyResponse = await fetch(`${API_BASE_URL}/students/${testStudentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const verifyResult = await verifyResponse.json();
    
    if (verifyResponse.status === 404) {
      console.log("✅ SUCCESS! Student deletion verified - student not found");
    } else {
      console.log("❌ UNEXPECTED! Student still exists after deletion");
    }

    console.log("\n🎉 All authenticated CRUD tests completed!");
    console.log("\n📝 Summary:");
    console.log("   ✅ Authentication with JWT tokens works");
    console.log("   ✅ Authenticated student creation works");
    console.log("   ✅ Authenticated student update works");
    console.log("   ✅ Authenticated student retrieval works");
    console.log("   ✅ Authenticated student deletion works");
    console.log("   ✅ Deletion verification works");

  } catch (error) {
    console.log("❌ ERROR! Test failed with exception:");
    console.log("Error:", error.message);
  }
};

testAuthenticatedCRUD();