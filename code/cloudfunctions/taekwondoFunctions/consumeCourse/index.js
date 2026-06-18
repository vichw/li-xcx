// 消课功能
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

/**
 * 消课功能
 * @param {Object} event
 * @param {string} event.studentId - 学生ID
 * @param {string} event.operatorSource - 操作来源：miniprogram/manager
 * @param {string} event.operator - 操作人名称
 * @param {string} event.remark - 备注
 * @param {boolean} event.confirmRepeat - 确认重复消课
 */
exports.main = async (event, context) => {
  const { studentId, operatorSource, operator, remark, confirmRepeat } = event;
  
  try {
    // 1. 获取学生信息
    const studentRes = await db.collection('students').doc(studentId).get();
    if (!studentRes.data) {
      return { success: false, message: '学生信息不存在' };
    }
    
    const student = studentRes.data;
    const membershipType = student.membership_type; // 年卡/按次
    const remainingCount = student.remaining_count || 0;
    // 兼容历史数据：如果 completed_courses 字段不存在，默认为 0
    const completedCourses = (student.completed_courses !== undefined && student.completed_courses !== null) 
      ? student.completed_courses 
      : 0;
    
    // 2. 次卡会员校验剩余次数
    if (membershipType === '按次' && remainingCount <= 0) {
      return { 
        success: false, 
        message: '课时次数不足，请续费',
        code: 'INSUFFICIENT_COUNT'
      };
    }
    
    // 3. 检查当日是否已消课
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    const todayRecords = await db.collection('course_records')
      .where({
        student_id: studentId,
        course_date: todayStr
      })
      .count();
    
    const dailyCount = todayRecords.total || 0;
    
    // 如果当日已消课且未确认，返回提示
    if (dailyCount > 0 && !confirmRepeat) {
      return {
        success: false,
        needConfirm: true,
        dailyCount: dailyCount,
        message: `今日已消课${dailyCount}次，是否继续？`,
        code: 'NEED_CONFIRM'
      };
    }
    
    // 4. 执行消课
    const isDeducted = membershipType === '按次'; // 次卡需要扣减
    const newRemainingCount = isDeducted ? remainingCount - 1 : remainingCount;
    const newCompletedCourses = completedCourses + 1;
    
    // 获取当前时间（转换为中国时区 UTC+8，与数据库服务器时间一致）
    // 数据库服务器使用中国时区（GMT+0800），所以需要确保 course_time 也是中国时区
    const now = new Date();
    // 使用 toLocaleString 转换为中国时区（Asia/Shanghai）的时间字符串
    // 格式：YYYY/MM/DD, HH:mm:ss
    const chinaTimeStr = now.toLocaleString('zh-CN', { 
      timeZone: 'Asia/Shanghai',
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    // 从字符串中提取小时和分钟（格式：2025/12/03, 20:44:35）
    const timeMatch = chinaTimeStr.match(/(\d{2}):(\d{2}):\d{2}/);
    const courseTime = timeMatch 
      ? `${timeMatch[1]}:${timeMatch[2]}` 
      : `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    // 5. 更新学生信息
    const updateData = {
      completed_courses: newCompletedCourses,
      updateTime: db.serverDate()
    };
    
    if (isDeducted) {
      updateData.remaining_count = newRemainingCount;
    }
    
    await db.collection('students').doc(studentId).update({
      data: updateData
    });
    
    // 6. 写入课时消费记录
    const recordData = {
      student_id: studentId,
      student_name: student.name,
      phone_number: student.phoneNumber,
      grade: student.grade,
      course_date: todayStr,
      course_time: courseTime,
      membership_type: membershipType,
      is_deducted: isDeducted,
      remaining_count_before: remainingCount,
      remaining_count_after: newRemainingCount,
      completed_courses_before: completedCourses,
      completed_courses_after: newCompletedCourses,
      operator: operator || (operatorSource === 'miniprogram' ? student.name : '管理员'),
      operator_source: operatorSource || 'miniprogram',
      remark: remark || '',
      create_time: db.serverDate()
    };
    
    await db.collection('course_records').add({
      data: recordData
    });
    
    // 7. 返回结果
    return {
      success: true,
      message: '消课成功',
      data: {
        remaining_count: newRemainingCount,
        completed_courses: newCompletedCourses,
        is_deducted: isDeducted,
        daily_count: dailyCount + 1
      }
    };
    
  } catch (error) {
    console.error('消课失败:', error);
    return {
      success: false,
      message: '消课失败：' + error.message
    };
  }
};

