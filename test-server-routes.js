// Simple test to verify attendance routes can be imported
import attendanceRoutes from "./routes/attendanceRoutes.js";

console.log("✅ Attendance routes imported successfully!");
console.log("Routes object:", typeof attendanceRoutes);

// Test if it's a valid Express router
if (attendanceRoutes && typeof attendanceRoutes === 'function') {
  console.log("✅ Attendance routes is a valid Express router");
} else {
  console.log("❌ Attendance routes is not a valid Express router");
}

process.exit(0);