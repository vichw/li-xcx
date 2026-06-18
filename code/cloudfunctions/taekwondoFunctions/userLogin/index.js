// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 用户登录云函数入口函数
exports.main = async (event, context) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;    
    
    const { phoneNumber,avatarUrl,nickName } = event;
    
    if (!phoneNumber) {
      return {
        success: false,
        message: '手机号不能为空'
      };
    }
    
    // 查询学员信息是否存在
    const { data } = await db.collection('students').where({
      phoneNumber: phoneNumber
    }).get();
    
    if (!data || data.length === 0) {
      return {
        success: false,
        message: '该手机号未注册，请先报名'
      };
    }
    
    // 获取学员信息
    const student = data[0];
    
    // 更新学员的openid(可能在管理员添加学员时没有openid)
    // if (student.openid !== openid) {
      await db.collection('students').doc(student._id).update({
        data: {
          openid: openid,
          avatar:avatarUrl,
          nickName,
          updateTime: db.serverDate()
        }
      });
      student.openid = openid;
    // }
    
    return {
      success: true,
      message: '登录成功',
      data: student
    };
  } catch (e) {
    console.error('用户登录失败', e);
    return {
      success: false,
      message: '登录失败',
      error: e
    };
  }
}; 