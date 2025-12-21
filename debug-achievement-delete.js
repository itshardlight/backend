import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

// Debug achievement delete functionality
const debugAchievementDelete = async () => {
  console.log('🔍 Debugging Achievement Delete Functionality...\n');

  try {
    // Step 1: Login as student
    console.log('1. Logging in as student...');
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

    // Step 2: Get student profile
    console.log('\n2. Fetching student profile...');
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
    console.log('📊 Current achievements:', profile.achievements?.length || 0);

    // Step 3: Add a test achievement
    console.log('\n3. Adding a test achievement...');
    const testAchievement = {
      title: 'Test Achievement for Delete',
      description: 'This achievement will be deleted as part of testing',
      date: new Date().toISOString(),
      category: 'other'
    };

    const addResponse = await axios.post(
      `${API_BASE_URL}/profiles/${profile._id}/achievements`,
      testAchievement,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!addResponse.data.success) {
      console.log('❌ Add achievement failed:', addResponse.data.message);
      return;
    }

    console.log('✅ Achievement added successfully');
    const achievements = addResponse.data.achievements;
    const newAchievement = achievements[achievements.length - 1];
    console.log('🆔 New Achievement ID:', newAchievement._id);
    console.log('👤 Added by:', newAchievement.addedBy);
    console.log('📊 Total achievements:', achievements.length);

    // Step 4: Verify ownership
    console.log('\n4. Verifying ownership...');
    console.log('🔍 Achievement addedBy:', newAchievement.addedBy);
    console.log('🔍 Current user ID:', user.id);
    console.log('🔍 Match?', newAchievement.addedBy.toString() === user.id.toString());

    // Step 5: Attempt to delete
    console.log('\n5. Attempting to delete achievement...');
    try {
      const deleteResponse = await axios.delete(
        `${API_BASE_URL}/profiles/${profile._id}/achievements/${newAchievement._id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (deleteResponse.data.success) {
        console.log('✅ Achievement deleted successfully!');
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

    // Step 6: Test with admin user (should fail)
    console.log('\n6. Testing delete with admin user (should fail)...');
    try {
      const adminLoginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: 'admin@gmail.compass',
        password: 'admin123'
      });

      if (adminLoginResponse.data.success) {
        const adminToken = adminLoginResponse.data.token;
        console.log('✅ Admin login successful');

        // Try to delete as admin
        const adminDeleteResponse = await axios.delete(
          `${API_BASE_URL}/profiles/${profile._id}/achievements/${newAchievement._id}`,
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );

        console.log('⚠️ Admin delete unexpectedly succeeded:', adminDeleteResponse.data);
      }
    } catch (adminError) {
      console.log('✅ Admin delete correctly failed:', adminError.response?.data?.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data?.message || error.message);
    console.error('Full error:', error.response?.data || error.message);
  }
};

// Run the debug test
debugAchievementDelete();