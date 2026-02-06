import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Student from '../models/Student.js';
import User from '../models/User.js';
import Profile from '../models/Profile.js';

dotenv.config();

const linkStudentsToProfiles = async () => {
  try {
    console.log('🔗 Starting student-profile linking process...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all students
    const students = await Student.find();
    console.log(`📊 Found ${students.length} students`);

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const student of students) {
      try {
        // Check if student has a userId
        if (!student.userId) {
          console.log(`⚠️  Student ${student.rollNumber} has no userId - skipping`);
          skipped++;
          continue;
        }

        // Check if profile already exists
        const existingProfile = await Profile.findOne({ userId: student.userId });
        if (existingProfile) {
          console.log(`✓ Profile already exists for ${student.rollNumber}`);
          skipped++;
          continue;
        }

        // Get user account
        const user = await User.findById(student.userId);
        if (!user) {
          console.log(`⚠️  User account not found for student ${student.rollNumber}`);
          skipped++;
          continue;
        }

        // Create profile
        const profile = new Profile({
          userId: student.userId,
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
            zipCode: student.zipCode,
            country: "Nepal"
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
          feeInfo: {
            totalFee: 0,
            paidAmount: 0,
            pendingAmount: 0,
            paymentStatus: 'pending'
          },
          achievements: [],
          createdBy: student.userId
        });

        await profile.save();
        console.log(`✅ Created profile for ${student.rollNumber} (${student.firstName} ${student.lastName})`);
        created++;

        // Create parent account if parent email exists and no account exists
        if (student.parentEmail) {
          const existingParent = await User.findOne({ email: student.parentEmail });
          if (!existingParent) {
            const parentPassword = `parent@${student.rollNumber}`;
            const parentUser = new User({
              username: `parent_${student.rollNumber}`,
              email: student.parentEmail,
              password: parentPassword,
              fullName: student.parentName,
              role: "parent",
              isVerified: true,
              requirePasswordChange: true
            });
            await parentUser.save();
            console.log(`  ✅ Created parent account for ${student.parentEmail}`);
          }
        }

      } catch (error) {
        console.error(`❌ Error processing student ${student.rollNumber}:`, error.message);
        errors++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`  ✅ Profiles created: ${created}`);
    console.log(`  ⏭️  Skipped: ${skipped}`);
    console.log(`  ❌ Errors: ${errors}`);
    console.log('\n✅ Migration completed!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
};

linkStudentsToProfiles();
