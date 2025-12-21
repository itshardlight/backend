import axios from 'axios';
import mongoose from 'mongoose';
import Profile from './models/Profile.js';
import User from './models/User.js';

const API_BASE_URL = 'http://localhost:5000/api';

// Debug Manish's achievements specifically
const debugManishAchievements = async () => {
  console.log('🔍 Debugging Manish\'s Achievements...\n');

  try {
    // Step 1: Login as Manish
    console.log('1. Logging in as Manish...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'manish.student@gmail.compass',
      password: 'password123'
    });

    if (!loginResponse.data.success) {
      console.log('❌ Login failed:', loginResponse.data.message);
      return;
    }

    const token = loginResponse.data.token;
    const user = loginResponse.data.user;
    console.log('✅ Login successful:', user.fullName);
    console.log('👤 User ID:', user.id);
    console.log('🎭 User Role:', user.role);

    // Step 2: Get Manish's profile via API
    console.log('\n2. Fetching profile via API...');
    const profileResponse = await axios.get(`${API_BASE_URL}/profiles/me/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!profileResponse.data.success) {
      console.log('❌ Profile fetch failed:', profileResponse.data.message);
      return;
    }

    const profile = profileResponse.data.profile;
    console.log('✅ Profile fetched:', profile.fullName);
    console.log('📋 Profile ID:', profile._id);
    console.log('📊 Achievements count:', profile.achievements?.length || 0);

    // Step 3: Analyze each achievement
    if (profile.achievements && profile.achievements.length > 0) {
      console.log('\n3. Analyzing achievements:');
      profile.achievements.forEach((achievement, index) => {
        console.log(`\n--- Achievement ${index + 1} ---`);
        console.log('🆔 ID:', achievement._id);
        console.log('📝 Title:', achievement.title);
        console.log('📅 Date:', achievement.date);
        console.log('🏷️ Category:', achievement.category);
        console.log('👤 Added by:', achievement.addedBy);
        console.log('🔍 Added by type:', typeof achievement.addedBy);
        
        // Check if addedBy is populated
        if (typeof achievement.addedBy === 'object' && achievement.addedBy !== null) {
          console.log('👤 Added by (populated):');
          console.log('   ID:', achievement.addedBy._id || achievement.addedBy.id);
          console.log('   Name:', achievement.addedBy.fullName || achievement.addedBy.username);
        }
        
        // Check ownership
        const canDelete = achievement.addedBy && (
          achievement.addedBy._id === user.id ||
          achievement.addedBy === user.id ||
          (typeof achievement.addedBy === 'object' && achievement.addedBy._id === user.id)
        );
        console.log('🔐 Can delete:', canDelete);
        console.log('🔍 Ownership check:');
        console.log('   achievement.addedBy:', achievement.addedBy);
        console.log('   user.id:', user.id);
        console.log('   Match?', achievement.addedBy === user.id || achievement.addedBy?._id === user.id);
      });

      // Step 4: Try to delete the first achievement
      console.log('\n4. Attempting to delete first achievement...');
      const firstAchievement = profile.achievements[0];
      
      try {
        const deleteResponse = await axios.delete(
          `${API_BASE_URL}/profiles/${profile._id}/achievements/${firstAchievement._id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (deleteResponse.data.success) {
          console.log('✅ Delete successful!');
          console.log('📊 Remaining achievements:', deleteResponse.data.achievements.length);
        } else {
          console.log('❌ Delete failed:', deleteResponse.data.message);
        }
      } catch (deleteError) {
        console.log('❌ Delete request failed:');
        console.log('Status:', deleteError.response?.status);
        console.log('Message:', deleteError.response?.data?.message);
        console.log('Full error:', deleteError.response?.data);
      }
    } else {
      console.log('\n3. No achievements found');
    }

    // Step 5: Direct database check
    console.log('\n5. Direct database check...');
    
    try {
      // Try to connect to MongoDB directly
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/school_management';
      await mongoose.connect(mongoUri);
      
      const dbProfile = await Profile.findById(profile._id).populate('achievements.addedBy', 'username fullName');
      if (dbProfile) {
        console.log('📊 DB Profile achievements:', dbProfile.achievements.length);
        dbProfile.achievements.forEach((achievement, index) => {
          console.log(`\nDB Achievement ${index + 1}:`);
          console.log('🆔 ID:', achievement._id.toString());
          console.log('📝 Title:', achievement.title);
          console.log('👤 Added by ID:', achievement.addedBy.toString());
          console.log('👤 Added by (populated):', achievement.addedBy);
          console.log('🔍 User ID:', user.id);
          console.log('🔍 Match?', achievement.addedBy.toString() === user.id);
        });
      }

      await mongoose.disconnect();
    } catch (dbError) {
      console.log('⚠️ Database check failed:', dbError.message);
      console.log('This is okay - continuing with API-only debugging');
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.response?.data?.message || error.message);
    console.error('Full error:', error.response?.data || error.message);
  }
};

// Run the debug
debugManishAchievements();