// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 获取用户信息云函数入口函数
exports.main = async (event, context) => {
  try {
    
    console.log('event',event);
    // 获取传入的
    let phoneNumber = event.phoneNumber;
    
    
    
    if (!phoneNumber) {
      return {
        success: false,
        message: '无法获取用户手机号'
      };
    }
    
    // 查询学员信息
    const { data } = await db.collection('students').where({
      phoneNumber: phoneNumber
    }).orderBy('createTime','desc').limit(1).get();
    
    if (!data || data.length === 0) {
      return {
        success: false,
        message: '用户不存在',
        data: null
      };
    }

    return {
      success: true,
      data: data[0]
    };
  } catch (e) {
    console.error('获取用户信息失败', e);
    return {
      success: false,
      message: '获取用户信息失败',
      error: e
    };
  }
}; 