import User from "../models/User.js";
import Profile from "../models/Profile.js";

// Generate student email based on first name and roll number
export const generateStudentEmail = (firstName, rollNumber) => {
  return `${firstName.toLowerCase()}${rollNumber}@gmail.compass`;
};

// Generate parent username based on student roll number
export const generateParentUsername = (rollNumber) => {
  return `parent_${rollNumber}`;
};

// Check if this is user's first login
export const isFirstLogin = async (userId) => {
  try {
    const user = await User.findById(userId);
    return user && !user.lastLogin;
  } catch (error) {
    console.error('Error checking first login:', error);
    return false;
  }
};

// Force password change on first login
export const requirePasswordChange = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (user && !user.lastLogin) {
      // Mark that password change is required
      user.requirePasswordChange = true;
      await user.save();
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error setting password change requirement:', error);
    return false;
  }
};

// Update user's first login status
export const updateFirstLogin = async (userId) => {
  try {
    await User.findByIdAndUpdate(userId, {
      lastLogin: new Date(),
      requirePasswordChange: false
    });
    return true;
  } catch (error) {
    console.error('Error updating first login:', error);
    return false;
  }
};

// Get profile by user role and permissions
export const getProfileWithPermissions = async (profileId, requestingUser) => {
  try {
    const profile = await Profile.findById(profileId)
      .populate('userId', 'username email role lastLogin')
      .populate('createdBy', 'username fullName')
      .populate('achievements.addedBy', 'username fullName');

    if (!profile) {
      return null;
    }

    // Apply role-based filtering
    const filteredProfile = applyRoleBasedFiltering(profile, requestingUser);
    return filteredProfile;
  } catch (error) {
    console.error('Error getting profile with permissions:', error);
    return null;
  }
};

// Apply role-based filtering to profile data
export const applyRoleBasedFiltering = (profile, requestingUser) => {
  if (!profile || !requestingUser) return null;

  let filteredProfile = profile.toObject();
  const userRole = requestingUser.role;
  const userId = requestingUser._id;

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
        userId: filteredProfile.userId,
        createdAt: filteredProfile.createdAt,
        updatedAt: filteredProfile.updatedAt
      };
      break;
      
    case "parent":
      // Parents can only see their own child's profile
      const parentEmail = requestingUser.email;
      if (profile.parentInfo?.parentEmail !== parentEmail) {
        return null; // Access denied
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
        return null; // Access denied
      }
      // Remove fee details and sensitive parent info
      delete filteredProfile.feeInfo;
      if (filteredProfile.parentInfo) {
        filteredProfile.parentInfo = {
          fatherName: filteredProfile.parentInfo.fatherName,
          motherName: filteredProfile.parentInfo.motherName,
          guardianName: filteredProfile.parentInfo.guardianName
        };
      }
      break;
      
    default:
      return null; // Access denied
  }

  return filteredProfile;
};

// Validate profile data based on user role
export const validateProfileUpdate = (updates, requestingUser, targetProfile) => {
  const userRole = requestingUser.role;
  const userId = requestingUser._id;
  let allowedUpdates = {};

  switch (userRole) {
    case "admin":
      // Admin can update everything
      allowedUpdates = updates;
      break;
      
    case "teacher":
      // Teachers can update academic information and medical info
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
      // Students can only update their own basic contact info
      if (targetProfile.userId.toString() !== userId.toString()) {
        return null; // Access denied
      }
      if (updates.phone) allowedUpdates.phone = updates.phone;
      if (updates.address) allowedUpdates.address = updates.address;
      if (updates.profilePicture) allowedUpdates.profilePicture = updates.profilePicture;
      break;
      
    default:
      return null; // Access denied
  }

  return allowedUpdates;
};

// Generate default credentials for new users
export const generateDefaultCredentials = (userRole) => {
  const defaultPasswords = {
    student: "student123",
    parent: "parent123",
    teacher: "teacher123",
    fee_department: "fee123",
    admin: "admin123"
  };

  return {
    password: defaultPasswords[userRole] || "default123",
    requirePasswordChange: true
  };
};

// Check if user has access to specific profile
export const hasProfileAccess = (profile, requestingUser) => {
  const userRole = requestingUser.role;
  const userId = requestingUser._id;

  switch (userRole) {
    case "admin":
    case "teacher":
      return true; // Can access all profiles
      
    case "fee_department":
      return true; // Can access all profiles for fee management
      
    case "parent":
      return profile.parentInfo?.parentEmail === requestingUser.email;
      
    case "student":
      return profile.userId.toString() === userId.toString();
      
    default:
      return false;
  }
};

export default {
  generateStudentEmail,
  generateParentUsername,
  isFirstLogin,
  requirePasswordChange,
  updateFirstLogin,
  getProfileWithPermissions,
  applyRoleBasedFiltering,
  validateProfileUpdate,
  generateDefaultCredentials,
  hasProfileAccess
};