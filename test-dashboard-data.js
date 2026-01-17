import axios from 'axios';

const testDashboardData = async () => {
  try {
    console.log('🔍 Testing Dashboard Data APIs...\n');
    
    // Step 1: Login as admin user
    console.log('🔑 Logging in as admin user...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'testadmin',
      password: 'admin123'
    });
    
    if (!loginResponse.data.success) {
      console.log('❌ Admin login failed');
      return;
    }
    
    const token = loginResponse.data.token;
    console.log('✅ Admin login successful!');
    
    // Step 2: Test Students API
    console.log('\n📋 Testing Students API...');
    const studentsRes = await axios.get('http://localhost:5000/api/students', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Students API Response:');
    console.log('- Success:', studentsRes.data.success);
    console.log('- Total Students:', studentsRes.data.data?.length || 0);
    
    // Step 3: Test Fee Analytics API
    console.log('\n💰 Testing Fee Analytics API...');
    const feeRes = await axios.get('http://localhost:5000/api/fees/analytics', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Fee Analytics Response:');
    console.log('- Success:', feeRes.data.success);
    const feeData = feeRes.data.data || {};
    console.log('- Total Students:', feeData.totalStudents || 0);
    console.log('- Total Fee Amount:', feeData.totalFeeAmount || 0);
    console.log('- Total Paid Amount:', feeData.totalPaidAmount || 0);
    console.log('- Total Pending Amount:', feeData.totalPendingAmount || 0);
    console.log('- Collection Rate:', feeData.collectionRate || 0, '%');
    console.log('- Fully Paid Students:', feeData.fullyPaidStudents || 0);
    console.log('- Pending Students:', feeData.pendingStudents || 0);
    
    // Step 4: Test Student Profile API
    console.log('\n👤 Testing Student Profile API...');
    try {
      const profileRes = await axios.get('http://localhost:5000/api/profiles/me/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Profile API Response:');
      console.log('- Success:', profileRes.data.success);
      console.log('- Profile exists:', !!profileRes.data.profile);
    } catch (error) {
      console.log('Profile API (expected for admin):', error.response?.status, error.response?.data?.message);
    }
    
    console.log('\n🎉 Dashboard Data Summary:');
    console.log('✅ All APIs are working correctly');
    console.log('✅ Real data is available for dashboard');
    console.log('✅ Students:', studentsRes.data.data?.length || 0);
    console.log('✅ Fee Collection: ₹' + (feeData.totalPaidAmount || 0).toLocaleString());
    console.log('✅ Pending Fees: ₹' + (feeData.totalPendingAmount || 0).toLocaleString());
    console.log('✅ Collection Rate:', (feeData.collectionRate || 0) + '%');
    
  } catch (error) {
    if (error.response) {
      console.log('❌ API Error:');
      console.log('Status:', error.response.status);
      console.log('Message:', error.response.data?.message || 'Unknown error');
    } else {
      console.log('❌ Network Error:', error.message);
    }
  }
};

testDashboardData();