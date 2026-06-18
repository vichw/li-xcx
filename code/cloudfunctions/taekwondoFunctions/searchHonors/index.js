// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;
const $ = db.command.aggregate;

// 搜索荣誉云函数入口函数
exports.main = async (event, context) => {
  try {

    console.log('搜索入口====>',event)

    const { keyword } = event || {};
    
    if (!keyword) {
      return {
        success: false,
        message: '搜索关键词不能为空'
      };
    }
    
    // 先查询匹配的学员
    const studentCollection = db.collection('students');
    const studentQuery = studentCollection.where(_.or([
      {
        name: db.RegExp({
          regexp: keyword,
          options: 'i' // 不区分大小写
        })
      },
      {
        phoneNumber: db.RegExp({
          regexp: keyword,
          options: 'i' // 不区分大小写
        })
      }
    ]));
    
    const { data: students } = await studentQuery.get();
    
    if (students.length === 0) {
      return {
        success: true,
        data: [],
        message: '未找到匹配的学员'
      };
    }
    
    // 获取这些学员的荣誉记录
    const studentIds = students.map(student => student._id);
    const honorCollection = db.collection('honors');
    
    const { data: honors } = await honorCollection
      .where({
        studentId: _.in(studentIds)
      })
      .orderBy('heatValue', 'desc')
      .orderBy('competitionDate', 'desc')
      .get();
    
    // 将学员信息添加到荣誉记录中
    const honorsWithStudentInfo = honors.map(honor => {
      const student = students.find(s => s._id === honor.studentId);
      if (student) {
        return {
          ...honor,
          studentName: student.name,
          studentAvatar: student.avatar,
          studentGrade: student.grade
        };
      }
      return honor;
    });
    
    return {
      success: true,
      data: honorsWithStudentInfo,
      total: honorsWithStudentInfo.length
    };
  } catch (e) {
    console.error('搜索荣誉失败', e);
    return {
      success: false,
      message: '搜索荣誉失败',
      error: e
    };
  }
}; 