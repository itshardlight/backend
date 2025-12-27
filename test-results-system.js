import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = 'http://localhost:5000/api';

// Test data
const testData = {
  teacher: {
    username: 'teacher1',
    email: 'teacher1@school.com',
    password: 'password123',
    fullName: 'John Teacher',
    role: 'teacher'
  },
  student: {
    firstName: 'Alice',
    lastName: 'Johnson',
    dateOfBirth: '2005-05-15',
    gender: 'female',
    email: 'alice.johnson@student.com',
    phone: '1234567890',
    address: '123 Main St',
    city: 'Anytown',
    state: 'State',
    zipCode: '12345',
    class: '10',
    section: 'A',
    rollNumber: 'R001',
    admissionDate: '2023-04-01',
    parentName: 'Robert Johnson',
    parentPhone: '0987654321',
    emergencyContact: '0987654321'
  },
  result: {
    examType: 'mid_term',
    examName: 'Mid Term Examination 2024',
    academicYear: '2024-25',
    subjects: [
      {
        subjectName: 'Mathematics',
        subjectCode: 'MATH',
        maxMarks: 100,
        obtainedMarks: 85,
        remarks: 'Good performance'
      },
      {
        subjectName: 'Science',
        subjectCode: 'SCI',
        maxMarks: 100,
        obtainedMarks: 78,
        remarks: 'Needs improvement in physics'
      },
      {
        subjectName: 'English',
        subjectCode: 'ENG',
        maxMarks: 100,
        obtainedMarks: 92,
        remarks: 'Excellent writing skills'
      }
    ],
    remarks: 'Overall good performance with room for improvement in science',
    attendance: 95
  }
};

let teacherToken = '';
let studentId = '';
let resultId = '';

