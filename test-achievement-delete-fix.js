import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

// Test the fixed achievement delete functionality
const testAchievementDeleteFix = async () => {
  console.log('🧪 Testing Achievement Delete Fix...\n');

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

    // Step 2: Get profile
    console.log('\n2. Fetching profile...');
    const profileResponse = await axios.get(`${API_BASE_URL}/profiles/me/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!profileResponse.data.success) {
      console.log('❌ Profile fetch failed:', profileResponse.data.message);
      return;
    }

    const profile = profileResponse.data.profile;
    console.log('✅ Profile fetched:', profile.fullName);
    console.log('📊 Current achievements:', profile.achievements?.length || 0);

    // Step 3: Add a test achievement
    console.log('\n3. Adding test achievement...');
    const testAchievement = {
      title: 'Delete Test Achievement',
      description: 'This achievement will be deleted to test the fix',
      date: new Date().toISOString(),
      category: 'other'
    };

    const addResponse = await axios.post(
      `${API_BASE_URL}/profiles/${profile._id}/achievements`,
      testAchievement,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!addResponse.data.success) {
      console.log('❌ Add failed:', addResponse.data.message);
      return;
    }

    console.log('✅ Achievement added successfully');
    const achievements = addResponse.data.achievements;
    const newAchievement = achievements[achievements.length - 1];
    console.log('🆔 Achievement ID:', newAchievement._id);

    // Step 4: Test delete with detailed logging
    console.log('\n4. Testing delete with fixed implementation...');
    try {
      const deleteResponse = await axios.delete(
        `${API_BASE_URL}/profiles/${profile._id}/achievements/${newAchievement._id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (deleteResponse.data.success) {
        console.log('✅ Delete successful!');
        console.log('📊 Remaining achievements:', deleteResponse.data.achievements.length);
        console.log('🎉 Fix is working correctly!');
      } else {
        console.log('❌ Delete failed:', deleteResponse.data.message);
      }
    } catch (deleteError) {
      console.log('❌ Delete request failed:');
      console.log('Status:', deleteError.response?.status);
      console.log('Message:', deleteError.response?.data?.message);
      console.log('Full response:', deleteError.response?.data);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data?.message || error.message);
  }
};

// Run the test
testAchievementDeleteFix();