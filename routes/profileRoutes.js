import express from "express";
import Profile from "../models/Profile.js";
import User from "../models/User.js";
import { authenticateToken, requireRole } from "../middleware/auth.js";

const router = express.Router();

// Helper function to generate email
const generateStudentEmail = (firstName, rollNumber) => {
  return `${firstName.toLowerCase()}${rollNumber}@gmail.compass`;
};

// Create profile (Admin only)
router.post("/", authenticateToken, requireRole(["admin"]), async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      dateOfBirth,
      gender,
      bloodGroup,
      phone,
      address,
      academic,
      parentInfo,
      medicalInfo,
      userRole = "student"
    } = req.body;

    // Create user account first
    const generatedEmail = academic?.currentGrade ? 
      generateStudentEmail(firstName, `temp${Date.now()}`) : 
      `${firstName.toLowerCase()}.${lastName.toLowerCase()}@gmail.compass`;

    const user = new User({
      username: `${firstName.toLowerCase()}.${lastName.toLowerCase()}`,
      email: generatedEmail,
      password: "defaultPassword123", // Should be changed on first login
      role: userRole,
      fullName: `${firstName} ${lastName}`,
      isVerified: true
    });

    await user.save();

    // Create profile
    const profile = new Profile({
      userId: user._id,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      bloodGroup,
      phone,
      address,
      academic,
      parentInfo,
      medicalInfo,
      createdBy: req.user._id
    });

    await profile.save();

    // Update user email with actual roll number if student
    if (userRole === "student" && profile.academic.rollNumber) {
      user.email = generateStudentEmail(firstName, profile.academic.rollNumber);
      await user.save();
    }

    // Create parent user account if parent email provided
    if (parentInfo?.parentEmail && userRole === "student") {
      const existingParent = await User.findOne({ email: parentInfo.parentEmail });
      if (!existingParent) {
        const parentUser = new User({
          username: `parent_${profile.academic.rollNumber}`,
          email: parentInfo.parentEmail,
          password: "parentPassword123", // Should be changed on first login
          role: "parent",
          fullName: parentInfo.fatherName || parentInfo.motherName || parentInfo.guardianName,
          isVerified: true
        });
        await parentUser.save();
      }
    }

    const populatedProfile = await Profile.findById(profile._id)
      .populate('userId', 'username email role')
      .populate('createdBy', 'username fullName');

    res.status(201).json({
      success: true,
      message: "Profile created successfully",
      profile: populatedProfile,
      credentials: {
        email: user.email,
        password: "defaultPassword123",
        parentEmail: parentInfo?.parentEmail,
        parentPassword: parentInfo?.parentEmail ? "parentPassword123" : null
      }
    });
  } catch (error) {
    console.error("Create profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create profile"
    });
  }
});

