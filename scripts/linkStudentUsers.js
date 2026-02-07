import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Student from '../models/Student.js';
import User from '../models/User.js';

dotenv.config();

const linkStudentUsers = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Find all students without userId
    const studentsWithoutUserId = await Student.find({ 
      $or: [
        { userId: null },
        { userId: { $exists: false } }
      ]
    });

    console.log(`Found ${studentsWithoutUserId.length} students without userId`);

    let linked = 0;
    let notFound = 0;

    for (const student of studentsWithoutUserId) {
      // Try to find user by email
      const user = await User.findOne({ email: student.email });
      
      if (user) {
        student.userId = user._id;
        await student.save();
        console.log(`✓ Linked student ${student.firstName} ${student.lastName} (${student.email}) to user ${user.username}`);
        linked++;
      } else {
        console.log(`✗ No user found for student ${student.firstName} ${student.lastName} (${student.email})`);
        notFound++;
      }
    }

    console.log('\n=== Summary ===');
    console.log(`Total students processed: ${studentsWithoutUserId.length}`);
    console.log(`Successfully linked: ${linked}`);
    console.log(`Not found: ${notFound}`);

    // Disconnect
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

linkStudentUsers();
