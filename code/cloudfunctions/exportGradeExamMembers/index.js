// 云函数入口文件
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { grade } = event;
  // 1. 查询考级报名表，筛选指定腰带等级
  const examsRes = await db.collection('gradeExams').where({
    next_grade: grade
  }).get();

  if (!examsRes.data || examsRes.data.length === 0) {
    return { success: true, list: [] };
  }

  const studentIds = examsRes.data.map(item => item.student_id);
  const studentsRes = await db.collection('students').where({
    _id: db.command.in(studentIds)
  }).get();

  const exportList = examsRes.data.map(exam => {
    const student = studentsRes.data.find(s => s._id === exam.student_id) || {};
    return {
      name: student.name || '',
      idCard: student.idCard || '',
      avatar: student.avatar || ''
    };
  });

  return {
    success: true,
    list: exportList
  };
}; 