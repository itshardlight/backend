import Result from '../models/Result.js';
import Student from '../models/Student.js';
import Attendance from '../models/Attendance.js';

class AIPredictionService {
  constructor() {
    this.performanceThreshold = 60;
    this.minDataPoints = 3;
  }

  randomForestPredict(features) {
    const trees = this.createRandomForestTrees();
    const predictions = [];

    for (const tree of trees) {
      predictions.push(this.predictWithTree(tree, features));
    }

    const goodCount = predictions.filter((p) => p === 'good').length;
    const badCount = predictions.filter((p) => p === 'bad').length;

    const prediction = goodCount > badCount ? 'good' : 'bad';
    const confidence = Math.max(goodCount, badCount) / predictions.length;

    return {
      prediction,
      confidence: Math.round(confidence * 100),
      details: {
        goodVotes: goodCount,
        badVotes: badCount,
        totalTrees: predictions.length
      }
    };
  }

  createRandomForestTrees() {
    return [
      {
        name: 'attendance_performance_tree',
        rules: [
          {
            condition: (f) =>
              f.attendancePercentage >= 85 && f.recentAverage >= 70,
            result: 'good'
          },
          {
            condition: (f) =>
              f.attendancePercentage < 60 || f.recentAverage < 40,
            result: 'bad'
          },
          {
            condition: (f) =>
              f.attendancePercentage >= 75 && f.recentAverage >= 55,
            result: 'good'
          },
          { condition: () => true, result: 'bad' }
        ]
      },
      {
        name: 'trend_consistency_tree',
        rules: [
          {
            condition: (f) =>
              f.trend === 'improving' && f.consistencyScore >= 70,
            result: 'good'
          },
          {
            condition: (f) =>
              f.trend === 'declining' && f.consistencyScore < 50,
            result: 'bad'
          },
          {
            condition: (f) =>
              f.overallAverage >= 65 && f.consistencyScore >= 60,
            result: 'good'
          },
          {
            condition: (f) => f.overallAverage < 45,
            result: 'bad'
          },
          { condition: () => true, result: 'good' }
        ]
      },
      {
        name: 'performance_experience_tree',
        rules: [
          {
            condition: (f) =>
              f.overallAverage >= 75 && f.examCount >= 5,
            result: 'good'
          },
          {
            condition: (f) =>
              f.overallAverage < 50 && f.examCount >= 3,
            result: 'bad'
          },
          {
            condition: (f) =>
              f.recentAverage >= 60 && f.attendancePercentage >= 70,
            result: 'good'
          },
          {
            condition: (f) =>
              f.recentAverage < 45 || f.attendancePercentage < 65,
            result: 'bad'
          },
          { condition: () => true, result: 'good' }
        ]
      },
      {
        name: 'subject_variation_tree',
        rules: [
          {
            condition: (f) =>
              f.subjectVariation < 15 && f.overallAverage >= 60,
            result: 'good'
          },
          {
            condition: (f) =>
              f.subjectVariation > 25 && f.overallAverage < 55,
            result: 'bad'
          },
          {
            condition: (f) =>
              f.bestSubjectScore >= 80 && f.worstSubjectScore >= 50,
            result: 'good'
          },
          {
            condition: (f) => f.worstSubjectScore < 35,
            result: 'bad'
          },
          { condition: () => true, result: 'good' }
        ]
      },
      {
        name: 'recent_patterns_tree',
        rules: [
          {
            condition: (f) =>
              f.recentTrend === 'improving' && f.attendancePercentage >= 80,
            result: 'good'
          },
          {
            condition: (f) =>
              f.recentTrend === 'declining' && f.attendancePercentage < 70,
            result: 'bad'
          },
          {
            condition: (f) => f.recentAverage >= f.overallAverage + 5,
            result: 'good'
          },
          {
            condition: (f) => f.recentAverage < f.overallAverage - 10,
            result: 'bad'
          },
          {
            condition: (f) => f.attendancePercentage >= 75,
            result: 'good'
          },
          { condition: () => true, result: 'bad' }
        ]
      }
    ];
  }

