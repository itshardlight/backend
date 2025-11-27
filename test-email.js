import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

console.log("📧 Testing Email Configuration...\n");
console.log("EMAIL_USER:", process.env.EMAIL_USER);
console.log("EMAIL_PASS:", process.env.EMAIL_PASS ? "***" + process.env.EMAIL_PASS.slice(-4) : "NOT SET");
console.log("");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const testEmail = async () => {
  try {
    console.log("🔄 Attempting to send test email...\n");
    
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // Send to yourself
      subject: "Test Email - Student Management System",
      html: `
        <h2>✅ Email Configuration Working!</h2>
        <p>If you received this email, your Gmail App Password is configured correctly.</p>
        <p>You can now use the password reset feature.</p>
      `
    });

    console.log("✅ SUCCESS! Email sent successfully!");
    console.log("Message ID:", info.messageId);
    console.log("\n📬 Check your inbox:", process.env.EMAIL_USER);
    
  } catch (error) {
    console.log("❌ ERROR! Email failed to send.\n");
    console.log("Error Code:", error.code);
    console.log("Error Message:", error.message);
    console.log("\n🔧 Fix:");
    
    if (error.code === "EAUTH") {
      console.log("   1. Go to: https://myaccount.google.com/apppasswords");
      console.log("   2. Generate a new App Password");
      console.log("   3. Update EMAIL_PASS in backend/.env");
      console.log("   4. Run this test again: node test-email.js");
    }
  }
};

testEmail();
