import axios from 'axios';

const testFeeAPIWithAuth = async () => {
  try {
    console.log('🔍 Testing Fee API with Authentication...\n');
    
    // Step 1: Login as fee department user
    console.log('🔑 Logging in as fee department user...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'fee_department',
      password: 'feedept123'
    });
    
    if (!loginResponse.data.success) {
      console.log('❌ Login failed:', loginResponse.data.message);
      return;
    }
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful!');
    
    // Step 2: Test the fee students API endpoint
    console.log('\n📋 Fetching students from fee API...');
    const response = await axios.get('http://localhost:5000/api/fees/students', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ API Response received:');
    console.log('Success:', response.data.success);
    console.log('Total students:', response.data.data?.length || 0);
    
    if (response.data.data && response.data.data.length > 0) {
      console.log('\n📋 Student Data Structure:');
      response.data.data.forEach((student, index) => {
        console.log(`\n${index + 1}. ${student.firstName || 'NO_FIRST_NAME'} ${student.lastName || 'NO_LAST_NAME'}`);
        console.log('   _id:', student._id);
        console.log('   firstName:', student.firstName);
        console.log('   lastName:', student.lastName);
        console.log('   fullName:', student.fullName);
        console.log('   email:', student.email);
        console.log('   class:', student.academic?.currentGrade + '-' + student.academic?.section);
        console.log('   roll:', student.academic?.rollNumber);
        console.log('   fee total:', student.feeInfo?.totalFee || 0);
        console.log('   fee paid:', student.feeInfo?.paidAmount || 0);
        console.log('   fee status:', student.feeInfo?.paymentStatus || 'pending');
      });
      
      // Check if names are actually present
      const studentsWithNames = response.data.data.filter(s => s.firstName && s.lastName);
      const studentsWithoutNames = response.data.data.filter(s => !s.firstName || !s.lastName);
      
      console.log(`\n📊 Name Analysis:`);
      console.log(`   Students with names: ${studentsWithNames.length}`);
      console.log(`   Students without names: ${studentsWithoutNames.length}`);
      
      if (studentsWithoutNames.length > 0) {
        console.log('\n❌ Students missing names:');
        studentsWithoutNames.forEach((student, index) => {
          console.log(`   ${index + 1}. ID: ${student._id}, Email: ${student.email}`);
        });
      }
    } else {
      console.log('❌ No students found in response');
    }
    
  } catch (error) {
    if (error.response) {
      console.log('❌ API Error Response:');
      console.log('Status:', error.response.status);
      console.log('Message:', error.response.data?.message || 'Unknown error');
      console.log('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('❌ Network Error:', error.message);
    }
  }
};

testFeeAPIWithAuth();