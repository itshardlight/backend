import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Create transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Send password reset email
export const sendPasswordResetEmail = async (email, resetToken, username) => {
  const resetURL = `http://localhost:3000/reset-password/${resetToken}`;
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Password Reset - Student Management System",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>Hi ${username},</p>
        <p>You requested to reset your password. Click the button below to reset it:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetURL}" style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="color: #666;">Or copy this link: <a href="${resetURL}">${resetURL}</a></p>
        <p style="color: #666;">This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
        <p style="color: #999; font-size: 12px;">Student Management System</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error("Email send error:", error);
    return { success: false, error: error.message };
  }
};

// Send student login credentials to parent
export const sendStudentCredentialsEmail = async (parentEmail, studentData, loginCredentials) => {
  const loginURL = `http://localhost:3000/login`;
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: parentEmail,
    subject: "Student Account Created - Login Credentials",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Student Account Created Successfully</h2>
        <p>Dear Parent/Guardian,</p>
        <p>A student account has been created for <strong>${studentData.firstName} ${studentData.lastName}</strong> in our Student Management System.</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #495057; margin-top: 0;">Student Details:</h3>
          <p><strong>Name:</strong> ${studentData.firstName} ${studentData.lastName}</p>
          <p><strong>Roll Number:</strong> ${studentData.rollNumber}</p>
          <p><strong>Class:</strong> ${studentData.class}</p>
          <p><strong>Section:</strong> ${studentData.section}</p>
          <p><strong>Email:</strong> ${studentData.email}</p>
        </div>

        <div style="background-color: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff;">
          <h3 style="color: #0056b3; margin-top: 0;">Login Credentials:</h3>
          <p><strong>Username:</strong> <code style="background-color: #f1f3f4; padding: 2px 6px; border-radius: 3px;">${loginCredentials.username}</code></p>
          <p><strong>Temporary Password:</strong> <code style="background-color: #f1f3f4; padding: 2px 6px; border-radius: 3px;">${loginCredentials.temporaryPassword}</code></p>
          <p style="color: #dc3545; font-weight: bold;">⚠️ The student must change this password on first login for security.</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${loginURL}" style="background-color: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Login to Student Portal
          </a>
        </div>

        <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <h4 style="color: #856404; margin-top: 0;">Important Instructions:</h4>
          <ul style="color: #856404; margin: 0;">
            <li>Please share these credentials securely with your child</li>
            <li>The student must change the password on first login</li>
            <li>Keep these credentials safe and do not share with others</li>
            <li>Contact the school administration if you face any login issues</li>
          </ul>
        </div>

        <p>If you have any questions or need assistance, please contact the school administration.</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
        <p style="color: #999; font-size: 12px;">
          Student Management System<br>
          This is an automated email. Please do not reply to this email.
        </p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error("Email send error:", error);
    return { success: false, error: error.message };
  }
};
