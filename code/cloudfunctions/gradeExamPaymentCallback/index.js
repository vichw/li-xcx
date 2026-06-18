// 云函数入口文件
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { outTradeNo, transactionId, resultCode } = event;
  try {
    if (resultCode === 'SUCCESS') {
      // 1. 更新订单状态
      const orderRes = await db.collection('orders').where({ order_no: outTradeNo }).get();
      if (!orderRes.data || orderRes.data.length === 0) {
        return { errcode: 0 };
      }
      const order = orderRes.data[0];
      await db.collection('orders').where({ order_no: outTradeNo }).update({
        data: {
          status: 1, // 已支付
          wx_order_no: transactionId,
          pay_time: db.serverDate(),
          pay_method: 'wxpay'
        }
      });
      // 2. 更新考级表缴费状态
      if (order.related_exam_id) {
        await db.collection('gradeExams').doc(order.related_exam_id).update({
          data: {
            status: 1, // 已缴费
            pay_time: db.serverDate()
          }
        });
      }
    }
    return { errcode: 0 };
  } catch (e) {
    console.error('考级支付回调处理失败', e);
    return { errcode: 0 };
  }
}; 