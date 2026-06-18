// 获取课时消费记录
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

/**
 * 获取课时消费记录
 * @param {Object} event
 * @param {string} event.studentId - 学生ID
 * @param {number} event.page - 页码，从1开始
 * @param {number} event.pageSize - 每页条数，默认20
 */
exports.main = async (event, context) => {
  const { studentId, page = 1, pageSize = 20 } = event;
  
  try {
    if (!studentId) {
      return { success: false, message: '学生ID不能为空' };
    }
    
    const skip = (page - 1) * pageSize;
    
    // 获取总数
    const countRes = await db.collection('course_records')
      .where({ student_id: studentId })
      .count();
    
    const total = countRes.total || 0;
    
    // 获取记录列表
    const recordsRes = await db.collection('course_records')
      .where({ student_id: studentId })
      .orderBy('create_time', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get();
    
    return {
      success: true,
      data: {
        list: recordsRes.data || [],
        total: total,
        page: page,
        pageSize: pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    };
    
  } catch (error) {
    console.error('获取课时记录失败:', error);
    return {
      success: false,
      message: '获取课时记录失败：' + error.message
    };
  }
};

