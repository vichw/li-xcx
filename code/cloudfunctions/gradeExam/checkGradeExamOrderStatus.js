// 云函数入口文件
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { orderNo } = event;
  try {
    const order = await db.collection('orders').where({ order_no: orderNo }).get();
    if (order.data && order.data.length > 0) {
      return {
        success: true,
        data: order.data[0]
      };
    } else {
      return {
        success: false,
        message: '订单不存在'
      };
    }
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}; 