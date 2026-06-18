// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

// 导入各个功能模块
const getOpenId = require('./getOpenId/index');
const getHonorList = require('./getHonorList/index');
const increaseHeat = require('./increaseHeat/index');
const genMpQrcode = require('./genMpQrcode/index');
const submitRegistration = require('./submitRegistration/index');
const getUserInfo = require('./getUserInfo/index');
const userLogin = require('./userLogin/index');
const getUserHonors = require('./getUserHonors/index');
const updateUserInfo = require('./updateUserInfo/index');
const searchHonors = require('./searchHonors/index');
const getConfig = require('./getConfig/index');
const downloadImage = require('./downloadImage/index');
const checkMembershipStatus = require('./checkMembershipStatus/index');
// 课时管理相关模块
const consumeCourse = require('./consumeCourse/index');
const getCourseRecords = require('./getCourseRecords/index');
const getCourseProgress = require('./getCourseProgress/index');

// 生成订单号
function generateOrderNo() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return `VIP${year}${month}${day}${random}`;
}

// 从云数据库获取微信支付配置
async function getWxPayConfig() {
  const db = cloud.database();
  try {
    // 获取微信支付配置
    const wxpayConfigsRes = await db.collection('configs').where({ type: 'wxpay' }).get();
    const wxpayConfigs = wxpayConfigsRes.data || [];
    
    // 构建配置对象
    const payConfig = {
      tradeType: 'JSAPI' // 默认值
    };
    
    wxpayConfigs.forEach(item => {
      payConfig[item.name] = item.value;
    });
    
    // 确保必要配置存在
    if (!payConfig.mchId) {
      console.error('微信支付商户号配置缺失');
      throw new Error('微信支付商户号配置缺失');
    }
    
    return payConfig;
  } catch (error) {
    console.error('获取微信支付配置失败:', error);
    throw error;
  }
}

// 创建会员费支付订单
async function createVipPayment(event, context) {
  const { studentId, membershipType, membershipName, membershipPrice } = event;
  const clientIp = context.CLIENTIP;
  const wxContext = cloud.getWXContext();
  const db = cloud.database();
  const envId = context.ENV || process.env.ENV || process.env.TCB_ENV;
  
  try {
    console.log("创建会员支付订单，参数:", {
      studentId,
      membershipType,
      membershipName,
      membershipPrice,
      envId
    });

    // 验证会员价格
    if (!membershipPrice) {
      return {
        success: false,
        error: '会员价格不能为空'
      };
    }

    // 将价格转换为分（微信支付要求）
    const totalFee = Math.round(parseFloat(membershipPrice) * 100);
    if (isNaN(totalFee) || totalFee <= 0) {
      return {
        success: false,
        error: '无效的会员价格'
      };
    }

    // 获取微信支付配置
    const payConfig = await getWxPayConfig();

    // 生成订单号
    const orderNo = generateOrderNo();
    
    // 创建订单记录
    const orderResult = await db.collection('orders').add({
      data: {
        order_no: orderNo,
        student_id: studentId,
        open_id: wxContext.OPENID,
        order_type: 1, // 会员费
        amount: totalFee, // 使用传入的价格（单位分）
        membership_type: membershipType || '', // 会员类型
        membership_name: membershipName || '', // 会员卡名称
        status: 0, // 待支付
        created_at: db.serverDate()
      }
    });
    
    // 构建商品描述
    const body = membershipType === '按次' 
      ? `跆拳道${membershipType}会员费(${membershipName || '标准卡'})` 
      : `跆拳道${membershipType}会员费(${membershipName || '标准卡'})`;

    // 调用微信支付统一下单
    const payParams = await cloud.cloudPay.unifiedOrder({
      functionName: 'vipPaymentCallback',
      envId: envId,
      subMchId: payConfig.mchId,
      nonceStr: wxContext.NONCESTR,
      body: body,
      outTradeNo: orderNo,
      totalFee: totalFee, // 使用传入的价格
      spbillCreateIp: clientIp || '127.0.0.1',                      
      tradeType: payConfig.tradeType || 'JSAPI'
    });
    
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

// 会员费支付回调处理
async function vipPaymentCallback(event, context) {
  const { outTradeNo, transactionId, resultCode } = event;
  const db = cloud.database();
  
  console.log('收到支付回调:', {
    outTradeNo,
    transactionId,
    resultCode,
    event: JSON.stringify(event)
  });
  
  try {
    if (resultCode === 'SUCCESS') {
      console.log('开始处理支付成功回调，订单号:', outTradeNo);
      
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
      });
      
      console.log('订单状态更新结果:', updateOrderResult);
      
      // 获取订单信息
      const order = await db.collection('orders').where({
        order_no: outTradeNo
      }).get();
      
      if (!order.data || order.data.length === 0) {
        console.error('未找到订单信息:', outTradeNo);
        return { errcode: 0 }; // 返回成功，避免微信重复回调
      }
      
      const orderData = order.data[0];
      console.log('获取订单信息:', orderData);
      
      // 更新用户会员状态和会员信息
      const updateData = {
        isVipPaid: true,
        vipPayTime: db.serverDate()
      };
      
      // 如果订单中包含会员类型和名称，则更新到用户信息中
      if (orderData.membership_type) {
        updateData.membership_type = orderData.membership_type;
      }
      
      if (orderData.membership_name) {
        updateData.membership_name = orderData.membership_name;
      }
      
      // 更新用户会员状态
      const updateUserResult = await db.collection('students').doc(orderData.student_id).update({
        data: updateData
      });
      
      console.log('用户会员状态更新结果:', updateUserResult);
    } else {
      console.log('支付未成功，resultCode:', resultCode);
    }
    
    // 返回微信支付要求的格式
    console.log('支付回调处理完成，返回成功');
    return { errcode: 0 };
  } catch (error) {
    console.error('支付回调处理失败:', error);
    console.error('错误详情:', {
      message: error.message,
      stack: error.stack,
      outTradeNo,
      transactionId,
      resultCode
    });
    // 即使处理失败，也要返回成功，避免重复回调
    return { errcode: 0 };
  }
}

