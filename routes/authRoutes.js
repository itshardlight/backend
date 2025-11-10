import express from "express";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ----------------------------
// Email / Password Login Route
// ----------------------------
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  // TODO: Replace with real DB lookup
  if (email === "test@gmail.com" && password === "123456") {
    // Create JWT token
    const token = jwt.sign(
      { email, name: "Test User" },
      process.env.JWT_SECRET || "secretkey",
      { expiresIn: "1h" }
    );

    return res.json({
      success: true,
      user: { name: "Test User", email },
      token,
    });
  }

  return res.status(401).json({ success: false, message: "Invalid email or password" });
});

// ----------------------------
// Google Login Route
// ----------------------------
router.post("/google", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, message: "No token provided" });
    }

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub, name, email, picture } = payload;

    console.log("✅ Google login request received:", { name, email, googleId: sub });

    // Create JWT token for your app
    const jwtToken = jwt.sign(
      { googleId: sub, name, email },
      process.env.JWT_SECRET || "secretkey",
      { expiresIn: "1h" }
    );

    res.status(200).json({
      success: true,
      message: "Google authentication successful",
      user: { name, email, picture, googleId: sub },
      token: jwtToken,
    });
  } catch (error) {
    console.error("❌ Google login error:", error);
    res.status(400).json({ success: false, message: "Invalid Google token" });
  }
});

export default router;