  predictWithTree(tree, features) {
    for (const rule of tree.rules) {
      if (rule.condition(features)) {
        return rule.result;
      }
    }
    return 'good';
  }

  extractFeatures(studentData, results, attendancePercentage) {
    if (!results || results.length === 0) {
      return {
        overallAverage: 50,
        recentAverage: 50,
        attendancePercentage: attendancePercentage ?? 75,
        trend: 'stable',
        recentTrend: 'stable',
        consistencyScore: 50,
        examCount: 0,
        subjectVariation: 20,
        bestSubjectScore: 60,
        worstSubjectScore: 40,
        hasInsufficientData: true
      };
    }

    const safePercentages = results.map((r) => Number(r.percentage) || 0);

    const overallAverage =
      safePercentages.reduce((sum, p) => sum + p, 0) / safePercentages.length;

    const recentResults = results.slice(-3);
    const recentAverage =
      recentResults.reduce((sum, r) => sum + (Number(r.percentage) || 0), 0) /
      recentResults.length;

    const midPoint = Math.floor(results.length / 2);
    const firstHalf = results.slice(0, midPoint);
    const secondHalf = results.slice(midPoint);

    let trend = 'stable';
    let recentTrend = 'stable';

    if (firstHalf.length > 0 && secondHalf.length > 0) {
      const firstAvg =
        firstHalf.reduce((sum, r) => sum + (Number(r.percentage) || 0), 0) /
        firstHalf.length;
      const secondAvg =
        secondHalf.reduce((sum, r) => sum + (Number(r.percentage) || 0), 0) /
        secondHalf.length;

      if (secondAvg > firstAvg + 5) trend = 'improving';
      else if (secondAvg < firstAvg - 5) trend = 'declining';
    }

    if (results.length >= 6) {
      const previousThree = results.slice(-6, -3);
      const lastThree = results.slice(-3);

      const prevAvg =
        previousThree.reduce((sum, r) => sum + (Number(r.percentage) || 0), 0) /
        previousThree.length;
      const lastAvg =
        lastThree.reduce((sum, r) => sum + (Number(r.percentage) || 0), 0) /
        lastThree.length;

      if (lastAvg > prevAvg + 3) recentTrend = 'improving';
      else if (lastAvg < prevAvg - 3) recentTrend = 'declining';
    }

    const variance =
      safePercentages.reduce(
        (sum, p) => sum + Math.pow(p - overallAverage, 2),
        0
      ) / safePercentages.length;
    const stdDev = Math.sqrt(variance);
    const consistencyScore = Math.max(0, 100 - stdDev);

    let subjectScores = [];
    let subjectVariation = 20;
    let bestSubjectScore = overallAverage;
    let worstSubjectScore = overallAverage;

    const recentResultsWithSubjects = results
      .filter((r) => Array.isArray(r.subjects) && r.subjects.length > 0)
      .slice(-3);

    if (recentResultsWithSubjects.length > 0) {
      const subjectMap = {};

      recentResultsWithSubjects.forEach((result) => {
        result.subjects.forEach((subject) => {
          if (
            !subject ||
            !subject.subjectName ||
            !subject.maxMarks ||
            subject.maxMarks <= 0
          ) {
            return;
          }

          if (!subjectMap[subject.subjectName]) {
            subjectMap[subject.subjectName] = [];
          }

          const percentage =
            ((Number(subject.obtainedMarks) || 0) / Number(subject.maxMarks)) *
            100;
          subjectMap[subject.subjectName].push(percentage);
        });
      });

      Object.keys(subjectMap).forEach((subjectName) => {
        const scores = subjectMap[subjectName];
        if (scores.length > 0) {
          const avgScore =
            scores.reduce((sum, score) => sum + score, 0) / scores.length;
          subjectScores.push(avgScore);
        }
      });

      if (subjectScores.length > 1) {
        bestSubjectScore = Math.max(...subjectScores);
        worstSubjectScore = Math.min(...subjectScores);
        subjectVariation = bestSubjectScore - worstSubjectScore;
      } else if (subjectScores.length === 1) {
        bestSubjectScore = subjectScores[0];
        worstSubjectScore = subjectScores[0];
        subjectVariation = 0;
      }
    }

    return {
      overallAverage: Math.round(overallAverage * 100) / 100,
      recentAverage: Math.round(recentAverage * 100) / 100,
      attendancePercentage: attendancePercentage ?? 75,
      trend,
      recentTrend,
      consistencyScore: Math.round(consistencyScore * 100) / 100,
      examCount: results.length,
      subjectVariation: Math.round(subjectVariation * 100) / 100,
      bestSubjectScore: Math.round(bestSubjectScore * 100) / 100,
      worstSubjectScore: Math.round(worstSubjectScore * 100) / 100,
      hasInsufficientData: results.length < this.minDataPoints
    };
  }

