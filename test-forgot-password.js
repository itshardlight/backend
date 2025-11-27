import axios from "axios";

console.log("🧪 Testing Forgot Password Functionality...\n");

const testForgotPassword = async () => {
  try {
    const response = await axios.post("http://localhost:5000/api/auth/forgot-password", {
      email: "unishmhrjan@gmail.com"
    });

    console.log("✅ SUCCESS!");
    console.log("Response:", response.data);
    console.log("\n📧 Check your email: unishmhrjan@gmail.com");
    console.log("Look for: 'Password Reset - Student Management System'");
    
  } catch (error) {
    console.log("❌ ERROR!");
    console.log("Status:", error.response?.status);
    console.log("Message:", error.response?.data?.message);
    console.log("Full Error:", error.message);
  }
};

testForgotPassword();
