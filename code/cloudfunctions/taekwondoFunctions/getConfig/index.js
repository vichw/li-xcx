// 云函数入口文件
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  try {

    console.log('获取到入参：',event,context)

    const { codetype } = event;
    
    // 参数校验
    if (!codetype) {
      return { success: false, message: '缺少 codetype 参数' };
    }

    // 查询数据库
    const { data } = await db.collection('configs')
      .where({ type: codetype })
      .get();

    console.log('查询结果:', data); // 调试日志
    
    return {
      success: true,
      data: data
    };
  } catch (e) {
    console.error('获取配置列表失败:', e);
    return {
      success: false,
      message: '获取配置列表失败',
      error: e.message // 返回具体错误信息（生产环境建议隐藏敏感信息）
    };
  }
};