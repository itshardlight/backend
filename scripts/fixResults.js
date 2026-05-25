import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Result from '../models/Result.js';
import connectDB from '../config/db.js';

dotenv.config();

const fixResults = async () => {
  try {
    console.log('🔧 Starting results fix...\n');
    
    await connectDB();
    console.log('✅ Connected to database\n');
    
    // Get all results
    const results = await Result.find({});
    console.log(`📊 Found ${results.length} results to fix\n`);
    
    let fixed = 0;
    let errors = 0;
    
    for (const result of results) {
      try {
        // Re-save each result to trigger pre-save middleware
        // This will recalculate totals, percentages, and grades
        await result.save();
        fixed++;
        
        if (fixed % 100 === 0) {
          process.stdout.write(`  ✓ Fixed ${fixed}/${results.length} results\r`);
        }
      } catch (error) {
        console.error(`\n  ❌ Error fixing result ${result._id}:`, error.message);
        errors++;
      }
    }
    
    console.log(`\n\n✅ Results fix completed!`);
    console.log(`   • Fixed: ${fixed}`);
    console.log(`   • Errors: ${errors}`);
    
    // Verify the fix
    console.log('\n📊 Verification:\n');
    
    const sampleResults = await Result.find({}).limit(3);
    sampleResults.forEach((r, i) => {
      console.log(`Result ${i+1}:`);
      console.log('  Status:', r.status);
      console.log('  Result:', r.result);
      console.log('  Percentage:', r.percentage + '%');
      console.log('  Overall Grade:', r.overallGrade);
      console.log('  Total Marks:', r.totalObtainedMarks, '/', r.totalMaxMarks);
      console.log('');
    });
    
    // Get result distribution
    const resultCounts = await Result.aggregate([
      { $group: { _id: '$result', count: { $sum: 1 } } }
    ]);
    
    console.log('Result Distribution:');
    resultCounts.forEach(r => console.log(`  ${r._id}: ${r.count}`));
    
    console.log('\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

fixResults();
