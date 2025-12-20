import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Test route to verify attendance endpoint exists
app.post("/api/attendance/mark-attendance", (req, res) => {
  console.log("✅ Attendance endpoint hit!");
  console.log("Request body:", req.body);
  console.log("Headers:", req.headers);
  
  res.json({
    success: true,
    message: "Test endpoint working",
    receivedData: req.body
  });
});

app.get("/", (req, res) => {
  res.json({ message: "Test server running" });
});

app.listen(PORT, () => {
  console.log(`🧪 Test server running on port ${PORT}`);
  console.log(`Test the endpoint: POST http://localhost:${PORT}/api/attendance/mark-attendance`);
});