// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

// 检查会员状态
exports.main = async (event, context) => {
  try {
    const { phoneNumber } = event;
    
    if (!phoneNumber) {
      return {
        success: false,
        message: '手机号不能为空'
      };
    }

    const studentQuery = await db.collection('students').where({
      phoneNumber: phoneNumber
    }).get();

    if (studentQuery.data.length === 0) {
      return {
        success: false,
        message: '未找到学员信息',
        code: 'STUDENT_NOT_FOUND'
      };
    }

    const student = studentQuery.data[0];
    const now = new Date();
    
    // 安全地解析日期，如果日期无效则返回null
    const parseDate = (dateStr) => {
      if (!dateStr) return null;
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? null : date;
    };
    
    const startDate = parseDate(student.membership_start_date);
    const endDate = parseDate(student.membership_end_date);
    const remainingCount = student.remaining_count || 0;
    const membershipType = student.membership_type || '';

    let status = '正常';
    let message = '';

    // 检查日期是否有效
    if (!startDate || !endDate) {
      status = '未设置';
      message = '会员日期未设置';
    } else if (now < startDate) {
      status = '未生效';
      message = '会员尚未生效';
    } else if (now > endDate) {
      status = '已过期';
      message = '会员已过期';
    } else if (membershipType === '按次' && remainingCount <= 0) {
      // 只有按次会员才检查剩余次数
      status = '次数用完';
      message = '可用次数已用完';
    } else if (student.status === '暂停') {
      status = '已暂停';
      message = '会员已被暂停';
    } else {
      // 根据会员类型构建不同的消息
      if (membershipType === '按次') {
        message = `会员正常，剩余${remainingCount}次，有效期至${student.membership_end_date}`;
      } else {
        message = `会员正常，有效期至${student.membership_end_date}`;
      }
    }

    return {
      success: true,
      data: {
        status: status,
        message: message,
        remainingCount: remainingCount,
        startDate: student.membership_start_date || '',
        endDate: student.membership_end_date || '',
        membershipType: membershipType,
        studentInfo: student
      }
    };

  } catch (e) {
    console.error('检查会员状态失败', e);
    return {
      success: false,
      message: '检查会员状态失败',
      error: e
    };
  }
}; 