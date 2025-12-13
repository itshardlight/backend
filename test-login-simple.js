import fetch from 'node-fetch';
import dotenv from "dotenv";

dotenv.config();

const API_BASE_URL = process.env.API_URL || 'http://localhost:5000/api';

const testLogin = async () => {
  try {
    console.log("🔄 Testing login...");
    
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: "testadmin",
        password: "admin123"
      })
    });

    console.log("Response status:", response.status);
    console.log("Response headers:", Object.fromEntries(response.headers));
    
    const result = await response.json();
    console.log("Response body:", JSON.stringify(result, null, 2));
    
    if (result.token) {
      console.log("✅ Token found:", result.token.substring(0, 20) + "...");
    } else {
      console.log("❌ No token in response");
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
  }
};

testLogin();