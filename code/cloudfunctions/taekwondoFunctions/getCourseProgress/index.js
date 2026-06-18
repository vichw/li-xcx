// 获取课时进度
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

/**
 * 获取课时进度
 * @param {Object} event
 * @param {string} event.studentId - 学生ID
 */
exports.main = async (event, context) => {
  const { studentId } = event;
  
  try {
    if (!studentId) {
      return { success: false, message: '学生ID不能为空' };
    }
    
    // 1. 获取学生信息
    const studentRes = await db.collection('students').doc(studentId).get();
    if (!studentRes.data) {
      return { success: false, message: '学生信息不存在' };
    }
    
    const student = studentRes.data;
    const currentGrade = student.grade;
    // 兼容历史数据：如果 completed_courses 字段不存在，默认为 0
    const completedCourses = (student.completed_courses !== undefined && student.completed_courses !== null) 
      ? student.completed_courses 
      : 0;
    
    // 2. 获取当前等级配置
    const gradeConfigRes = await db.collection('configs')
      .where({
        type: 'belt_level',
        name: currentGrade
      })
      .get();
    
    if (!gradeConfigRes.data || gradeConfigRes.data.length === 0) {
      return { 
        success: false, 
        message: '未找到当前等级配置信息' 
      };
    }
    
    const gradeConfig = gradeConfigRes.data[0];
    const requiredCourses = gradeConfig.courses || 0; // 升级所需课时
    const currentIndex = gradeConfig.index;
    
    // 3. 获取下一等级信息
    const nextGradeRes = await db.collection('configs')
      .where({
        type: 'belt_level',
        index: currentIndex + 1
      })
      .get();
    
    const nextGrade = nextGradeRes.data && nextGradeRes.data.length > 0 
      ? nextGradeRes.data[0] 
      : null;
    
    // 4. 计算进度
    const progress = requiredCourses > 0 
      ? Math.min(Math.round((completedCourses / requiredCourses) * 100), 100)
      : 0;
    
    const canApplyExam = completedCourses >= requiredCourses;
    const remainingCourses = Math.max(0, requiredCourses - completedCourses);
    
    // 5. 获取今日消课次数
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    const todayCountRes = await db.collection('course_records')
      .where({
        student_id: studentId,
        course_date: todayStr
      })
      .count();
    
    return {
      success: true,
      data: {
        current_grade: currentGrade,
        current_index: currentIndex,
        next_grade: nextGrade ? nextGrade.name : null,
        next_grade_fee: nextGrade ? nextGrade.value : 0,
        completed_courses: completedCourses,
        required_courses: requiredCourses,
        remaining_courses: remainingCourses,
        progress: progress,
        can_apply_exam: canApplyExam,
        today_count: todayCountRes.total || 0,
        membership_type: student.membership_type,
        remaining_count: student.remaining_count || 0
      }
    };
    
  } catch (error) {
    console.error('获取课时进度失败:', error);
    return {
      success: false,
      message: '获取课时进度失败：' + error.message
    };
  }
};

