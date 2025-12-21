import fetch from 'node-fetch';

const API_BASE_URL = 'http://localhost:5000/api';

console.log("🧪 Testing Manish's new login credentials...\n");

const testManishLogin = async () => {
  try {
    // Test login with new credentials
    console.log("🔄 Testing login with username: 'manish' and password: 'manish'...");
    const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: "manish",
        password: "manish"
      })
    });

    const loginResult = await loginResponse.json();
    
    if (loginResponse.ok && loginResult.success) {
      console.log("✅ SUCCESS! Manish can now login with new credentials");
      console.log("👤 User details:");
      console.log(`   Username: ${loginResult.user.username}`);
      console.log(`   Email: ${loginResult.user.email}`);
      console.log(`   Full Name: ${loginResult.user.fullName}`);
      console.log(`   Role: ${loginResult.user.role}`);
      console.log(`   Token: ${loginResult.token ? 'Generated' : 'Missing'}`);
      
      console.log("\n🎉 Manish can now login to the system using:");
      console.log("   Username: manish");
      console.log("   Password: manish");
      console.log("\n📱 After login, he can:");
      console.log("   - View his own profile");
      console.log("   - Access student dashboard");
      console.log("   - View his attendance records");
      
    } else {
      console.log("❌ FAILED! Login failed:", loginResult.message);
    }

  } catch (error) {
    console.error("💥 ERROR:", error.message);
  }
};

testManishLogin();