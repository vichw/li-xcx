// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 增加热度云函数入口函数
exports.main = async (event, context) => {
  try {

    console.log('=====增加热度======>',event,context)

    const { honorId } = event;
    
    if (!honorId) {
      return {
        success: false,
        message: '荣誉ID不能为空'
      };
    }
    
    // 使用数据库事务确保数据一致性
    const transaction = await db.startTransaction();
    
    try {
      // 获取当前荣誉记录
      const honorRecord = await transaction.collection('honors').doc(honorId).get();
      
      if (!honorRecord.data) {
        await transaction.rollback();
        return {
          success: false,
          message: '荣誉记录不存在'
        };
      }
      
      // 更新热度值
      const currentHeat = honorRecord.data.heatValue || 0;
      const newHeat = currentHeat + 1;
      
      // 更新记录
      await transaction.collection('honors').doc(honorId).update({
        data: {
          heatValue: newHeat,
          updateTime: db.serverDate()
        }
      });
      
      // 提交事务
      await transaction.commit();
      
      return {
        success: true,
        message: '热度增加成功',
        heatValue: newHeat
      };
    } catch (err) {
      // 发生错误时回滚事务
      await transaction.rollback();
      throw err;
    }
  } catch (e) {
    console.error('增加热度失败', e);
    return {
      success: false,
      message: '增加热度失败',
      error: e
    };
  }
}; 