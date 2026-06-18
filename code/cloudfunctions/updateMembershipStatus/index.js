// 云函数：定时更新学员会员状态
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

/**
 * 计算会员状态
 * @param {Object} student 学员信息
 * @returns {String} 状态：正常、已过期、即将到期、次数用完、次数不足
 */
function calculateMembershipStatus(student) {
  const membershipType = student.membership_type;
  const now = new Date();
  
  // 年卡会员：根据到期日期判断
  if (membershipType === '年卡') {
    const endDate = student.membership_end_date ? new Date(student.membership_end_date) : null;
    
    if (!endDate) {
      return '未设置';
    }
    
    // 计算剩余天数
    const timeDiff = endDate.getTime() - now.getTime();
    const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    
    if (daysRemaining < 0) {
      return '已过期';
    } else if (daysRemaining >= 0 && daysRemaining <= 7) {
      return '即将到期';
    } else {
      return '正常';
    }
  }
  // 按次会员：根据剩余次数判断
  else if (membershipType === '按次') {
    const remainingCount = student.remaining_count || 0;
    
    if (remainingCount === 0) {
      return '次数用完';
    } else if (remainingCount > 0 && remainingCount <= 5) {
      return '次数不足';
    } else {
      return '正常';
    }
  }
  
  return '未知';
}

/**
 * 批量更新会员状态
 */
async function batchUpdateStatus() {
  const batchSize = 100; // 每批处理100条
  let processedCount = 0;
  let updatedCount = 0;
  let errorCount = 0;
  const errors = [];
  
  try {
    // 获取所有学员总数
    const countResult = await db.collection('students').count();
    const total = countResult.total;
    
    console.log(`开始批量更新会员状态，总共 ${total} 条记录`);
    
    // 分批处理
    for (let skip = 0; skip < total; skip += batchSize) {
      try {
        // 查询当前批次的学员
        const result = await db.collection('students')
          .skip(skip)
          .limit(batchSize)
          .get();
        
        const students = result.data;
        
        // 处理每个学员
        for (const student of students) {
          try {
            // 计算新状态
            const newStatus = calculateMembershipStatus(student);
            
            // 只有状态变化时才更新
            if (student.status !== newStatus) {
              await db.collection('students').doc(student._id).update({
                data: {
                  status: newStatus,
                  status_update_time: new Date()
                }
              });
              
              updatedCount++;
              console.log(`更新学员 ${student.name}(${student._id}) 状态: ${student.status} → ${newStatus}`);
            }
            
            processedCount++;
          } catch (error) {
            errorCount++;
            errors.push({
              studentId: student._id,
              studentName: student.name,
              error: error.message
            });
            console.error(`更新学员 ${student.name}(${student._id}) 失败:`, error);
          }
        }
        
        console.log(`已处理 ${processedCount}/${total} 条记录`);
      } catch (error) {
        console.error(`批量查询失败 (skip: ${skip}):`, error);
        errorCount++;
      }
    }
    
    return {
      success: true,
      total: total,
      processedCount: processedCount,
      updatedCount: updatedCount,
      errorCount: errorCount,
      errors: errors.length > 0 ? errors : undefined,
      message: `批量更新完成！处理 ${processedCount} 条，更新 ${updatedCount} 条，失败 ${errorCount} 条`
    };
  } catch (error) {
    console.error('批量更新失败:', error);
    return {
      success: false,
      error: error.message,
      message: '批量更新失败'
    };
  }
}

/**
 * 更新单个学员状态
 */
async function updateSingleStatus(studentId) {
  try {
    // 查询学员信息
    const result = await db.collection('students').doc(studentId).get();
    
    if (!result.data) {
      return {
        success: false,
        message: '学员不存在'
      };
    }
    
    const student = result.data;
    const oldStatus = student.status;
    const newStatus = calculateMembershipStatus(student);
    
    // 更新状态
    await db.collection('students').doc(studentId).update({
      data: {
        status: newStatus,
        status_update_time: new Date()
      }
    });
    
    return {
      success: true,
      studentId: studentId,
      studentName: student.name,
      oldStatus: oldStatus,
      newStatus: newStatus,
      message: `状态更新成功: ${oldStatus} → ${newStatus}`
    };
  } catch (error) {
    console.error(`更新学员 ${studentId} 状态失败:`, error);
    return {
      success: false,
      error: error.message,
      message: '更新失败'
    };
  }
}

/**
 * 云函数入口
 */
exports.main = async (event, context) => {
  console.log('========== 会员状态更新云函数开始 ==========');
  console.log('触发时间:', new Date());
  console.log('触发类型:', event.type || 'batch');
  
  try {
    const type = event.type || 'batch';
    
    switch (type) {
      case 'batch':
        // 批量更新所有学员
        return await batchUpdateStatus();
        
      case 'single':
        // 更新单个学员
        if (!event.studentId) {
          return {
            success: false,
            message: '缺少 studentId 参数'
          };
        }
        return await updateSingleStatus(event.studentId);
        
      default:
        return {
          success: false,
          message: `未知的类型: ${type}`
        };
    }
  } catch (error) {
    console.error('云函数执行失败:', error);
    return {
      success: false,
      error: error.message,
      message: '执行失败'
    };
  } finally {
    console.log('========== 会员状态更新云函数结束 ==========');
  }
};

