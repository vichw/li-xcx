// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 获取用户荣誉云函数入口函数
exports.main = async (event, context) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;

    const {phoneNumber} = event;
    
    if (!openid) {
      return {
        success: false,
        message: '无法获取用户标识'
      };
    }
    
    // 先查询学员信息获取学员ID
    const { data: students } = await db.collection('students').where({
      phoneNumber: phoneNumber
    }).get();
    
    if (!students || students.length === 0) {
      return {
        success: false,
        message: '用户不存在',
        data: []
      };
    }
    
    const student = students[0];
    
    // 查询该学员的荣誉记录
    const { data: honors } = await db.collection('honors').where({
      studentId: student._id
    }).orderBy('competitionDate', 'desc')
    .get();
    
    return {
      success: true,
      data: honors || []
    };
  } catch (e) {
    console.error('获取用户荣誉失败', e);
    return {
      success: false,
      message: '获取用户荣誉失败',
      error: e,
      data: []
    };
  }
}; 