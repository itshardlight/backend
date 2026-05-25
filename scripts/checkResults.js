import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Result from '../models/Result.js';
import connectDB from '../config/db.js';

dotenv.config();

const checkResults = async () => {
  try {
    await connectDB();
    console.log('✅ Connected to database\n');
    
    // Get sample results
    const sampleResults = await Result.find({}).limit(5);
    
    console.log('📊 Sample Results:\n');
    sampleResults.forEach((r, i) => {
      console.log(`Result ${i+1}:`);
      console.log('  Status:', r.status);
      console.log('  Result:', r.result);
      console.log('  Exam Type:', r.examType);
      console.log('  Percentage:', r.percentage);
      console.log('  Overall Grade:', r.overallGrade);
      console.log('  Total Marks:', r.totalObtainedMarks, '/', r.totalMaxMarks);
      console.log('');
    });
    
    // Get status distribution
    const statusCounts = await Result.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    console.log('Status Distribution:');
    statusCounts.forEach(s => console.log(`  ${s._id}: ${s.count}`));
    
    console.log('\n');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkResults();