  async predictStudentPerformance(studentId) {
    try {
      console.log(`Starting Random Forest prediction for student: ${studentId}`);

      const student = await Student.findById(studentId);
      if (!student) {
        throw new Error('Student not found');
      }

      console.log(`Found student: ${student.firstName} ${student.lastName}`);

      const results = await Result.find({
        studentId,
        status: { $in: ['published', 'verified', 'locked'] }
      }).sort({ createdAt: 1 });

      const attendancePercentage = await this.calculateAttendancePercentage(studentId);
      console.log(`Attendance percentage: ${attendancePercentage}`);

      const features = this.extractFeatures(student, results, attendancePercentage);
      console.log('Extracted features:', features);

      const rfPrediction = this.randomForestPredict(features);
      console.log('Random Forest prediction:', rfPrediction);

      const willPerformWell = rfPrediction.prediction === 'good';

      let predictedMarks = willPerformWell
        ? Math.max(65, features.recentAverage + 5)
        : Math.min(55, features.recentAverage - 5);

      predictedMarks = Math.max(0, Math.min(100, predictedMarks));

      let predictedGrade;
      if (predictedMarks >= 90) predictedGrade = 'A+';
      else if (predictedMarks >= 80) predictedGrade = 'A';
      else if (predictedMarks >= 70) predictedGrade = 'B+';
      else if (predictedMarks >= 60) predictedGrade = 'B';
      else if (predictedMarks >= 50) predictedGrade = 'C+';
      else if (predictedMarks >= 40) predictedGrade = 'C';
      else if (predictedMarks >= 33) predictedGrade = 'D';
      else predictedGrade = 'F';

      const riskLevel = willPerformWell ? 'low' : 'high';
      const recommendations = this.generateRandomForestRecommendations(
        features,
        rfPrediction
      );

      console.log(
        `Random Forest prediction successful for student ${studentId}: ${rfPrediction.prediction} (${rfPrediction.confidence}% confidence)`
      );

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
          nextExamPerformance: rfPrediction.prediction,
          confidence: rfPrediction.confidence,
          predictedMarks: Math.round(predictedMarks * 100) / 100,
          predictedGrade,
          riskLevel,
          recommendations,
          modelType: 'Random Forest'
        },
        features,
        randomForestDetails: rfPrediction.details,
        analysisDate: new Date(),
        dataPoints: results.length
      };
    } catch (error) {
      console.error(`Error in Random Forest prediction for ${studentId}:`, error);
      throw new Error(`Error predicting student performance: ${error.message}`);
    }
  }

  generateRandomForestRecommendations(features, rfPrediction) {
    const recommendations = [];

    if (rfPrediction.prediction === 'bad') {
      recommendations.push(
        `⚠️ Random Forest predicts poor performance in next exam (${rfPrediction.confidence}% confidence)`
      );
      recommendations.push('Immediate intervention recommended');
    } else {
      recommendations.push(
        `✅ Random Forest predicts good performance in next exam (${rfPrediction.confidence}% confidence)`
      );
      recommendations.push('Continue current study approach');
    }

    if (features.attendancePercentage < 75) {
      recommendations.push(
        `📅 Improve attendance (currently ${features.attendancePercentage.toFixed(1)}%)`
      );
    }

    if (
      features.trend === 'declining' ||
      features.recentTrend === 'declining'
    ) {
      recommendations.push('📉 Address declining performance trend');
    }

    if (features.consistencyScore < 60) {
      recommendations.push('🎯 Work on maintaining consistent performance');
    }

    if (features.subjectVariation > 20) {
      recommendations.push(
        `📚 Focus on weaker subjects (${features.subjectVariation.toFixed(1)}% variation between subjects)`
      );
    }

    if (features.recentAverage < features.overallAverage - 5) {
      recommendations.push(
        '📈 Recent performance below average - review study methods'
      );
    }

    if (features.hasInsufficientData) {
      recommendations.push(
        '📊 Limited exam data available - prediction based on attendance and defaults'
      );
    }

    if (features.trend === 'improving') {
      recommendations.push('🚀 Great improvement trend - keep it up!');
    }

    if (features.attendancePercentage >= 85) {
      recommendations.push('👏 Excellent attendance - maintain this discipline');
    }

    return recommendations.slice(0, 6);
  }

  async calculateAttendancePercentage(studentId) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 365);

      const attendanceSummary = await Attendance.getStudentSummary(
        studentId,
        startDate,
        endDate
      );

      return attendanceSummary?.percentage ?? 0;
    } catch (error) {
      console.error(
        'Error calculating attendance for student',
        studentId,
        ':',
        error.message
      );
      return 75;
    }
  }

  async calculateAveragePastMarks(studentId) {
    try {
      console.log(`Calculating average marks for student: ${studentId}`);

      const results = await Result.find({
        studentId,
        status: { $in: ['published', 'verified', 'locked'] }
      }).sort({ createdAt: 1 });

      console.log(`Found ${results.length} results for student ${studentId}`);

      if (results.length === 0) {
        console.log(`No results found for student ${studentId}`);
        return null;
      }

      const totalPercentage = results.reduce((sum, result) => {
        console.log(`Result: ${result.percentage}% (${result.examType})`);
        return sum + (Number(result.percentage) || 0);
      }, 0);

      const average = totalPercentage / results.length;
      console.log(`Average marks for student ${studentId}: ${average}%`);

      return average;
    } catch (error) {
      console.error(
        'Error calculating average marks for student',
        studentId,
        ':',
        error.message
      );
      return null;
    }
  }

  async predictStudentMarks(studentId) {
    return await this.predictStudentPerformance(studentId);
  }

  generateRecommendations(predictedMarks, averagePastMarks, attendancePercentage) {
    const recommendations = [];

    if (predictedMarks < 40) {
      recommendations.push(
        'Immediate intervention required - student at high risk of failure'
      );
      recommendations.push('Schedule one-on-one tutoring sessions');
      recommendations.push('Contact parents/guardians for support meeting');
    } else if (predictedMarks < 60) {
      recommendations.push('Additional support needed to improve performance');
      recommendations.push('Consider group study sessions or peer tutoring');
    }

    if (attendancePercentage < 75) {
      recommendations.push(
        `Attendance is low (${attendancePercentage.toFixed(1)}%) - focus on improving attendance`
      );
      recommendations.push('Investigate reasons for poor attendance');
      recommendations.push('Implement attendance monitoring system');
    } else if (attendancePercentage < 85) {
      recommendations.push(
        `Attendance needs improvement (${attendancePercentage.toFixed(1)}%) for better performance`
      );
    }

    if (averagePastMarks < 50) {
      recommendations.push('Focus on strengthening fundamental concepts');
      recommendations.push('Provide additional practice materials');
    } else if (averagePastMarks < 70) {
      recommendations.push('Work on improving exam techniques and time management');
    }

    if (predictedMarks >= 80) {
      recommendations.push(
        'Excellent predicted performance - maintain current study habits'
      );
      recommendations.push('Consider advanced learning opportunities');
    } else if (predictedMarks >= 70) {
      recommendations.push(
        'Good predicted performance - small improvements can lead to excellence'
      );
    }

    return recommendations;
  }

  async analyzeAllStudents(filters = {}) {
    try {
      const { class: className, section, limit = 100 } = filters;

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

      if (students.length === 0) {
        return analysis;
      }

      for (const student of students) {
        try {
          const prediction = await this.predictStudentPerformance(student._id);

          if (prediction.success) {
            analysis.analyzedStudents++;

            const studentAnalysis = {
              student: prediction.student,
              prediction: prediction.prediction,
              features: prediction.features,
              randomForestDetails: prediction.randomForestDetails
            };

            if (
              prediction.prediction.nextExamPerformance === 'bad' ||
              prediction.prediction.riskLevel === 'high'
            ) {
              analysis.weakStudents.push(studentAnalysis);
              analysis.summary.highRisk++;
            } else if (prediction.prediction.confidence < 70) {
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
            analysis.summary.noData++;
          }
        } catch (error) {
          console.error(`Error analyzing student ${student._id}:`, error.message);
          analysis.summary.noData++;
        }
      }

      analysis.weakStudents.sort(
        (a, b) => a.prediction.confidence - b.prediction.confidence
      );

      analysis.atRiskStudents.sort(
        (a, b) => a.prediction.confidence - b.prediction.confidence
      );

      return analysis;
    } catch (error) {
      console.error('Error in analyzeAllStudents:', error);
      throw new Error(`Error analyzing students: ${error.message}`);
    }
  }

  async getClassInsights(className, section) {
    try {
      const analysis = await this.analyzeAllStudents({
        class: className,
        section
      });

      const insights = {
        classInfo: { class: className, section },
        totalStudents: analysis.totalStudents,
        riskDistribution: analysis.summary,
        topConcerns: [],
        recommendations: [],
        modelType: 'Random Forest',
        analysisDate: new Date()
      };

      const badPerformancePredictions = analysis.weakStudents.length;
      const totalAnalyzed = analysis.analyzedStudents;

      if (totalAnalyzed > 0 && badPerformancePredictions > totalAnalyzed * 0.3) {
        insights.topConcerns.push(
          `${badPerformancePredictions} students predicted to perform poorly in next exam`
        );
        insights.recommendations.push(
          'Implement immediate class-wide intervention'
        );
      }

      if (analysis.totalStudents > 0 && analysis.summary.noData > analysis.totalStudents * 0.2) {
        insights.topConcerns.push('Insufficient data for many students');
        insights.recommendations.push(
          'Ensure regular assessment and data collection'
        );
      }

      const studentsWithPredictions = [
        ...analysis.weakStudents,
        ...analysis.atRiskStudents,
        ...analysis.averagePerformers,
        ...analysis.strongPerformers
      ];

      if (studentsWithPredictions.length > 0) {
        const avgConfidence =
          studentsWithPredictions.reduce((sum, student) => {
            return sum + (student.prediction?.confidence || 0);
          }, 0) / studentsWithPredictions.length;

        if (avgConfidence < 60) {
          insights.topConcerns.push(
            'Low prediction confidence due to insufficient historical data'
          );
          insights.recommendations.push(
            'Collect more assessment data to improve prediction accuracy'
          );
        }

        insights.averageConfidence = Math.round(avgConfidence);
      }

      if (badPerformancePredictions > 0) {
        insights.recommendations.push(
          `Focus on ${badPerformancePredictions} students predicted to struggle`
        );
      }

      if (analysis.summary.mediumRisk > 0) {
        insights.recommendations.push(
          `Monitor ${analysis.summary.mediumRisk} students with uncertain predictions`
        );
      }

      return insights;
    } catch (error) {
      throw new Error(`Error generating class insights: ${error.message}`);
    }
  }
}

export default new AIPredictionService();