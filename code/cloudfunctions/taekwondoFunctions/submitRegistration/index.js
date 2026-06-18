// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 提交报名信息云函数入口函数
exports.main = async (event, context) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    
    const { phoneNumber } = event;
    
    if (!phoneNumber) {
      return {
        success: false,
        message: '手机号不能为空'
      };
    }

    // 1. 检查 students 表中是否存在该学员
    const studentQuery = await db.collection('students').where({
      phoneNumber: phoneNumber
    }).get();

    // 如果已是学员，检查学员状态
    if (studentQuery.data.length > 0) {
      const existingStudent = studentQuery.data[0];
      
      if (existingStudent.status === '正常') {
        // 检查会员有效期和剩余次数
        const now = new Date();
        const startDate = new Date(existingStudent.membership_start_date);
        const endDate = new Date(existingStudent.membership_end_date);
        const remainingCount = existingStudent.remaining_count || 0;
        
        // 判断会员状态
        if (now < startDate) {
          return {
            success: false,
            message: '您的会员尚未生效，生效日期：' + existingStudent.membership_start_date,
            code: 'MEMBERSHIP_NOT_ACTIVE'
          };
        } else if (now > endDate) {
          return {
            success: false,
            message: '您的会员已过期，过期日期：' + existingStudent.membership_end_date,
            code: 'MEMBERSHIP_EXPIRED'
          };
        } else if (remainingCount <= 0) {
          return {
            success: false,
            message: '您的可用次数已用完，请联系管理员',
            code: 'NO_REMAINING_COUNT'
          };
        } else {
          return {
            success: false,
            message: '您已是有效会员，剩余' + remainingCount + '次，有效期至' + existingStudent.membership_end_date,
            code: 'ALREADY_MEMBER'
          };
        }
      } else if (existingStudent.status === '过期') {
        return {
          success: false,
          message: '您的会员已过期，请联系管理员续费',
          code: 'MEMBERSHIP_EXPIRED'
        };
      } else if (existingStudent.status === '暂停') {
        return {
          success: false,
          message: '您的会员已被暂停，请联系管理员',
          code: 'MEMBERSHIP_SUSPENDED'
        };
      } else {
        return {
          success: false,
          message: '您已是注册学员，请联系管理员',
          code: 'ALREADY_REGISTERED'
        };
      }
    }
    
    // 2. 新用户，检查是否已有报名记录
    const registrationQuery = await db.collection('registrations').where({
      phoneNumber: phoneNumber
    }).get();
    
    if (registrationQuery.data.length > 0) {
      const registration = registrationQuery.data[0];
      
      // 检查报名记录的状态
      if (registration.status === '待审核') {
        return {
          success: false,
          message: '您的报名申请正在审核中，请耐心等待',
          code: 'PENDING_REVIEW'
        };
      } else if (registration.status === '审核通过') {
        return {
          success: false,
          message: '您的报名申请已审核通过，请联系管理员',
          code: 'APPROVED'
        };
      } else if (registration.status === '审核拒绝') {
        return {
          success: false,
          message: '您的报名申请已被拒绝，如有疑问请联系管理员',
          code: 'REJECTED'
        };
      } else {
        return {
          success: false,
          message: '该手机号已经提交过报名申请',
          code: 'ALREADY_REGISTERED'
        };
      }
    }
    
    // 3. 创建新的报名记录（状态为待审核）
    const result = await db.collection('registrations').add({
      data: {
        openid,
        phoneNumber,
        status: '待审核',
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    });
    
    return {
      success: true,
      message: '报名申请提交成功，请等待管理员审核。审核通过后您将可以正常使用系统功能。',
      registrationId: result._id,
      needReview: true
    };
    
  } catch (e) {
    console.error('提交报名信息失败', e);
    return {
      success: false,
      message: '提交报名信息失败',
      error: e
    };
  }
};
