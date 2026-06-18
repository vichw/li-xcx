// 云函数入口文件
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 生成订单号
function generateOrderNo() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return `VIP${year}${month}${day}${random}`;
}

// 云函数入口函数
exports.main = async (event, context) => {
  const { studentId, membershipType, membershipName, membershipPrice } = event;
  const clientIp = context.CLIENTIP;
  const wxContext = cloud.getWXContext();
  const envId = context.ENV || process.env.ENV || process.env.TCB_ENV;
  
  try {
    console.log("创建支付订单，参数:", {
      studentId,
      membershipType,
      membershipName,
      membershipPrice,
      clientIp,
      envId,
      openid: wxContext.OPENID
    });

    // 获取微信支付配置
    const wxpayConfigsRes = await db.collection('configs').where({ type: 'wxpay' }).get();
    const wxpayConfigs = wxpayConfigsRes.data || [];
    
    // 构建配置对象
    const payConfig = {};
    wxpayConfigs.forEach(item => {
      payConfig[item.name] = item.value;
    });
    
    // 确保必要配置存在
    if (!payConfig.mchId) {
      return { success: false, error: '微信支付商户号配置缺失' };
    }

    // 计算支付金额，如果传入了价格就使用传入的，否则使用默认配置
    const amount = membershipPrice ? Math.round(Number(membershipPrice) * 100) : 1; // 默认1分钱用于测试

    // 生成订单号
    const orderNo = generateOrderNo();
    
    // 创建订单记录
    const orderResult = await db.collection('orders').add({
      data: {
        order_no: orderNo,
        student_id: studentId,
        open_id: wxContext.OPENID,
        order_type: 1, // 会员费
        amount: amount,
        membership_type: membershipType,
        membership_name: membershipName,
        status: 0, // 待支付
        created_at: db.serverDate()
      }
    });
    
    console.log("订单创建成功:", orderResult);
    
    // 调用微信支付统一下单
    const payParams = await cloud.cloudPay.unifiedOrder({
      functionName: 'vipPaymentCallback',
      envId: envId,
      subMchId: payConfig.mchId, // 从数据库获取的商户号
      nonceStr: wxContext.NONCESTR,
      body: `跆拳道会员费-${membershipName || '标准会员'}`,
      outTradeNo: orderNo,
      totalFee: amount,
      spbillCreateIp: clientIp || '127.0.0.1',                      
      tradeType: payConfig.tradeType || 'JSAPI'
    });
    
    console.log("统一下单成功:", payParams);
    
    return {
      success: true,
      payParams: {
        ...payParams,
        outTradeNo: orderNo // 显式加上订单号，便于小程序端查询
      }
    };
  } catch (error) {
    console.error('创建支付订单失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
} 