async function testResultsSystem() {
  console.log('🧪 Starting Results Management System Test...\n');

  try {
    // Step 1: Create and authenticate teacher
    console.log('1️⃣ Creating teacher account...');
    try {
      await axios.post(`${BASE_URL}/auth/register`, testData.teacher);
      console.log('✅ Teacher account created successfully');
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.message?.includes('already exists')) {
        console.log('ℹ️ Teacher account already exists, proceeding with login');
      } else {
        throw error;
      }
    }

    // Login teacher
    console.log('🔐 Logging in teacher...');
    const teacherLogin = await axios.post(`${BASE_URL}/auth/login`, {
      email: testData.teacher.email,
      password: testData.teacher.password
    });
    teacherToken = teacherLogin.data.token;
    console.log('✅ Teacher logged in successfully');

    // Step 2: Create test student
    console.log('\n2️⃣ Creating test student...');
    try {
      const studentResponse = await axios.post(`${BASE_URL}/students`, testData.student, {
        headers: { Authorization: `Bearer ${teacherToken}` }
      });
      studentId = studentResponse.data.data._id;
      console.log('✅ Student created successfully');
      console.log(`   Student ID: ${studentId}`);
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.message?.includes('already exists')) {
        console.log('ℹ️ Student already exists, fetching existing student...');
        const studentsResponse = await axios.get(`${BASE_URL}/students?rollNumber=${testData.student.rollNumber}`, {
          headers: { Authorization: `Bearer ${teacherToken}` }
        });
        if (studentsResponse.data.data.length > 0) {
          studentId = studentsResponse.data.data[0]._id;
          console.log(`✅ Found existing student with ID: ${studentId}`);
        } else {
          throw new Error('Student exists but could not be found');
        }
      } else {
        throw error;
      }
    }

    // Step 3: Test bulk entry endpoint
    console.log('\n3️⃣ Testing bulk entry endpoint...');
    const bulkEntryResponse = await axios.get(
      `${BASE_URL}/results/bulk-entry/${testData.student.class}/${testData.student.section}?examType=${testData.result.examType}&academicYear=${testData.result.academicYear}`,
      { headers: { Authorization: `Bearer ${teacherToken}` } }
    );
    console.log('✅ Bulk entry endpoint working');
    console.log(`   Found ${bulkEntryResponse.data.data.length} students in class ${testData.student.class}-${testData.student.section}`);

    // Step 4: Create result
    console.log('\n4️⃣ Creating student result...');
    const resultData = {
      ...testData.result,
      studentId: studentId
    };

    const createResultResponse = await axios.post(`${BASE_URL}/results`, resultData, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    resultId = createResultResponse.data.data._id;
    console.log('✅ Result created successfully');
    console.log(`   Result ID: ${resultId}`);
    console.log(`   Total Marks: ${createResultResponse.data.data.totalObtainedMarks}/${createResultResponse.data.data.totalMaxMarks}`);
    console.log(`   Percentage: ${createResultResponse.data.data.percentage}%`);
    console.log(`   Grade: ${createResultResponse.data.data.overallGrade}`);
    console.log(`   Result: ${createResultResponse.data.data.result.toUpperCase()}`);

    // Step 5: Test fetching results
    console.log('\n5️⃣ Testing result retrieval...');
    
    // Get all results
    const allResultsResponse = await axios.get(`${BASE_URL}/results`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    console.log(`✅ Retrieved ${allResultsResponse.data.data.length} results`);

    // Get results for specific student
    const studentResultsResponse = await axios.get(`${BASE_URL}/results/student/${studentId}`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    console.log(`✅ Retrieved ${studentResultsResponse.data.data.length} results for student`);

    // Get results for class-section
    const classResultsResponse = await axios.get(
      `${BASE_URL}/results/class/${testData.student.class}/section/${testData.student.section}`,
      { headers: { Authorization: `Bearer ${teacherToken}` } }
    );
    console.log(`✅ Retrieved ${classResultsResponse.data.data.length} results for class ${testData.student.class}-${testData.student.section}`);

    // Step 6: Test result update
    console.log('\n6️⃣ Testing result update...');
    const updateData = {
      subjects: [
        {
          subjectName: 'Mathematics',
          subjectCode: 'MATH',
          maxMarks: 100,
          obtainedMarks: 90, // Updated marks
          remarks: 'Improved performance'
        },
        {
          subjectName: 'Science',
          subjectCode: 'SCI',
          maxMarks: 100,
          obtainedMarks: 82, // Updated marks
          remarks: 'Better understanding of concepts'
        },
        {
          subjectName: 'English',
          subjectCode: 'ENG',
          maxMarks: 100,
          obtainedMarks: 92,
          remarks: 'Excellent writing skills'
        }
      ],
      remarks: 'Significant improvement shown'
    };

    const updateResponse = await axios.put(`${BASE_URL}/results/${resultId}`, updateData, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    console.log('✅ Result updated successfully');
    console.log(`   New Total: ${updateResponse.data.data.totalObtainedMarks}/${updateResponse.data.data.totalMaxMarks}`);
    console.log(`   New Percentage: ${updateResponse.data.data.percentage}%`);
    console.log(`   New Grade: ${updateResponse.data.data.overallGrade}`);

    // Step 7: Test result publishing
    console.log('\n7️⃣ Testing result publishing...');
    const publishResponse = await axios.post(`${BASE_URL}/results/${resultId}/publish`, {}, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    console.log('✅ Result published successfully');
    console.log(`   Status: ${publishResponse.data.data.status.toUpperCase()}`);

    // Step 8: Test analytics
    console.log('\n8️⃣ Testing class analytics...');
    const analyticsResponse = await axios.get(
      `${BASE_URL}/results/analytics/class/${testData.student.class}/section/${testData.student.section}?examType=${testData.result.examType}&academicYear=${testData.result.academicYear}`,
      { headers: { Authorization: `Bearer ${teacherToken}` } }
    );
    console.log('✅ Analytics retrieved successfully');
    console.log(`   Total Students: ${analyticsResponse.data.data.totalStudents}`);
    console.log(`   Class Average: ${analyticsResponse.data.data.averagePercentage}%`);
    console.log(`   Pass Count: ${analyticsResponse.data.data.passCount}`);
    console.log(`   Fail Count: ${analyticsResponse.data.data.failCount}`);

    // Step 9: Test duplicate prevention
    console.log('\n9️⃣ Testing duplicate result prevention...');
    try {
      await axios.post(`${BASE_URL}/results`, resultData, {
        headers: { Authorization: `Bearer ${teacherToken}` }
      });
      console.log('❌ Duplicate prevention failed - should not reach here');
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.message?.includes('already exists')) {
        console.log('✅ Duplicate prevention working correctly');
      } else {
        throw error;
      }
    }

    // Step 10: Test access control (try to delete published result)
    console.log('\n🔟 Testing access control...');
    try {
      await axios.delete(`${BASE_URL}/results/${resultId}`, {
        headers: { Authorization: `Bearer ${teacherToken}` }
      });
      console.log('❌ Access control failed - published result should not be deletable');
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.message?.includes('Only draft results can be deleted')) {
        console.log('✅ Access control working correctly - published results cannot be deleted');
      } else {
        throw error;
      }
    }

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📊 Test Summary:');
    console.log('✅ Teacher authentication');
    console.log('✅ Student creation');
    console.log('✅ Bulk entry functionality');
    console.log('✅ Result creation with auto-calculations');
    console.log('✅ Result retrieval (all, by student, by class)');
    console.log('✅ Result updates');
    console.log('✅ Result publishing');
    console.log('✅ Class analytics');
    console.log('✅ Duplicate prevention');
    console.log('✅ Access control');

  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testResultsSystem();