import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: function() {
      return !this.googleId; // Password not required for Google users
    }
  },
  googleId: {
    type: String,
    sparse: true,
    unique: true
  },
  profilePicture: {
    type: String,
    default: null
  },
  fullName: {
    type: String,
    default: ""
  },
  role: {
    type: String,
    enum: ["admin", "teacher", "student", "parent", "fee_department"],
    default: "student"
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationOTP: {
    type: String
  },
  otpExpires: {
    type: Date
  },
  accountStatus: {
    type: String,
    enum: ["active", "inactive", "suspended"],
    default: "active"
  },
  lastLogin: {
    type: Date,
    default: null
  },
  loginMethod: {
    type: String,
    enum: ["email", "google"],
    default: "email"
  },
  resetPasswordToken: {
    type: String
  },
  resetPasswordExpires: {
    type: Date
  },
  requirePasswordChange: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  if (this.password) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model("User", userSchema);
