import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js"; // ✅ include .js extension

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes); // ✅ connect auth routes

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
