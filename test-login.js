import axios from 'axios';

const testLogin = async () => {
  try {
    console.log('🔑 Testing login credentials...\n');
    
    // Test fee department login
    console.log('Testing fee_department login...');
    const response = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'fee_department',
      password: 'feedept123'
    });
    
    console.log('✅ Login successful!');
    console.log('User:', response.data.user);
    console.log('Token exists:', !!response.data.token);
    
  } catch (error) {
    if (error.response) {
      console.log('❌ Login failed:');
      console.log('Status:', error.response.status);
      console.log('Message:', error.response.data?.message);
      
      // Try to see what users exist
      console.log('\n🔍 Let me check what users exist...');
      
    } else {
      console.log('❌ Network Error:', error.message);
    }
  }
};

testLogin();