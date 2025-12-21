import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000/api';

const testProfileAPI = async () => {
  try {
    console.log("🧪 Testing Profile API for Manish...\n");

    // Step 1: Login as Manish
    console.log("1. Logging in as Manish...");
    const loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'manish',
        password: 'manish@11A891'
      })
    });

    const loginData = await loginResponse.json();

    if (!loginData.success) {
      console.log("❌ Login failed:", loginData.message);
      return;
    }

    const token = loginData.token;
    const user = loginData.user;
    console.log("✅ Login successful!");
    console.log(`   User: ${user.username} (${user.role})`);
    console.log(`   Token: ${token.substring(0, 20)}...`);

    // Step 2: Get profile
    console.log("\n2. Fetching profile...");
    const profileResponse = await fetch(`${API_URL}/profiles/me/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const profileData = await profileResponse.json();

    if (!profileData.success) {
      console.log("❌ Profile fetch failed:", profileData.message);
      return;
    }

    const profile = profileData.profile;
    console.log("✅ Profile fetched successfully!");
    console.log(`   Name: ${profile.fullName}`);
    console.log(`   Roll Number: ${profile.academic?.rollNumber}`);
    console.log(`   Class: ${profile.currentClass}`);
    console.log(`   Achievements: ${profile.achievements?.length || 0}`);

    // Step 3: Add an achievement
    console.log("\n3. Adding a test achievement...");
    const achievementData = {
      title: "Scout Training Certificate",
      description: "Completed basic scout training program",
      date: new Date().toISOString().split('T')[0],
      category: "other"
    };

    const achievementResponse = await fetch(
      `${API_URL}/profiles/${profile._id}/achievements`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(achievementData)
      }
    );

    const achievementResult = await achievementResponse.json();

    if (!achievementResult.success) {
      console.log("❌ Achievement add failed:", achievementResult.message);
      return;
    }

    console.log("✅ Achievement added successfully!");
    console.log(`   Title: ${achievementData.title}`);
    console.log(`   Category: ${achievementData.category}`);

    // Step 4: Fetch updated profile
    console.log("\n4. Fetching updated profile...");
    const updatedProfileResponse = await fetch(`${API_URL}/profiles/me/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const updatedProfileData = await updatedProfileResponse.json();
    const updatedProfile = updatedProfileData.profile;
    console.log("✅ Updated profile fetched!");
    console.log(`   Achievements: ${updatedProfile.achievements?.length || 0}`);
    
    if (updatedProfile.achievements && updatedProfile.achievements.length > 0) {
      console.log("\n🏆 ACHIEVEMENTS:");
      updatedProfile.achievements.forEach((achievement, index) => {
        console.log(`   ${index + 1}. ${achievement.title} (${achievement.category})`);
        console.log(`      Date: ${new Date(achievement.date).toLocaleDateString()}`);
        if (achievement.description) {
          console.log(`      Description: ${achievement.description}`);
        }
      });
    }

    console.log("\n🎉 All tests passed! Manish can now:");
    console.log("   ✅ Login with username: manish, password: manish@11A891");
    console.log("   ✅ View his profile");
    console.log("   ✅ Add achievements");
    console.log("   ✅ See updated achievements");

  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
};

testProfileAPI();