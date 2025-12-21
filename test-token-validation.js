import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000/api';

const testTokenValidation = async () => {
  try {
    console.log("🧪 Testing Token Validation...\n");

    // Step 1: Login to get a fresh token
    console.log("1. Getting fresh token...");
    const loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'manish',
        password: 'manish@11A891'
      })
    });

    const loginData = await loginResponse.json();

    if (!loginData.success) {
      console.log("❌ Login failed:", loginData.message);
      return;
    }

    const token = loginData.token;
    console.log("✅ Fresh token obtained");
    console.log(`   Token: ${token.substring(0, 50)}...`);
    console.log(`   User: ${loginData.user.username} (${loginData.user.role})`);

    // Step 2: Test token immediately
    console.log("\n2. Testing token immediately...");
    const immediateResponse = await fetch(`${API_URL}/profiles/me/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const immediateData = await immediateResponse.json();
    
    if (immediateData.success) {
      console.log("✅ Token works immediately");
      console.log(`   Profile: ${immediateData.profile.fullName}`);
    } else {
      console.log("❌ Token failed immediately:", immediateData.message);
      return;
    }

    // Step 3: Check token format and decode (basic check)
    console.log("\n3. Checking token format...");
    const tokenParts = token.split('.');
    if (tokenParts.length === 3) {
      console.log("✅ Token has correct JWT format (3 parts)");
      
      try {
        const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
        console.log("✅ Token payload decoded:");
        console.log(`   User ID: ${payload.userId}`);
        console.log(`   Issued At: ${new Date(payload.iat * 1000).toLocaleString()}`);
        console.log(`   Expires At: ${new Date(payload.exp * 1000).toLocaleString()}`);
        
        const now = Date.now() / 1000;
        if (payload.exp > now) {
          console.log("✅ Token is not expired");
        } else {
          console.log("❌ Token is expired!");
        }
      } catch (e) {
        console.log("❌ Could not decode token payload:", e.message);
      }
    } else {
      console.log("❌ Token has incorrect format");
    }

    // Step 4: Test with different endpoints
    console.log("\n4. Testing with different endpoints...");
    
    const endpoints = [
      { name: 'Profile', url: `${API_URL}/profiles/me/profile` },
      { name: 'Students (if admin)', url: `${API_URL}/students` }
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint.url, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const data = await response.json();
        
        if (data.success) {
          console.log(`✅ ${endpoint.name}: Working`);
        } else {
          console.log(`❌ ${endpoint.name}: ${data.message}`);
        }
      } catch (error) {
        console.log(`❌ ${endpoint.name}: ${error.message}`);
      }
    }

    console.log("\n🎯 RECOMMENDATIONS:");
    console.log("1. Use this fresh token in your browser's localStorage");
    console.log("2. Check browser console for any JavaScript errors");
    console.log("3. Ensure you're using the correct username: 'manish'");
    console.log("4. Make sure both servers are running on correct ports");

  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
};

testTokenValidation();