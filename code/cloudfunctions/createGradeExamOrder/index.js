// 云函数入口文件
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 创建考级报名订单
exports.main = async (event, context) => {
  const { studentId, currentIndex, currentGrade, avatar } = event;
  const wxContext = cloud.getWXContext();
  const clientIp = context.CLIENTIP;
  const envId = context.ENV || process.env.ENV || process.env.TCB_ENV;

  try {
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

    // 1. 查询下一级别考级信息
    const nextIndex = currentIndex + 1;
    const configsRes = await db.collection('configs').where({ type: 'belt_level', index: nextIndex }).get();
    if (!configsRes.data || configsRes.data.length === 0) {
      return { success: false, error: '未找到下一级别考级信息' };
    }
    const nextLevel = configsRes.data[0];

    // 2. 创建考级表记录
    const examRes = await db.collection('gradeExams').add({
      data: {
        student_id: studentId,
        current_grade: currentGrade,
        current_index: currentIndex,
        next_grade: nextLevel.name,
        next_index: nextLevel.index,
        exam_subjects: nextLevel.subjects || [],
        fee: nextLevel.value,
        status: 0, // 0-未缴费
        avatar: avatar,
        create_time: db.serverDate(),
        delete: 0 // 新增，未出成绩
      }
    });

    // 3. 创建订单表记录
    const orderNo = `EXAM${Date.now()}${Math.floor(Math.random()*10000)}`;
    await db.collection('orders').add({
      data: {
        order_no: orderNo,
        student_id: studentId,
        order_type: 2, // 2-考级报名
        amount: nextLevel.value,
        status: 0, // 待支付
        related_exam_id: examRes._id,
        created_at: db.serverDate()
      }
    });

    // 4. 调用微信支付统一下单
    const payParams = await cloud.cloudPay.unifiedOrder({
      functionName: 'gradeExamPaymentCallback',
      envId: envId,
      subMchId: payConfig.mchId, // 从数据库获取的商户号
      nonceStr: wxContext.NONCESTR,
      body: `跆拳道考级报名费-${nextLevel.name}`,
      outTradeNo: orderNo,
      totalFee: Math.round(Number(nextLevel.value) * 100), // 金额转为整数分
      spbillCreateIp: clientIp || '127.0.0.1',
      tradeType: payConfig.tradeType || 'JSAPI' // 从配置获取或使用默认值
    });

    return {
      success: true,
      payParams: {
        ...payParams,
        outTradeNo: orderNo,
        examId: examRes._id,
        nextGrade: nextLevel.name,
        subjects: nextLevel.subjects || [],
        fee: nextLevel.value
      }
    };
  } catch (error) {
    console.error('创建考级订单失败:', error);
    return {
      success: false,
      error: error.message || '创建考级订单失败'
    };
  }
}; 