import axios from 'axios';
import Result from '../models/Result.js';
import Student from '../models/Student.js';
import Attendance from '../models/Attendance.js';

class AIPredictionService {
  constructor() {
    // Hugging Face API configuration
    this.hfApiKey = process.env.HUGGING_FACE_API_KEY;
    this.hfApiUrl = 'https://api-inference.huggingface.co/models';
    
    // Different HF models for different tasks
    this.models = {
      textGeneration: 'microsoft/DialoGPT-medium',
      sentimentAnalysis: 'cardiffnlp/twitter-roberta-base-sentiment-latest',
      textClassification: 'facebook/bart-large-mnli',
      summarization: 'facebook/bart-large-cnn',
      questionAnswering: 'deepset/roberta-base-squad2'
    };
    
    // Initialize axios instance for HF API calls
    this.hfClient = axios.create({
      baseURL: this.hfApiUrl,
      headers: {
        'Authorization': `Bearer ${this.hfApiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    });
  }

  // Helper method to call Hugging Face API
  async callHuggingFaceAPI(modelName, payload, retries = 3) {
    try {
      const response = await this.hfClient.post(`/${modelName}`, payload);
      return response.data;
    } catch (error) {
      if (error.response?.status === 503 && retries > 0) {
        // Model is loading, wait and retry
        console.log(`Model ${modelName} is loading, retrying in 5 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        return this.callHuggingFaceAPI(modelName, payload, retries - 1);
      }
      
      console.error(`Hugging Face API error for ${modelName}:`, error.response?.data || error.message);
      throw new Error(`Hugging Face API error: ${error.response?.data?.error || error.message}`);
    }
  }

  // Generate AI-powered recommendations using Hugging Face
  async generateAIRecommendations(studentData, performanceData) {
    if (!this.hfApiKey) {
      console.log('Hugging Face API key not configured, using rule-based recommendations');
      return this.generateRecommendations(
        performanceData.predictedMarks || performanceData.averagePercentage,
        performanceData.averagePastMarks || performanceData.averagePercentage,
        performanceData.attendancePercentage || 75
      );
    }

    try {
      // Create a context for the AI model
      const context = `
Student Performance Analysis:
- Name: ${studentData.name}
- Class: ${studentData.class} ${studentData.section}
- Average Performance: ${performanceData.averagePercentage || performanceData.predictedMarks}%
- Attendance: ${performanceData.attendancePercentage || 'N/A'}%
- Trend: ${performanceData.trend || 'stable'}
- Risk Level: ${performanceData.riskLevel || 'medium'}
- Consistency Score: ${performanceData.consistencyScore || 'N/A'}

Generate specific, actionable recommendations for this student to improve their academic performance.
      `.trim();

      // Use text generation to create personalized recommendations
      const response = await this.callHuggingFaceAPI(this.models.textGeneration, {
        inputs: context,
        parameters: {
          max_length: 200,
          temperature: 0.7,
          do_sample: true,
          top_p: 0.9
        }
      });

      // Parse and format the AI response
      let aiRecommendations = [];
      if (response && response[0] && response[0].generated_text) {
        const generatedText = response[0].generated_text.replace(context, '').trim();
        aiRecommendations = generatedText.split('\n')
          .filter(line => line.trim().length > 0)
          .map(line => line.trim().replace(/^[-•*]\s*/, ''))
          .slice(0, 5); // Limit to 5 recommendations
      }

      // Fallback to rule-based if AI doesn't generate good recommendations
      if (aiRecommendations.length === 0) {
        aiRecommendations = this.generateRecommendations(
          performanceData.predictedMarks || performanceData.averagePercentage,
          performanceData.averagePastMarks || performanceData.averagePercentage,
          performanceData.attendancePercentage || 75
        );
      }

      return aiRecommendations;
    } catch (error) {
      console.error('Error generating AI recommendations:', error.message);
      // Fallback to rule-based recommendations
      return this.generateRecommendations(
        performanceData.predictedMarks || performanceData.averagePercentage,
        performanceData.averagePastMarks || performanceData.averagePercentage,
        performanceData.attendancePercentage || 75
      );
    }
  }

  // Analyze student feedback/comments using sentiment analysis
  async analyzeFeedbackSentiment(feedbackText) {
    if (!this.hfApiKey || !feedbackText) {
      return { sentiment: 'neutral', confidence: 0.5 };
    }

    try {
      const response = await this.callHuggingFaceAPI(this.models.sentimentAnalysis, {
        inputs: feedbackText
      });

      if (response && response[0] && response[0].length > 0) {
        const result = response[0][0];
        return {
          sentiment: result.label.toLowerCase(),
          confidence: result.score
        };
      }

      return { sentiment: 'neutral', confidence: 0.5 };
    } catch (error) {
      console.error('Error analyzing sentiment:', error.message);
      return { sentiment: 'neutral', confidence: 0.5 };
    }
  }

  // Generate detailed performance summary using AI
  async generatePerformanceSummary(studentData, performanceData) {
    if (!this.hfApiKey) {
      return `${studentData.name} has an average performance of ${performanceData.averagePercentage || performanceData.predictedMarks}% with ${performanceData.riskLevel || 'medium'} risk level.`;
    }

    try {
      const context = `
Summarize the academic performance of ${studentData.name}:
- Class: ${studentData.class} ${studentData.section}
- Average Performance: ${performanceData.averagePercentage || performanceData.predictedMarks}%
- Attendance: ${performanceData.attendancePercentage || 'N/A'}%
- Performance Trend: ${performanceData.trend || 'stable'}
- Risk Level: ${performanceData.riskLevel || 'medium'}
- Consistency: ${performanceData.consistencyScore || 'N/A'}

Provide a concise, professional summary in 2-3 sentences.
      `.trim();

      const response = await this.callHuggingFaceAPI(this.models.summarization, {
        inputs: context,
        parameters: {
          max_length: 100,
          min_length: 30
        }
      });

      if (response && response[0] && response[0].summary_text) {
        return response[0].summary_text;
      }

      // Fallback summary
      return `${studentData.name} demonstrates ${performanceData.averagePercentage || performanceData.predictedMarks}% average performance with a ${performanceData.trend || 'stable'} trend and ${performanceData.riskLevel || 'medium'} risk level.`;
    } catch (error) {
      console.error('Error generating performance summary:', error.message);
      return `${studentData.name} has an average performance of ${performanceData.averagePercentage || performanceData.predictedMarks}% with ${performanceData.riskLevel || 'medium'} risk level.`;
    }
  }

  // Advanced prediction using Hugging Face (experimental)
  async generateAdvancedPrediction(studentData, performanceData) {
    if (!this.hfApiKey) {
      return null; // Fall back to existing prediction method
    }

    try {
      // Create a detailed prompt for the AI model
      const prompt = `
Based on the following student data, predict the likelihood of academic success:

Student Profile:
- Current Average: ${performanceData.averagePercentage || performanceData.predictedMarks}%
- Attendance Rate: ${performanceData.attendancePercentage || 75}%
- Performance Trend: ${performanceData.trend || 'stable'}
- Consistency Score: ${performanceData.consistencyScore || 70}
- Number of Exams: ${performanceData.numberOfExams || 0}

Question: What is the predicted performance category for this student?
Options: Excellent (90-100%), Good (70-89%), Average (50-69%), Poor (below 50%)
      `.trim();

      const response = await this.callHuggingFaceAPI(this.models.questionAnswering, {
        inputs: {
          question: "What is the predicted performance category for this student?",
          context: prompt
        }
      });

      if (response && response.answer) {
        return {
          aiPrediction: response.answer,
          confidence: response.score || 0.5,
          source: 'huggingface'
        };
      }

      return null;
    } catch (error) {
      console.error('Error generating advanced prediction:', error.message);
      return null;
    }
  }
  async calculateAttendancePercentage(studentId) {
    try {
      // Get attendance data for the current academic year (last 365 days)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 365);

      const attendanceSummary = await Attendance.getStudentSummary(
        studentId, 
        startDate, 
        endDate
      );

      return attendanceSummary.percentage || 0;
    } catch (error) {
      console.error('Error calculating attendance for student', studentId, ':', error.message);
      return 75; // Default attendance percentage if calculation fails
    }
  }

  // Calculate average past marks for a student
  async calculateAveragePastMarks(studentId) {
    try {
      console.log(`Calculating average marks for student: ${studentId}`);
      
      const results = await Result.find({ 
        studentId: studentId,
        status: { $in: ['published', 'verified', 'locked'] }
      }).sort({ createdAt: 1 });

      console.log(`Found ${results.length} results for student ${studentId}`);

      if (results.length === 0) {
        console.log(`No results found for student ${studentId}`);
        return null;
      }

      const totalPercentage = results.reduce((sum, result) => {
        console.log(`Result: ${result.percentage}% (${result.examType})`);
        return sum + (result.percentage || 0);
      }, 0);
      
      const average = totalPercentage / results.length;
      console.log(`Average marks for student ${studentId}: ${average}%`);
      
      return average;
    } catch (error) {
      console.error('Error calculating average marks for student', studentId, ':', error.message);
      return null;
    }
  }

  // Predict student marks using the formula: Predicted Marks = (0.7 × Average Past Marks) + (0.3 × Attendance %)
  async predictStudentMarks(studentId) {
    try {
      console.log(`Starting prediction for student: ${studentId}`);
      
      const student = await Student.findById(studentId);
      if (!student) {
        throw new Error('Student not found');
      }

      console.log(`Found student: ${student.firstName} ${student.lastName}`);

      // Get average past marks
      const averagePastMarks = await this.calculateAveragePastMarks(studentId);
      console.log(`Average past marks: ${averagePastMarks}`);
      
      // Get attendance percentage
      const attendancePercentage = await this.calculateAttendancePercentage(studentId);
      console.log(`Attendance percentage: ${attendancePercentage}`);

      if (averagePastMarks === null) {
        console.log(`No exam results found for student ${studentId}, using default prediction based on attendance only`);
        
        // If no past marks, use attendance-based prediction with a base score
        const baseScore = 50; // Assume average baseline performance
        const predictedMarks = (0.3 * baseScore) + (0.7 * attendancePercentage); // Give more weight to attendance when no results
        
        let predictedGrade;
        if (predictedMarks >= 90) predictedGrade = 'A+';
        else if (predictedMarks >= 80) predictedGrade = 'A';
        else if (predictedMarks >= 70) predictedGrade = 'B+';
        else if (predictedMarks >= 60) predictedGrade = 'B';
        else if (predictedMarks >= 50) predictedGrade = 'C+';
        else if (predictedMarks >= 40) predictedGrade = 'C';
        else if (predictedMarks >= 33) predictedGrade = 'D';
        else predictedGrade = 'F';

        let riskLevel;
        if (predictedMarks < 40) riskLevel = 'high';
        else if (predictedMarks < 60) riskLevel = 'medium';
        else riskLevel = 'low';

        return {
          success: true,
          student: {
            id: student._id,
            name: `${student.firstName} ${student.lastName}`,
            class: student.class,
            section: student.section,
            rollNumber: student.rollNumber
          },
          prediction: {
            predictedMarks: Math.round(predictedMarks * 100) / 100,
            predictedGrade: predictedGrade,
            riskLevel: riskLevel,
            confidence: 40, // Lower confidence without exam data
            recommendations: [
              'No past exam results available',
              'Prediction based on attendance only',
              'Need to take exams to improve prediction accuracy',
              attendancePercentage < 75 ? 'Improve attendance for better performance' : 'Good attendance - maintain it'
            ]
          },
          dataUsed: {
            averagePastMarks: null, // Use null instead of string for consistency
            attendancePercentage: Math.round(attendancePercentage * 100) / 100,
            numberOfExams: 0,
            formula: 'Predicted Marks = (0.3 × Base Score) + (0.7 × Attendance %) [No exam data available]'
          },
          calculationBreakdown: {
            pastMarksContribution: 'No exam data',
            attendanceContribution: Math.round((0.7 * attendancePercentage) * 100) / 100,
            baseScoreContribution: Math.round((0.3 * baseScore) * 100) / 100,
            totalPrediction: Math.round(predictedMarks * 100) / 100
          }
        };
      }

      // Apply the prediction formula: Predicted Marks = (0.7 × Average Past Marks) + (0.3 × Attendance %)
      const predictedMarks = (0.7 * averagePastMarks) + (0.3 * attendancePercentage);
      console.log(`Predicted marks: ${predictedMarks}`);

      // Determine predicted grade based on predicted marks
      let predictedGrade;
      if (predictedMarks >= 90) predictedGrade = 'A+';
      else if (predictedMarks >= 80) predictedGrade = 'A';
      else if (predictedMarks >= 70) predictedGrade = 'B+';
      else if (predictedMarks >= 60) predictedGrade = 'B';
      else if (predictedMarks >= 50) predictedGrade = 'C+';
      else if (predictedMarks >= 40) predictedGrade = 'C';
      else if (predictedMarks >= 33) predictedGrade = 'D';
      else predictedGrade = 'F';

      // Determine risk level
      let riskLevel;
      if (predictedMarks < 40) riskLevel = 'high';
      else if (predictedMarks < 60) riskLevel = 'medium';
      else riskLevel = 'low';

      // Generate recommendations based on prediction
      const recommendations = this.generateRecommendations(predictedMarks, averagePastMarks, attendancePercentage);

      // Calculate confidence based on data availability
      const resultsCount = await Result.countDocuments({ 
        studentId: studentId,
        status: { $in: ['published', 'verified', 'locked'] }
      });
      const confidence = Math.min(95, Math.max(60, 60 + (resultsCount * 5))); // Higher confidence with more data

      console.log(`Prediction successful for student ${studentId}: ${predictedMarks}% (${predictedGrade})`);

      return {
        success: true,
        student: {
          id: student._id,
          name: `${student.firstName} ${student.lastName}`,
          class: student.class,
          section: student.section,
          rollNumber: student.rollNumber
        },
        prediction: {
          predictedMarks: Math.round(predictedMarks * 100) / 100,
          predictedGrade: predictedGrade,
          riskLevel: riskLevel,
          confidence: confidence,
          recommendations: recommendations
        },
        dataUsed: {
          averagePastMarks: Math.round(averagePastMarks * 100) / 100,
          attendancePercentage: Math.round(attendancePercentage * 100) / 100,
          numberOfExams: resultsCount,
          formula: 'Predicted Marks = (0.7 × Average Past Marks) + (0.3 × Attendance %)'
        },
        calculationBreakdown: {
          pastMarksContribution: Math.round((0.7 * averagePastMarks) * 100) / 100,
          attendanceContribution: Math.round((0.3 * attendancePercentage) * 100) / 100,
          totalPrediction: Math.round(predictedMarks * 100) / 100
        }
      };
    } catch (error) {
      console.error(`Error predicting student marks for ${studentId}:`, error);
      throw new Error(`Error predicting student marks: ${error.message}`);
    }
  }

  // Generate recommendations based on prediction components
  generateRecommendations(predictedMarks, averagePastMarks, attendancePercentage) {
    const recommendations = [];

    // Recommendations based on predicted performance
    if (predictedMarks < 40) {
      recommendations.push('Immediate intervention required - student at high risk of failure');
      recommendations.push('Schedule one-on-one tutoring sessions');
      recommendations.push('Contact parents/guardians for support meeting');
    } else if (predictedMarks < 60) {
      recommendations.push('Additional support needed to improve performance');
      recommendations.push('Consider group study sessions or peer tutoring');
    }

    // Attendance-specific recommendations
    if (attendancePercentage < 75) {
      recommendations.push(`Attendance is low (${attendancePercentage.toFixed(1)}%) - focus on improving attendance`);
      recommendations.push('Investigate reasons for poor attendance');
      recommendations.push('Implement attendance monitoring system');
    } else if (attendancePercentage < 85) {
      recommendations.push(`Attendance needs improvement (${attendancePercentage.toFixed(1)}%) for better performance`);
    }

    // Academic performance recommendations
    if (averagePastMarks < 50) {
      recommendations.push('Focus on strengthening fundamental concepts');
      recommendations.push('Provide additional practice materials');
    } else if (averagePastMarks < 70) {
      recommendations.push('Work on improving exam techniques and time management');
    }

    // Positive reinforcement for good performers
    if (predictedMarks >= 80) {
      recommendations.push('Excellent predicted performance - maintain current study habits');
      recommendations.push('Consider advanced learning opportunities');
    } else if (predictedMarks >= 70) {
      recommendations.push('Good predicted performance - small improvements can lead to excellence');
    }

    return recommendations;
  }

  // Prepare student data for AI analysis
  async prepareStudentData(studentId) {
    try {
      const student = await Student.findById(studentId);
      if (!student) {
        throw new Error('Student not found');
      }

      // Get all results for the student
      const results = await Result.find({ 
        studentId: studentId,
        status: { $in: ['published', 'verified', 'locked'] }
      }).sort({ createdAt: 1 });

      if (results.length === 0) {
        return {
          student,
          hasData: false,
          message: 'No academic data available for prediction'
        };
      }

      // Calculate performance metrics
      const performanceData = this.calculatePerformanceMetrics(results);
      
      return {
        student,
        hasData: true,
        results,
        performanceData
      };
    } catch (error) {
      throw new Error(`Error preparing student data: ${error.message}`);
    }
  }

  // Calculate performance metrics from results
  calculatePerformanceMetrics(results) {
    const metrics = {
      averagePercentage: 0,
      trend: 'stable', // improving, declining, stable
      consistencyScore: 0,
      subjectPerformance: {},
      examTypePerformance: {},
      recentPerformance: 0,
      overallGradeDistribution: {}
    };

    if (results.length === 0) return metrics;

    // Calculate average percentage
    const totalPercentage = results.reduce((sum, result) => sum + result.percentage, 0);
    metrics.averagePercentage = Math.round((totalPercentage / results.length) * 100) / 100;

    // Calculate trend (comparing first half vs second half)
    const midPoint = Math.floor(results.length / 2);
    const firstHalf = results.slice(0, midPoint);
    const secondHalf = results.slice(midPoint);

    if (firstHalf.length > 0 && secondHalf.length > 0) {
      const firstHalfAvg = firstHalf.reduce((sum, r) => sum + r.percentage, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((sum, r) => sum + r.percentage, 0) / secondHalf.length;
      
      const difference = secondHalfAvg - firstHalfAvg;
      if (difference > 5) metrics.trend = 'improving';
      else if (difference < -5) metrics.trend = 'declining';
      else metrics.trend = 'stable';
    }

    // Calculate consistency score (lower standard deviation = higher consistency)
    const percentages = results.map(r => r.percentage);
    const mean = metrics.averagePercentage;
    const variance = percentages.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / percentages.length;
    const stdDev = Math.sqrt(variance);
    metrics.consistencyScore = Math.max(0, 100 - stdDev); // Higher score = more consistent

    // Subject performance analysis
    const subjectMap = {};
    results.forEach(result => {
      result.subjects.forEach(subject => {
        if (!subjectMap[subject.subjectName]) {
          subjectMap[subject.subjectName] = {
            totalMarks: 0,
            totalMaxMarks: 0,
            count: 0,
            grades: []
          };
        }
        subjectMap[subject.subjectName].totalMarks += subject.obtainedMarks;
        subjectMap[subject.subjectName].totalMaxMarks += subject.maxMarks;
        subjectMap[subject.subjectName].count += 1;
        subjectMap[subject.subjectName].grades.push(subject.grade);
      });
    });

    Object.keys(subjectMap).forEach(subjectName => {
      const subject = subjectMap[subjectName];
      metrics.subjectPerformance[subjectName] = {
        averagePercentage: Math.round((subject.totalMarks / subject.totalMaxMarks) * 100 * 100) / 100,
        examCount: subject.count,
        mostCommonGrade: this.getMostCommonGrade(subject.grades)
      };
    });

    // Exam type performance
    const examTypeMap = {};
    results.forEach(result => {
      if (!examTypeMap[result.examType]) {
        examTypeMap[result.examType] = {
          totalPercentage: 0,
          count: 0
        };
      }
      examTypeMap[result.examType].totalPercentage += result.percentage;
      examTypeMap[result.examType].count += 1;
    });

    Object.keys(examTypeMap).forEach(examType => {
      const exam = examTypeMap[examType];
      metrics.examTypePerformance[examType] = Math.round((exam.totalPercentage / exam.count) * 100) / 100;
    });

    // Recent performance (last 3 results)
    const recentResults = results.slice(-3);
    if (recentResults.length > 0) {
      const recentTotal = recentResults.reduce((sum, r) => sum + r.percentage, 0);
      metrics.recentPerformance = Math.round((recentTotal / recentResults.length) * 100) / 100;
    }

    // Grade distribution
    const gradeMap = {};
    results.forEach(result => {
      gradeMap[result.overallGrade] = (gradeMap[result.overallGrade] || 0) + 1;
    });
    metrics.overallGradeDistribution = gradeMap;

    return metrics;
  }

  // Get most common grade from array
  getMostCommonGrade(grades) {
    const gradeCount = {};
    grades.forEach(grade => {
      gradeCount[grade] = (gradeCount[grade] || 0) + 1;
    });
    
    return Object.keys(gradeCount).reduce((a, b) => 
      gradeCount[a] > gradeCount[b] ? a : b
    );
  }

  // Generate AI prediction using rule-based system (fallback if Hugging Face fails)
  generateRuleBasedPrediction(performanceData) {
    const { averagePercentage, trend, consistencyScore, recentPerformance, subjectPerformance } = performanceData;
    
    let prediction = {
      predictedGrade: 'C',
      confidence: 0,
      riskLevel: 'medium',
      recommendations: [],
      futurePerformance: {
        nextExamPrediction: averagePercentage,
        semesterPrediction: averagePercentage,
        yearEndPrediction: averagePercentage
      }
    };

    // Predict grade based on average performance
    if (averagePercentage >= 90) prediction.predictedGrade = 'A+';
    else if (averagePercentage >= 80) prediction.predictedGrade = 'A';
    else if (averagePercentage >= 70) prediction.predictedGrade = 'B+';
    else if (averagePercentage >= 60) prediction.predictedGrade = 'B';
    else if (averagePercentage >= 50) prediction.predictedGrade = 'C+';
    else if (averagePercentage >= 40) prediction.predictedGrade = 'C';
    else if (averagePercentage >= 33) prediction.predictedGrade = 'D';
    else prediction.predictedGrade = 'F';

    // Calculate confidence based on consistency
    prediction.confidence = Math.min(95, Math.max(50, consistencyScore));

    // Determine risk level
    if (averagePercentage < 40 || trend === 'declining') {
      prediction.riskLevel = 'high';
    } else if (averagePercentage < 60 || consistencyScore < 70) {
      prediction.riskLevel = 'medium';
    } else {
      prediction.riskLevel = 'low';
    }

    // Generate recommendations
    if (prediction.riskLevel === 'high') {
      prediction.recommendations.push('Immediate intervention required');
      prediction.recommendations.push('Consider additional tutoring sessions');
      prediction.recommendations.push('Focus on fundamental concepts');
    }

    if (trend === 'declining') {
      prediction.recommendations.push('Performance is declining - investigate causes');
      prediction.recommendations.push('Increase study time and focus');
    }

    // Find weak subjects
    const weakSubjects = Object.keys(subjectPerformance).filter(
      subject => subjectPerformance[subject].averagePercentage < 50
    );

    if (weakSubjects.length > 0) {
      prediction.recommendations.push(`Focus on weak subjects: ${weakSubjects.join(', ')}`);
    }

    if (consistencyScore < 60) {
      prediction.recommendations.push('Work on maintaining consistent performance');
    }

    // Predict future performance based on trend
    let trendMultiplier = 1;
    if (trend === 'improving') trendMultiplier = 1.05;
    else if (trend === 'declining') trendMultiplier = 0.95;

    prediction.futurePerformance.nextExamPrediction = Math.min(100, Math.max(0, 
      Math.round(recentPerformance * trendMultiplier * 100) / 100
    ));
    
    prediction.futurePerformance.semesterPrediction = Math.min(100, Math.max(0,
      Math.round(averagePercentage * trendMultiplier * 100) / 100
    ));
    
    prediction.futurePerformance.yearEndPrediction = Math.min(100, Math.max(0,
      Math.round(averagePercentage * Math.pow(trendMultiplier, 2) * 100) / 100
    ));

    return prediction;
  }

  // Generate AI prediction for a single student using the new formula + Hugging Face
  async predictStudentPerformance(studentId) {
    try {
      // Use the new prediction method with the specified formula
      const prediction = await this.predictStudentMarks(studentId);
      
      if (!prediction.success) {
        return prediction;
      }

      // Add additional analysis for compatibility with existing UI
      const results = await Result.find({ 
        studentId: studentId,
        status: { $in: ['published', 'verified', 'locked'] }
      }).sort({ createdAt: 1 });

      let performanceData = null;
      if (results.length > 0) {
        performanceData = this.calculatePerformanceMetrics(results);
      }

      // Enhance with Hugging Face AI capabilities
      const enhancedData = {
        ...performanceData,
        predictedMarks: prediction.prediction.predictedMarks,
        riskLevel: prediction.prediction.riskLevel,
        attendancePercentage: prediction.dataUsed.attendancePercentage,
        averagePastMarks: prediction.dataUsed.averagePastMarks,
        numberOfExams: prediction.dataUsed.numberOfExams
      };

      // Generate AI-powered recommendations
      const aiRecommendations = await this.generateAIRecommendations(
        prediction.student,
        enhancedData
      );

      // Generate performance summary
      const performanceSummary = await this.generatePerformanceSummary(
        prediction.student,
        enhancedData
      );

      // Try to get advanced AI prediction
      const advancedPrediction = await this.generateAdvancedPrediction(
        prediction.student,
        enhancedData
      );

      return {
        success: true,
        student: prediction.student,
        prediction: {
          ...prediction.prediction,
          recommendations: aiRecommendations, // Use AI-generated recommendations
          performanceSummary: performanceSummary, // Add AI summary
          advancedPrediction: advancedPrediction, // Add advanced AI insights
          futurePerformance: {
            nextExamPrediction: prediction.prediction.predictedMarks,
            semesterPrediction: prediction.prediction.predictedMarks,
            yearEndPrediction: prediction.prediction.predictedMarks
          }
        },
        performanceData: performanceData,
        dataUsed: prediction.dataUsed,
        calculationBreakdown: prediction.calculationBreakdown,
        analysisDate: new Date(),
        dataPoints: results.length,
        aiEnhanced: true, // Flag to indicate AI enhancement
        huggingFaceEnabled: !!this.hfApiKey
      };
    } catch (error) {
      throw new Error(`Error generating prediction: ${error.message}`);
    }
  }

  // Analyze all students and categorize using the new prediction formula
  async analyzeAllStudents(filters = {}) {
    try {
      const { class: className, section, limit = 100 } = filters;
      
      // Build student filter
      const studentFilter = { status: 'active' };
      if (className) studentFilter.class = className;
      if (section) studentFilter.section = section;

      const students = await Student.find(studentFilter).limit(limit);
      
      const analysis = {
        totalStudents: students.length,
        analyzedStudents: 0,
        weakStudents: [],
        atRiskStudents: [],
        averagePerformers: [],
        strongPerformers: [],
        summary: {
          highRisk: 0,
          mediumRisk: 0,
          lowRisk: 0,
          noData: 0
        }
      };

      // If no students found, return empty analysis
      if (students.length === 0) {
        return analysis;
      }

      // Analyze each student using the new prediction formula
      for (const student of students) {
        try {
          const prediction = await this.predictStudentMarks(student._id);
          
          if (prediction.success) {
            analysis.analyzedStudents++;
            
            const studentAnalysis = {
              student: prediction.student,
              prediction: prediction.prediction,
              dataUsed: prediction.dataUsed,
              calculationBreakdown: prediction.calculationBreakdown,
              performanceData: {
                averagePercentage: prediction.dataUsed.averagePastMarks !== null ? 
                  prediction.dataUsed.averagePastMarks : 
                  prediction.prediction.predictedMarks,
                trend: 'stable', // Default for new formula
                consistencyScore: prediction.prediction.confidence
              }
            };

            // Categorize students based on predicted marks and risk level
            if (prediction.prediction.riskLevel === 'high' || prediction.prediction.predictedMarks < 40) {
              analysis.weakStudents.push(studentAnalysis);
              analysis.summary.highRisk++;
            } else if (prediction.prediction.riskLevel === 'medium' || prediction.prediction.predictedMarks < 60) {
              analysis.atRiskStudents.push(studentAnalysis);
              analysis.summary.mediumRisk++;
            } else if (prediction.prediction.predictedMarks < 80) {
              analysis.averagePerformers.push(studentAnalysis);
              analysis.summary.lowRisk++;
            } else {
              analysis.strongPerformers.push(studentAnalysis);
              analysis.summary.lowRisk++;
            }
          } else {
            // Student has no data for prediction
            analysis.summary.noData++;
          }
        } catch (error) {
          console.error(`Error analyzing student ${student._id}:`, error.message);
          analysis.summary.noData++;
        }
      }

      // Sort categories by predicted marks (worst first for intervention)
      analysis.weakStudents.sort((a, b) => 
        a.prediction.predictedMarks - b.prediction.predictedMarks
      );
      
      analysis.atRiskStudents.sort((a, b) => 
        a.prediction.predictedMarks - b.prediction.predictedMarks
      );

      return analysis;
    } catch (error) {
      console.error('Error in analyzeAllStudents:', error);
      throw new Error(`Error analyzing students: ${error.message}`);
    }
  }

  // Get class-wise performance insights with AI enhancement
  async getClassInsights(className, section) {
    try {
      const analysis = await this.analyzeAllStudents({ class: className, section });
      
      const insights = {
        classInfo: { class: className, section },
        totalStudents: analysis.totalStudents,
        riskDistribution: analysis.summary,
        topConcerns: [],
        recommendations: [],
        subjectAnalysis: {},
        aiInsights: null // Will be populated if HF is available
      };

      // Identify top concerns
      if (analysis.summary.highRisk > analysis.totalStudents * 0.3) {
        insights.topConcerns.push('High number of at-risk students');
        insights.recommendations.push('Implement class-wide intervention program');
      }

      if (analysis.summary.noData > analysis.totalStudents * 0.2) {
        insights.topConcerns.push('Insufficient data for many students');
        insights.recommendations.push('Ensure regular assessment and data collection');
      }

      // Calculate average predicted marks for the class
      const studentsWithPredictions = [...analysis.weakStudents, ...analysis.atRiskStudents, ...analysis.averagePerformers, ...analysis.strongPerformers];
      if (studentsWithPredictions.length > 0) {
        const totalPredictedMarks = studentsWithPredictions.reduce((sum, student) => {
          return sum + (student.prediction?.predictedMarks || student.performanceData?.averagePercentage || 0);
        }, 0);
        const averagePredictedMarks = totalPredictedMarks / studentsWithPredictions.length;
        
        if (averagePredictedMarks < 50) {
          insights.topConcerns.push('Class average predicted performance is below 50%');
          insights.recommendations.push('Implement comprehensive class improvement strategy');
        }

        // Generate AI-powered class insights if HF is available
        if (this.hfApiKey) {
          try {
            const classContext = `
Class Performance Analysis for ${className} ${section}:
- Total Students: ${analysis.totalStudents}
- High Risk Students: ${analysis.summary.highRisk}
- Medium Risk Students: ${analysis.summary.mediumRisk}
- Low Risk Students: ${analysis.summary.lowRisk}
- Average Class Performance: ${averagePredictedMarks.toFixed(1)}%
- Students with No Data: ${analysis.summary.noData}

Generate strategic recommendations for improving overall class performance.
            `.trim();

            const aiInsights = await this.callHuggingFaceAPI(this.models.textGeneration, {
              inputs: classContext,
              parameters: {
                max_length: 150,
                temperature: 0.6,
                do_sample: true
              }
            });

            if (aiInsights && aiInsights[0] && aiInsights[0].generated_text) {
              const generatedInsights = aiInsights[0].generated_text.replace(classContext, '').trim();
              insights.aiInsights = generatedInsights;
            }
          } catch (error) {
            console.error('Error generating AI class insights:', error.message);
          }
        }
      }

      // Add general recommendations based on risk distribution
      if (analysis.summary.highRisk > 0) {
        insights.recommendations.push(`${analysis.summary.highRisk} students need immediate intervention`);
      }
      
      if (analysis.summary.mediumRisk > 0) {
        insights.recommendations.push(`${analysis.summary.mediumRisk} students need additional support`);
      }

      return insights;
    } catch (error) {
      throw new Error(`Error generating class insights: ${error.message}`);
    }
  }

  // New method: Analyze student feedback using Hugging Face
  async analyzeStudentFeedback(feedbackText, studentId) {
    if (!this.hfApiKey) {
      return {
        success: false,
        message: 'Hugging Face API not configured'
      };
    }

    try {
      // Analyze sentiment
      const sentiment = await this.analyzeFeedbackSentiment(feedbackText);
      
      // Extract key themes using text classification
      const themes = await this.callHuggingFaceAPI(this.models.textClassification, {
        inputs: feedbackText,
        parameters: {
          candidate_labels: [
            "academic difficulty",
            "motivation issues", 
            "time management",
            "subject confusion",
            "positive feedback",
            "improvement needed"
          ]
        }
      });

      return {
        success: true,
        studentId,
        sentiment,
        themes: themes.labels ? themes.labels.slice(0, 3) : [],
        analysis: {
          feedbackText,
          analyzedAt: new Date(),
          confidence: sentiment.confidence
        }
      };
    } catch (error) {
      console.error('Error analyzing student feedback:', error.message);
      return {
        success: false,
        message: error.message
      };
    }
  }

  // New method: Generate personalized study plan using AI
  async generateStudyPlan(studentId, targetGrade = 'B+') {
    if (!this.hfApiKey) {
      return {
        success: false,
        message: 'Hugging Face API not configured'
      };
    }

    try {
      const prediction = await this.predictStudentMarks(studentId);
      if (!prediction.success) {
        throw new Error('Could not generate prediction for study plan');
      }

      const prompt = `
Create a personalized study plan for a student with the following profile:
- Current Performance: ${prediction.prediction.predictedMarks}%
- Current Grade: ${prediction.prediction.predictedGrade}
- Target Grade: ${targetGrade}
- Risk Level: ${prediction.prediction.riskLevel}
- Attendance: ${prediction.dataUsed.attendancePercentage}%

Generate a structured 4-week study plan with specific daily activities and goals.
      `.trim();

      const response = await this.callHuggingFaceAPI(this.models.textGeneration, {
        inputs: prompt,
        parameters: {
          max_length: 300,
          temperature: 0.7,
          do_sample: true
        }
      });

      let studyPlan = "Default study plan: Focus on weak subjects, improve attendance, and practice regularly.";
      
      if (response && response[0] && response[0].generated_text) {
        studyPlan = response[0].generated_text.replace(prompt, '').trim();
      }

      return {
        success: true,
        studentId,
        targetGrade,
        currentPerformance: prediction.prediction.predictedMarks,
        studyPlan,
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('Error generating study plan:', error.message);
      return {
        success: false,
        message: error.message
      };
    }
  }
}

export default new AIPredictionService();