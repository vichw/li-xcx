// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 更新用户信息云函数入口函数
exports.main = async (event, context) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;

    

    
    if (!openid) {
      return {
        success: false,
        message: '无法获取用户标识'
      };
    }
    
    const { userInfo } = event;

    const {phoneNumber} = userInfo;
    
    if (!userInfo) {
      return {
        success: false,
        message: '用户信息不能为空'
      };
    }
    
    // 查询学员信息
    const { data } = await db.collection('students').where({
      phoneNumber: phoneNumber
    }).limit(1).get();
    
    if (!data || data.length === 0) {
      return {
        success: false,
        message: '用户不存在'
      };
    }
    
    const student = data[0];
    
    // 允许更新的字段
    const updatableFields = ['name', 'grade', 'joinDate', 'avatar'];
    const updateData = {};
    
    // 只更新允许的字段
    updatableFields.forEach(field => {
      if (userInfo[field] !== undefined) {
        updateData[field] = userInfo[field];
      }
    });
    
    // 增加更新时间
    updateData.updateTime = db.serverDate();
    
    // 更新学员信息
    await db.collection('students').doc(student._id).update({
      data: updateData
    });
    
    return {
      success: true,
      message: '用户信息更新成功'
    };
  } catch (e) {
    console.error('更新用户信息失败', e);
    return {
      success: false,
      message: '更新用户信息失败',
      error: e
    };
  }
}; 