// Get profile by ID with role-based access
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;
    const userId = req.user._id;

    const profile = await Profile.findById(id)
      .populate('userId', 'username email role lastLogin')
      .populate('createdBy', 'username fullName')
      .populate('achievements.addedBy', 'username fullName');

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found"
      });
    }

    // Role-based access control
    let filteredProfile = profile.toObject();

    switch (userRole) {
      case "admin":
        // Admin has full access
        break;
        
      case "teacher":
        // Teachers can see academic and basic info, but not fee details
        delete filteredProfile.feeInfo;
        break;
        
      case "fee_department":
        // Fee department can see basic info and fee details only
        filteredProfile = {
          _id: filteredProfile._id,
          firstName: filteredProfile.firstName,
          lastName: filteredProfile.lastName,
          fullName: filteredProfile.fullName,
          academic: {
            currentGrade: filteredProfile.academic?.currentGrade,
            section: filteredProfile.academic?.section,
            rollNumber: filteredProfile.academic?.rollNumber
          },
          feeInfo: filteredProfile.feeInfo,
          userId: filteredProfile.userId
        };
        break;
        
      case "parent":
        // Parents can only see their own child's profile
        const parentEmail = req.user.email;
        if (profile.parentInfo?.parentEmail !== parentEmail) {
          return res.status(403).json({
            success: false,
            message: "Access denied - not your child's profile"
          });
        }
        // Remove sensitive fee details for parents
        if (filteredProfile.feeInfo) {
          filteredProfile.feeInfo = {
            totalFee: filteredProfile.feeInfo.totalFee,
            paidAmount: filteredProfile.feeInfo.paidAmount,
            pendingAmount: filteredProfile.feeInfo.pendingAmount
          };
        }
        break;
        
      case "student":
        // Students can only see their own profile
        if (profile.userId.toString() !== userId.toString()) {
          return res.status(403).json({
            success: false,
            message: "Access denied - not your profile"
          });
        }
        // Students can see their fee information but with limited details
        if (filteredProfile.feeInfo) {
          filteredProfile.feeInfo = {
            totalFee: filteredProfile.feeInfo.totalFee,
            tuitionFee: filteredProfile.feeInfo.tuitionFee,
            admissionFee: filteredProfile.feeInfo.admissionFee,
            examFee: filteredProfile.feeInfo.examFee,
            libraryFee: filteredProfile.feeInfo.libraryFee,
            sportsFee: filteredProfile.feeInfo.sportsFee,
            otherFees: filteredProfile.feeInfo.otherFees,
            paidAmount: filteredProfile.feeInfo.paidAmount,
            pendingAmount: filteredProfile.feeInfo.pendingAmount,
            dueDate: filteredProfile.feeInfo.dueDate,
            paymentStatus: filteredProfile.feeInfo.paymentStatus,
            feeHistory: filteredProfile.feeInfo.feeHistory,
            lastPaymentDate: filteredProfile.feeInfo.lastPaymentDate
          };
        }
        // Remove sensitive parent info
        if (filteredProfile.parentInfo) {
          filteredProfile.parentInfo = {
            fatherName: filteredProfile.parentInfo.fatherName,
            motherName: filteredProfile.parentInfo.motherName,
            guardianName: filteredProfile.parentInfo.guardianName
          };
        }
        break;
        
      default:
        return res.status(403).json({
          success: false,
          message: "Access denied"
        });
    }

    res.json({
      success: true,
      profile: filteredProfile
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch profile"
    });
  }
});

// Get current user's profile
router.get("/me/profile", authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    let profile;
    
    if (userRole === "parent") {
      // For parents, find their child's profile
      profile = await Profile.findOne({ "parentInfo.parentEmail": req.user.email })
        .populate('userId', 'username email role lastLogin')
        .populate('achievements.addedBy', 'username fullName');
    } else if (userRole === "student") {
      // For students, find their profile by userId
      profile = await Profile.findOne({ userId })
        .populate('userId', 'username email role lastLogin')
        .populate('achievements.addedBy', 'username fullName');
      
      // If no profile exists, try to find by matching student data
      if (!profile) {
        const user = await User.findById(userId);
        if (user) {
          // Try to find profile by email match in Student collection
          const Student = (await import("../models/Student.js")).default;
          const student = await Student.findOne({ email: user.email });
          if (student) {
            // Create a profile from student data
            profile = {
              _id: student._id,
              userId: user,
              firstName: student.firstName,
              lastName: student.lastName,
              dateOfBirth: student.dateOfBirth,
              gender: student.gender,
              bloodGroup: student.bloodGroup,
              phone: student.phone,
              address: {
                street: student.address,
                city: student.city,
                state: student.state,
                zipCode: student.zipCode
              },
              academic: {
                currentGrade: student.class,
                section: student.section,
                rollNumber: student.rollNumber,
                admissionDate: student.admissionDate,
                previousSchool: student.previousSchool
              },
              parentInfo: {
                fatherName: student.parentName,
                motherName: student.parentName,
                guardianName: student.parentName,
                parentPhone: student.parentPhone,
                parentEmail: student.parentEmail,
                emergencyContact: student.emergencyContact
              },
              medicalInfo: {
                conditions: student.medicalConditions
              },
              achievements: [],
              fullName: `${student.firstName} ${student.lastName}`,
              currentClass: `${student.class}-${student.section}`
            };
          }
        }
      }
    } else {
      // For other roles, find their own profile
      profile = await Profile.findOne({ userId })
        .populate('userId', 'username email role lastLogin')
        .populate('achievements.addedBy', 'username fullName');
    }

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found"
      });
    }

    // Apply role-based filtering (same logic as above)
    let filteredProfile = profile.toObject ? profile.toObject() : profile;

    switch (userRole) {
      case "student":
        // Students can see their fee information but with limited details
        if (filteredProfile.feeInfo) {
          filteredProfile.feeInfo = {
            totalFee: filteredProfile.feeInfo.totalFee,
            tuitionFee: filteredProfile.feeInfo.tuitionFee,
            admissionFee: filteredProfile.feeInfo.admissionFee,
            examFee: filteredProfile.feeInfo.examFee,
            libraryFee: filteredProfile.feeInfo.libraryFee,
            sportsFee: filteredProfile.feeInfo.sportsFee,
            otherFees: filteredProfile.feeInfo.otherFees,
            paidAmount: filteredProfile.feeInfo.paidAmount,
            pendingAmount: filteredProfile.feeInfo.pendingAmount,
            dueDate: filteredProfile.feeInfo.dueDate,
            paymentStatus: filteredProfile.feeInfo.paymentStatus,
            feeHistory: filteredProfile.feeInfo.feeHistory,
            lastPaymentDate: filteredProfile.feeInfo.lastPaymentDate
          };
        }
        if (filteredProfile.parentInfo) {
          filteredProfile.parentInfo = {
            fatherName: filteredProfile.parentInfo.fatherName,
            motherName: filteredProfile.parentInfo.motherName,
            guardianName: filteredProfile.parentInfo.guardianName
          };
        }
        break;
        
      case "parent":
        if (filteredProfile.feeInfo) {
          filteredProfile.feeInfo = {
            totalFee: filteredProfile.feeInfo.totalFee,
            paidAmount: filteredProfile.feeInfo.paidAmount,
            pendingAmount: filteredProfile.feeInfo.pendingAmount
          };
        }
        break;
    }

    res.json({
      success: true,
      profile: filteredProfile
    });
  } catch (error) {
    console.error("Get my profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch profile"
    });
  }
});

