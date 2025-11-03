import express from "express";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// POST /api/auth/google
router.post("/google", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, message: "No token provided" });
    }

    // Verify Google token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    // Extract user details
    const { sub, name, email, picture } = payload;

    console.log("✅ Google login request received:", {
      name,
      email,
      googleId: sub,
    });

    // Create your own JWT token for your app
    const jwtToken = jwt.sign(
      {
        googleId: sub,
        name,
        email,
      },
      process.env.JWT_SECRET || "secretkey",
      { expiresIn: "1h" }
    );

    // Send response
    res.status(200).json({
      success: true,
      message: "Google authentication successful",
      user: {
        name,
        email,
        picture,
        googleId: sub,
      },
      token: jwtToken,
    });
  } catch (error) {
    console.error("❌ Google login error:", error);
    res.status(400).json({
      success: false,
      message: "Invalid Google token",
    });
  }
});

export default router;
