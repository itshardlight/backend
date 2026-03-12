import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import Timetable from '../models/Timetable.js';
import User from '../models/User.js';

dotenv.config();

const testTimetable = async () => {
  try {
    await connectDB();
    console.log('Connected to database');

    // Find a teacher user
    const teacher = await User.findOne({ role: 'teacher' });
    if (!teacher) {
      console.log('No teacher found in database');
      return;
    }

    console.log('Found teacher:', teacher.fullName);

    // Test creating a timetable entry
    const testEntry = new Timetable({
      class: '1',
      section: 'A',
      dayOfWeek: 'monday',
      period: '1',
      subject: 'Mathematics',
      teacherId: teacher._id,
      teacherName: teacher.fullName,
      startTime: '09:00',
      endTime: '09:45',
      room: 'Room 101',
      createdBy: teacher._id
    });

    await testEntry.save();
    console.log('Test timetable entry created successfully:', testEntry);

    // Clean up
    await Timetable.deleteOne({ _id: testEntry._id });
    console.log('Test entry cleaned up');

    process.exit(0);
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
};

testTimetable();