// Update profile (role-based permissions)
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;
    const userId = req.user._id;
    const updates = req.body;

    const profile = await Profile.findById(id);
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found"
      });
    }

    // Role-based update permissions
    let allowedUpdates = {};

    switch (userRole) {
      case "admin":
        // Admin can update everything
        allowedUpdates = updates;
        break;
        
      case "teacher":
        // Teachers can update academic information
        if (updates.academic) {
          allowedUpdates.academic = updates.academic;
        }
        if (updates.medicalInfo) {
          allowedUpdates.medicalInfo = updates.medicalInfo;
        }
        break;
        
      case "fee_department":
        // Fee department can only update fee information
        if (updates.feeInfo) {
          allowedUpdates.feeInfo = updates.feeInfo;
        }
        break;
        
      case "student":
        // Students can only update their own achievements and basic contact info
        if (profile.userId.toString() !== userId.toString()) {
          return res.status(403).json({
            success: false,
            message: "Access denied"
          });
        }
        if (updates.phone) allowedUpdates.phone = updates.phone;
        if (updates.address) allowedUpdates.address = updates.address;
        if (updates.profilePicture) allowedUpdates.profilePicture = updates.profilePicture;
        break;
        
      default:
        return res.status(403).json({
          success: false,
          message: "Access denied"
        });
    }

    if (Object.keys(allowedUpdates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid updates provided"
      });
    }

    allowedUpdates.lastUpdatedBy = userId;

    const updatedProfile = await Profile.findByIdAndUpdate(
      id,
      { $set: allowedUpdates },
      { new: true, runValidators: true }
    ).populate('userId', 'username email role')
     .populate('lastUpdatedBy', 'username fullName');

    res.json({
      success: true,
      message: "Profile updated successfully",
      profile: updatedProfile
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update profile"
    });
  }
});

