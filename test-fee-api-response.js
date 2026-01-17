import axios from 'axios';

const testFeeAPIResponse = async () => {
  try {
    console.log('🔍 Testing Fee API Response...\n');
    
    // Test the fee students API endpoint
    const response = await axios.get('http://localhost:5000/api/fees/students', {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2OTRmYjFhNjNlYzIwNWE3ODI5MGNmYzgiLCJ1c2VybmFtZSI6Im1hbmlzaF8xMkE0NjEiLCJlbWFpbCI6Im1hbmlzaCAxMmE0NjFAZ21haWwuY29tIiwicm9sZSI6InN0dWRlbnQiLCJpYXQiOjE3MzU0NjE1MzMsImV4cCI6MTczNTU0NzkzM30.invalid' // This will fail, but let's see the structure
      }
    });
    
    console.log('✅ API Response received:');
    console.log('Success:', response.data.success);
    console.log('Total students:', response.data.data?.length || 0);
    
    if (response.data.data && response.data.data.length > 0) {
      console.log('\n📋 First few students:');
      response.data.data.slice(0, 3).forEach((student, index) => {
        console.log(`\n${index + 1}. Student Data Structure:`);
        console.log('   _id:', student._id);
        console.log('   firstName:', student.firstName);
        console.log('   lastName:', student.lastName);
        console.log('   fullName:', student.fullName);
        console.log('   email:', student.email);
        console.log('   academic:', JSON.stringify(student.academic, null, 2));
        console.log('   feeInfo:', JSON.stringify(student.feeInfo, null, 2));
      });
    }
    
  } catch (error) {
    if (error.response) {
      console.log('❌ API Error Response:');
      console.log('Status:', error.response.status);
      console.log('Message:', error.response.data?.message || 'Unknown error');
      
      if (error.response.status === 401) {
        console.log('\n🔑 Authentication required. Let me try without auth to see the endpoint structure...');
      }
    } else {
      console.log('❌ Network Error:', error.message);
    }
  }
};

// Test without authentication to see if server is running
const testServerHealth = async () => {
  try {
    const response = await axios.get('http://localhost:5000/api/health');
    console.log('✅ Server is running:', response.data);
    return true;
  } catch (error) {
    console.log('❌ Server not responding:', error.message);
    return false;
  }
};

const runTests = async () => {
  console.log('🚀 Starting Fee API Tests...\n');
  
  const serverRunning = await testServerHealth();
  if (serverRunning) {
    await testFeeAPIResponse();
  }
  
  console.log('\n✅ Test completed.');
};

runTests();