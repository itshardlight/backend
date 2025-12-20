import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

console.log("🚀 Starting server with attendance routes...");

// Connect to MongoDB
connectDB();

app.use(cors());
app.use(express.json());

// Add request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Test route
app.get("/", (req, res) => {
  res.json({ 
    message: "Backend API is running with attendance routes",
    timestamp: new Date().toISOString()
  });
});

// Attendance routes
app.use("/api/attendance", attendanceRoutes);
console.log("✅ Attendance routes loaded at /api/attendance");

// List all routes for debugging
app.get("/debug/routes", (req, res) => {
  const routes = [];
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      routes.push(`${Object.keys(middleware.route.methods)} ${middleware.route.path}`);
    } else if (middleware.name === 'router' && middleware.regexp.source.includes('attendance')) {
      routes.push('Router: /api/attendance/*');
    }
  });
  res.json({ routes });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Test attendance endpoint: http://localhost:${PORT}/api/attendance/test`);
  console.log(`📍 Debug routes: http://localhost:${PORT}/debug/routes`);
});