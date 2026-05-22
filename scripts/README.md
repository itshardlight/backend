# Database Seeding Scripts

This directory contains scripts to populate your database with dummy data for testing and development.

## Available Scripts

### 1. Seed Dummy Data
Populates the database with comprehensive dummy data including:
- **450 Students** (15 students per section × 3 sections × 10 classes)
- **Student User Accounts** (login credentials for each student)
- **Exam Results** (5 different exam types per student)
- **Attendance Records** (90 days of attendance for each student)

```bash
npm run seed
```

**What it creates:**
- Students across all classes (1-10) and sections (A, B, C)
- Realistic performance levels: excellent, good, average, below average, poor
- Varied attendance patterns: excellent, good, average, poor
- Complete exam results for:
  - Unit Test 1 (April)
  - Unit Test 2 (June)
  - Mid Term (August)
  - Unit Test 1 - Second Cycle (October)
  - Final Term (December)
- Subject-wise marks based on class level
- 90 days of attendance records (excluding weekends)

**Student Login Credentials:**
- Email format: `[firstname].[lastname][number]@student.school.com`
- Password: `student123`
- Example: `aarav.sharma1@student.school.com` / `student123`

### 2. Clear Dummy Data
Removes all student-related data from the database.

```bash
npm run clear-data
```

**What it deletes:**
- All student records
- All student user accounts
- All exam results
- All attendance records

**What it preserves:**
- Admin accounts
- Teacher accounts
- System configurations

⚠️ **WARNING:** This action cannot be undone! You will be prompted for confirmation.

## Data Structure

### Students by Class
Each class (1-10) has 3 sections (A, B, C) with 15 students each.

**Total:** 450 students

### Subjects by Class Level

**Classes 1-3:**
- English, Mathematics, Hindi, EVS (4 subjects)

**Classes 4-5:**
- English, Mathematics, Hindi, Science, Social Studies (5 subjects)

**Classes 6-10:**
- English, Mathematics, Hindi, Science, Social Studies, Computer Science (6 subjects)

### Performance Levels
Students are randomly assigned performance levels:
- **Excellent:** 85-98% marks
- **Good:** 70-84% marks
- **Average:** 50-69% marks
- **Below Average:** 35-49% marks
- **Poor:** 20-34% marks

### Attendance Patterns
Students are randomly assigned attendance patterns:
- **Excellent:** ~95% present, ~3% late, ~2% absent
- **Good:** ~85% present, ~7% late, ~8% absent
- **Average:** ~75% present, ~10% late, ~15% absent
- **Poor:** ~60% present, ~10% late, ~30% absent

## Usage Examples

### First Time Setup
```bash
# 1. Make sure your MongoDB is running
# 2. Seed the database
npm run seed

# 3. Login with any student account
# Email: aarav.sharma1@student.school.com
# Password: student123
```

### Reset and Reseed
```bash
# 1. Clear existing data
npm run clear-data

# 2. Seed fresh data
npm run seed
```

### Testing Different Scenarios
The seeded data includes students with various performance and attendance patterns, allowing you to test:
- High performers with excellent attendance
- Average students with irregular attendance
- Struggling students who need intervention
- Complete academic year data with multiple exams
- Realistic attendance tracking over 90 days

## Notes

1. **Exam Dates:** Results are dated appropriately throughout the academic year (April to December 2024)

2. **Roll Numbers:** Follow the format `[Class][Section][Number]`
   - Example: `1A001`, `5B012`, `10C015`

3. **Academic Year:** All data is for the 2024-25 academic year

4. **Realistic Variation:** Each student has consistent but varied performance across subjects and exams

5. **Weekend Exclusion:** Attendance records automatically skip Saturdays and Sundays

## Troubleshooting

### Script fails to run
- Ensure MongoDB is running
- Check your `.env` file has correct `MONGO_URI`
- Verify you're in the backend directory

### Duplicate key errors
- Run `npm run clear-data` first to remove existing data
- Or manually delete conflicting records from MongoDB

### Out of memory errors
- The script processes data in batches
- If issues persist, reduce `studentsPerSection` in the script

## Customization

To modify the seeding behavior, edit `seedDummyData.js`:

- **Change student count:** Modify `studentsPerSection` variable
- **Add/remove subjects:** Edit `subjectsByClass` object
- **Adjust performance ranges:** Modify `generateMarks()` function
- **Change attendance patterns:** Edit `generateAttendanceStatus()` function
- **Add more exam types:** Update `examTypes` array

## Support

For issues or questions, check:
1. MongoDB connection is active
2. All dependencies are installed (`npm install`)
3. Environment variables are properly configured
4. You have sufficient disk space for the data
