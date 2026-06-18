// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const { outTradeNo, transactionId, resultCode } = event
  
  console.log('收到支付回调:', {
    outTradeNo,
    transactionId,
    resultCode,
    event: JSON.stringify(event)
  })
  
  try {
    if (resultCode === 'SUCCESS') {
      console.log('开始处理支付成功回调，订单号:', outTradeNo)
      
      // 更新订单状态
      const updateOrderResult = await db.collection('orders').where({
        order_no: outTradeNo
      }).update({
        data: {
          status: 1, // 已支付
          wx_order_no: transactionId,
          pay_time: db.serverDate(),
          pay_method: 'wxpay'
        }
      })
      
      console.log('订单状态更新结果:', updateOrderResult)
      
      // 获取订单信息
      const order = await db.collection('orders').where({
        order_no: outTradeNo
      }).get()
      
      console.log('获取订单信息:', order.data[0])
      
      // 更新用户会员状态
      const updateUserResult = await db.collection('students').doc(order.data[0].student_id).update({
        data: {
          isVipPaid: true,
          vipPayTime: db.serverDate()
        }
      })
      
      console.log('用户会员状态更新结果:', updateUserResult)
    } else {
      console.log('支付未成功，resultCode:', resultCode)
    }
    
    // 返回微信支付要求的格式
    console.log('支付回调处理完成，返回成功')
    return { errcode: 0 }
  } catch (error) {
    console.error('支付回调处理失败:', error)
    console.error('错误详情:', {
      message: error.message,
      stack: error.stack,
      outTradeNo,
      transactionId,
      resultCode
    })
    // 即使处理失败，也要返回成功，避免重复回调
    return { errcode: 0 }
  }
} 