// 查询订单状态
async function checkOrderStatus(event, context) {
  const { orderNo } = event;
  const db = cloud.database();
  
  try {
    console.log('查询订单状态，订单号:', orderNo);
    
    // 查询订单
    const order = await db.collection('orders').where({
      order_no: orderNo
    }).get();
    
    console.log('订单查询结果:', order);
    
    if (order.data && order.data.length > 0) {
      const orderData = order.data[0];
      
      // 如果是已支付的会员费订单，同时更新用户信息
      if (orderData.order_type === 1 && orderData.status === 1) {
        try {
          // 更新用户会员状态和会员信息
          const updateData = {
            isVipPaid: true,
            vipPayTime: orderData.pay_time || db.serverDate()
          };
          
          // 如果订单中包含会员类型和名称，则更新到用户信息中
          if (orderData.membership_type) {
            updateData.membership_type = orderData.membership_type;
          }
          
          if (orderData.membership_name) {
            updateData.membership_name = orderData.membership_name;
          }
          
          // 更新用户会员状态
          await db.collection('students').doc(orderData.student_id).update({
            data: updateData
          });
          
          console.log('查询订单时更新用户会员信息成功');
        } catch (updateError) {
          console.error('查询订单时更新用户会员信息失败:', updateError);
          // 不影响主流程，继续返回订单信息
        }
      }
      
      return {
        success: true,
        data: orderData
      };
    } else {
      return {
        success: false,
        message: '订单不存在'
      };
    }
  } catch (error) {
    console.error('查询订单状态失败:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

// 创建考级报名记录
async function createGradeExam(data) {
  const { studentId, currentIndex, currentGrade, avatar } = data;
  const db = cloud.database();
  
  try {
    // 获取学生信息
    const student = await db.collection('students').doc(studentId).get();
    if (!student.data) {
      return { success: false, message: '学生信息不存在' };
    }

    // 获取下一级别信息
    const nextGrade = await db.collection('configs')
      .where({ type: 'belt_level', index: currentIndex + 1 })
      .get();
    
    if (!nextGrade.data || nextGrade.data.length === 0) {
      return { success: false, message: '未找到下一级别信息' };
    }

    // 创建考级报名记录
    const result = await db.collection('gradeExams').add({
      data: {
        student_id: studentId,
        current_grade: currentGrade,
        current_index: currentIndex,
        next_grade: nextGrade.data[0].name,
        next_index: nextGrade.data[0].index,
        fee: nextGrade.data[0].value,
        status: 0, // 初始状态为未支付
        delete: 0, // 新增：默认不生效
        create_time: db.serverDate(),
        pay_time: null,
        score_behavior: null,
        score_tech: null,
        score_physical: null,
        score_total: null,
        weight_behavior: null,
        weight_tech: null,
        weight_physical: null
      }
    });

    return {
      success: true,
      examId: result._id
    };
  } catch (error) {
    console.error('创建考级报名记录失败:', error);
    return { success: false, message: '创建考级报名记录失败' };
  }
}

// 获取考级历史记录
async function getGradeExamHistory(data) {
  const db = cloud.database();
  const { student_id } = data;
  try {
    const result = await db.collection('gradeExams')
      .where({
        student_id: student_id,
        delete: 1  // 只查询生效的记录
      })
      .orderBy('create_time', 'desc')
      .get();
    return result.data;
  } catch (error) {
    console.error('获取考级历史记录失败:', error);
    return [];
  }
}

// 重置课时进度（考级升级后调用）
async function resetCourseProgress(data) {
  const db = cloud.database();
  const { studentId, newGrade } = data;
  
  try {
    if (!studentId) {
      return { success: false, message: '学生ID不能为空' };
    }
    
    // 重置已完成课时为0
    const updateData = {
      completed_courses: 0,
      updateTime: db.serverDate()
    };
    
    // 如果传入了新等级，同时更新等级
    if (newGrade) {
      updateData.grade = newGrade;
    }
    
    await db.collection('students').doc(studentId).update({
      data: updateData
    });
    
    return {
      success: true,
      message: '课时进度已重置'
    };
  } catch (error) {
    console.error('重置课时进度失败:', error);
    return {
      success: false,
      message: '重置课时进度失败：' + error.message
    };
  }
}

// 云函数入口函数
exports.main = async (event, context) => {
  
  const { type } = event;
  
  switch (type) {
    case 'getOpenId':
      return await getOpenId.main(event, context);
    case 'getHonorList':
      return await getHonorList.main(event, context);
    case 'increaseHeat':
      return await increaseHeat.main(event, context);
    case 'genMpQrcode':
      return await genMpQrcode.main(event, context);
    case 'submitRegistration':
      return await submitRegistration.main(event, context);
    case 'getUserInfo':
      return await getUserInfo.main(event, context);
    case 'userLogin':
      return await userLogin.main(event, context);
    case 'getUserHonors':
      return await getUserHonors.main(event, context);
    case 'updateUserInfo':
      return await updateUserInfo.main(event, context);
    case 'searchHonors':
      return await searchHonors.main(event, context);
    case 'getConfig':
      return await getConfig.main(event,context);
    case 'createVipPayment':
      return await createVipPayment(event, context);
    case 'vipPaymentCallback':
      return await vipPaymentCallback(event, context);
    case 'checkOrderStatus':
      return await checkOrderStatus(event, context);
    case 'downloadImage':
      return await downloadImage.main(event, context);
    case 'getGradeExamHistory':
      return await getGradeExamHistory(event);
    case 'createGradeExam':
      return await createGradeExam(event);
    case 'checkMembershipStatus':
      return await checkMembershipStatus.main(event, context);
    // 课时管理相关
    case 'consumeCourse':
      return await consumeCourse.main(event, context);
    case 'getCourseRecords':
      return await getCourseRecords.main(event, context);
    case 'getCourseProgress':
      return await getCourseProgress.main(event, context);
    case 'resetCourseProgress':
      return await resetCourseProgress(event);
    default:
      return {
        success: false,
        message: '未知的操作类型'
      };
  }
}; 