import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

// Test achievement system functionality
const testAchievementSystem = async () => {
  console.log('🧪 Testing Achievement System...\n');

  try {
    // First, let's try to login as a student
    console.log('1. Attempting to login as student...');
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

    // Get student's profile
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
    console.log('📊 Current achievements:', profile.achievements?.length || 0);

    // Test adding an achievement
    console.log('\n3. Adding a new achievement...');
    const newAchievement = {
      title: 'Science Fair Winner',
      description: 'Won first place in the school science fair with a project on renewable energy',
      date: new Date().toISOString(),
      category: 'academic'
    };

    const addResponse = await axios.post(
      `${API_BASE_URL}/profiles/${profile._id}/achievements`,
      newAchievement,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!addResponse.data.success) {
      console.log('❌ Add achievement failed:', addResponse.data.message);
      return;
    }

    console.log('✅ Achievement added successfully');
    console.log('📊 New achievements count:', addResponse.data.achievements.length);

    // Get the achievement ID for testing edit/delete
    const achievements = addResponse.data.achievements;
    const latestAchievement = achievements[achievements.length - 1];
    const achievementId = latestAchievement._id;

    // Test updating the achievement
    console.log('\n4. Updating the achievement...');
    const updatedAchievement = {
      title: 'Science Fair Winner - Updated',
      description: 'Won first place in the school science fair with a project on renewable energy and solar panels',
      date: new Date().toISOString(),
      category: 'academic'
    };

    const updateResponse = await axios.put(
      `${API_BASE_URL}/profiles/${profile._id}/achievements/${achievementId}`,
      updatedAchievement,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!updateResponse.data.success) {
      console.log('❌ Update achievement failed:', updateResponse.data.message);
      return;
    }

    console.log('✅ Achievement updated successfully');

    // Test deleting the achievement
    console.log('\n5. Deleting the achievement...');
    const deleteResponse = await axios.delete(
      `${API_BASE_URL}/profiles/${profile._id}/achievements/${achievementId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!deleteResponse.data.success) {
      console.log('❌ Delete achievement failed:', deleteResponse.data.message);
      return;
    }

    console.log('✅ Achievement deleted successfully');
    console.log('📊 Final achievements count:', deleteResponse.data.achievements.length);

    console.log('\n🎉 All achievement system tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data?.message || error.message);
    console.error('Full error:', error.response?.data || error.message);
  }
};

// Run the test
testAchievementSystem();