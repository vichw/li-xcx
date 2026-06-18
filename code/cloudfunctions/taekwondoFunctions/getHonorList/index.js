// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;
const $ = db.command.aggregate;

// 获取荣誉列表云函数入口函数
exports.main = async (event, context) => {
  try {
    // 默认按热度降序排列
    const { limit,skip } = event;

    console.log('接收入参--->',event)
    
    
    // 从数据库获取荣誉记录，按热度排序
    const honorCollection = db.collection('honors');
    
    // 获取总数
    const countResult = await honorCollection.count();
    
    // 获取分页数据
    const { data } = await honorCollection
      .orderBy('heatValue', 'desc') // 按热度降序排列
      .orderBy('competitionDate', 'desc') // 同等热度下按比赛日期降序
      .skip(skip)
      .limit(limit)
      .get();
    
    // 遍历结果获取学员信息
    const honors = await Promise.all(data.map(async (honor) => {
      // 查询学员信息
      if (honor.studentId) {
        try {
          const { data: [student] } = await db.collection('students')
            .where({
              _id: honor.studentId
            })
            .get();
          
          if (student) {
            return {
              ...honor,
              studentName: student.name,
              studentAvatar: student.avatar,
              studentGrade: student.grade
            };
          }
        } catch (e) {
          console.error('获取学员信息失败', e);
        }
      }
      
      return honor;
    }));
    
    return {
      success: true,
      data: honors,
      total: countResult.total
    };
  } catch (e) {
    console.error('获取荣誉列表失败', e);
    return {
      success: false,
      message: '获取荣誉列表失败',
      error: e
    };
  }
}; 