// Add achievement (students only)
router.post("/:id/achievements", authenticateToken, requireRole(["student"]), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, date, category } = req.body;
    const userId = req.user._id;

    let profile = await Profile.findById(id);
    
    // If no profile found, try to find by student data
    if (!profile) {
      const Student = (await import("../models/Student.js")).default;
      const student = await Student.findById(id);
      if (student && student.userId && student.userId.toString() === userId.toString()) {
        // Create a basic profile structure for adding achievements
        profile = await Profile.findOneAndUpdate(
          { userId: userId },
          {
            userId: userId,
            firstName: student.firstName,
            lastName: student.lastName,
            dateOfBirth: student.dateOfBirth,
            gender: student.gender,
            bloodGroup: student.bloodGroup,
            phone: student.phone,
            address: {
              street: student.address,
              city: student.city,
              state: student.state,
              zipCode: student.zipCode
            },
            academic: {
              currentGrade: student.class,
              section: student.section,
              rollNumber: student.rollNumber,
              admissionDate: student.admissionDate
            },
            parentInfo: {
              fatherName: student.parentName,
              parentPhone: student.parentPhone,
              parentEmail: student.parentEmail,
              emergencyContact: student.emergencyContact
            },
            achievements: [],
            createdBy: userId
          },
          { upsert: true, new: true }
        );
      }
    }

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found"
      });
    }

    // Students can only add achievements to their own profile
    if (profile.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    const achievement = {
      title,
      description,
      date: date || new Date(),
      category,
      addedBy: userId
    };

    profile.achievements.push(achievement);
    await profile.save();

    const updatedProfile = await Profile.findById(profile._id)
      .populate('achievements.addedBy', 'username fullName');

    res.json({
      success: true,
      message: "Achievement added successfully",
      achievements: updatedProfile.achievements
    });
  } catch (error) {
    console.error("Add achievement error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add achievement"
    });
  }
});

// Update achievement (students only - their own achievements)
router.put("/:id/achievements/:achievementId", authenticateToken, requireRole(["student"]), async (req, res) => {
  try {
    const { id, achievementId } = req.params;
    const { title, description, date, category } = req.body;
    const userId = req.user._id;

    const profile = await Profile.findById(id);
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found"
      });
    }

    // Students can only edit achievements on their own profile
    if (profile.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    // Find the achievement using find instead of id method
    const achievement = profile.achievements.find(a => a._id.toString() === achievementId);
    if (!achievement) {
      return res.status(404).json({
        success: false,
        message: "Achievement not found"
      });
    }

    // Students can only edit their own achievements
    if (achievement.addedBy.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only edit your own achievements"
      });
    }

    // Update achievement fields
    achievement.title = title;
    achievement.description = description;
    achievement.date = date || achievement.date;
    achievement.category = category;

    await profile.save();

    const updatedProfile = await Profile.findById(profile._id)
      .populate('achievements.addedBy', 'username fullName');

    res.json({
      success: true,
      message: "Achievement updated successfully",
      achievements: updatedProfile.achievements
    });
  } catch (error) {
    console.error("Update achievement error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update achievement"
    });
  }
});

// Delete achievement (students only - their own achievements)
router.delete("/:id/achievements/:achievementId", authenticateToken, requireRole(["student"]), async (req, res) => {
  try {
    const { id, achievementId } = req.params;
    const userId = req.user._id;

    const profile = await Profile.findById(id);
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found"
      });
    }

    // Students can only delete achievements from their own profile
    if (profile.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    // Find the achievement using find instead of id method
    const achievement = profile.achievements.find(a => a._id.toString() === achievementId);
    if (!achievement) {
      return res.status(404).json({
        success: false,
        message: "Achievement not found"
      });
    }

    // Students can only delete their own achievements
    if (achievement.addedBy.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own achievements"
      });
    }

    // Remove the achievement using pull with the ObjectId
    profile.achievements.pull({ _id: achievementId });
    await profile.save();

    const updatedProfile = await Profile.findById(profile._id)
      .populate('achievements.addedBy', 'username fullName');

    res.json({
      success: true,
      message: "Achievement deleted successfully",
      achievements: updatedProfile.achievements
    });
  } catch (error) {
    console.error("Delete achievement error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete achievement"
    });
  }
});

// Get all profiles (admin and teachers only)
router.get("/", authenticateToken, requireRole(["admin", "teacher"]), async (req, res) => {
  try {
    const { grade, section, search, page = 1, limit = 10 } = req.query;
    const userRole = req.user.role;

    let query = {};
    
    if (grade) query["academic.currentGrade"] = grade;
    if (section) query["academic.section"] = section;
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { "academic.rollNumber": { $regex: search, $options: "i" } }
      ];
    }

    const profiles = await Profile.find(query)
      .populate('userId', 'username email role')
      .sort({ "academic.currentGrade": 1, "academic.section": 1, "academic.rollNumber": 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Filter based on role
    let filteredProfiles = profiles.map(profile => {
      let filtered = profile.toObject();
      if (userRole === "teacher") {
        delete filtered.feeInfo;
      }
      return filtered;
    });

    const total = await Profile.countDocuments(query);

    res.json({
      success: true,
      profiles: filteredProfiles,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error("Get profiles error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch profiles"
    });
  }
});

export default router;