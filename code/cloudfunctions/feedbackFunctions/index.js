// 投诉建议管理云函数
const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { type } = event;
  
  try {
    switch (type) {
      // 提交投诉建议
      case 'submitFeedback':
        return await submitFeedback(event);
      
      // 获取我的投诉列表（用户端）
      case 'getMyFeedbacks':
        return await getMyFeedbacks(event);
      
      // 获取投诉详情
      case 'getFeedbackDetail':
        return await getFeedbackDetail(event);
      
      // 标记为已读
      case 'markAsRead':
        return await markAsRead(event);
      
      // 获取未读数量
      case 'getUnreadCount':
        return await getUnreadCount(event);
      
      // 获取所有投诉（管理端）
      case 'getAllFeedbacks':
        return await getAllFeedbacks(event);
      
      // 处理投诉（管理端）
      case 'handleFeedback':
        return await handleFeedback(event);
      
      default:
        return {
          success: false,
          message: '未知的操作类型'
        };
    }
  } catch (error) {
    console.error('云函数执行失败:', error);
    return {
      success: false,
      message: error.message || '操作失败'
    };
  }
};

/**
 * 提交投诉建议
 * @param {Object} event - { type, category, category_name, title, content, images, user_phone }
 */
async function submitFeedback(event) {
  const { 
    feedbackType,  // complaint/suggestion
    category, 
    category_name,
    title, 
    content, 
    images, 
    user_phone 
  } = event;
  
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  
  // 验证必填字段
  if (!feedbackType || !category || !title || !content || !user_phone) {
    return {
      success: false,
      message: '缺少必填字段'
    };
  }
  
  // 验证标题长度
  if (title.length > 30) {
    return {
      success: false,
      message: '标题不能超过30字'
    };
  }
  
  // 验证描述长度
  if (content.length > 500) {
    return {
      success: false,
      message: '描述不能超过500字'
    };
  }
  
  // 验证图片数量
  if (images && images.length > 5) {
    return {
      success: false,
      message: '最多上传5张图片'
    };
  }
  
  try {
    // 获取用户信息（姓名）
    let userName = '用户';
    try {
      const userResult = await db.collection('students')
        .where({ openid })
        .get();
      
      if (userResult.data.length > 0) {
        userName = userResult.data[0].name || '用户';
      }
    } catch (err) {
      console.log('获取用户姓名失败，使用默认值');
    }
    
    // 创建投诉建议记录
    const result = await db.collection('feedback').add({
      data: {
        type: feedbackType,
        category,
        category_name,
        title,
        content,
        images: images || [],
        
        user_openid: openid,
        user_name: userName,
        user_phone,
        
        status: 'pending',
        admin_reply: '',
        admin_name: '',
        reply_time: null,
        
        is_read: false,  // 用户是否已读回复
        
        create_time: db.serverDate(),
        update_time: db.serverDate()
      }
    });
    
    return {
      success: true,
      message: '提交成功',
      feedback_id: result._id
    };
  } catch (error) {
    console.error('提交投诉建议失败:', error);
    throw error;
  }
}

/**
 * 获取我的投诉列表（用户端）
 * @param {Object} event - { status, limit, skip }
 */
async function getMyFeedbacks(event) {
  const { status, limit = 20, skip = 0 } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  
  try {
    // 构建查询条件
    let whereCondition = { user_openid: openid };
    
    if (status === 'pending') {
      whereCondition.status = 'pending';
    } else if (status === 'processed') {
      whereCondition.status = _.in(['processing', 'resolved', 'closed']);
    }
    
    // 查询列表
    const result = await db.collection('feedback')
      .where(whereCondition)
      .orderBy('create_time', 'desc')
      .skip(skip)
      .limit(limit)
      .get();
    
    // 统计总数
    const countResult = await db.collection('feedback')
      .where(whereCondition)
      .count();
    
    return {
      success: true,
      data: result.data,
      total: countResult.total
    };
  } catch (error) {
    console.error('获取投诉列表失败:', error);
    throw error;
  }
}

/**
 * 获取投诉详情
 * @param {Object} event - { feedback_id }
 */
async function getFeedbackDetail(event) {
  const { feedback_id } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  
  if (!feedback_id) {
    return {
      success: false,
      message: '缺少反馈ID'
    };
  }
  
  try {
    const result = await db.collection('feedback')
      .doc(feedback_id)
      .get();
    
    if (!result.data) {
      return {
        success: false,
        message: '反馈不存在'
      };
    }
    
    // 验证是否是本人的投诉
    if (result.data.user_openid !== openid) {
      return {
        success: false,
        message: '无权查看'
      };
    }
    
    return {
      success: true,
      data: result.data
    };
  } catch (error) {
    console.error('获取投诉详情失败:', error);
    throw error;
  }
}

/**
 * 标记为已读
 * @param {Object} event - { feedback_id }
 */
async function markAsRead(event) {
  const { feedback_id } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  
  if (!feedback_id) {
    return {
      success: false,
      message: '缺少反馈ID'
    };
  }
  
  try {
    // 验证权限
    const feedback = await db.collection('feedback')
      .doc(feedback_id)
      .get();
    
    if (!feedback.data || feedback.data.user_openid !== openid) {
      return {
        success: false,
        message: '无权操作'
      };
    }
    
    // 更新为已读
    await db.collection('feedback')
      .doc(feedback_id)
      .update({
        data: {
          is_read: true,
          update_time: db.serverDate()
        }
      });
    
    return {
      success: true
    };
  } catch (error) {
    console.error('标记已读失败:', error);
    throw error;
  }
}

/**
 * 获取未读数量
 * @param {Object} event - {}
 */
async function getUnreadCount(event) {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  
  try {
    // 查询有回复但未读的投诉
    const result = await db.collection('feedback')
      .where({
        user_openid: openid,
        admin_reply: _.neq(''),
        is_read: false
      })
      .count();
    
    return {
      success: true,
      count: result.total
    };
  } catch (error) {
    console.error('获取未读数量失败:', error);
    throw error;
  }
}

/**
 * 获取所有投诉（管理端）
 * @param {Object} event - { type, category, status, start_date, end_date, keyword, limit, skip }
 */
async function getAllFeedbacks(event) {
  const { 
    feedbackType,  // complaint/suggestion
    category, 
    status, 
    start_date, 
    end_date,
    keyword,
    limit = 20, 
    skip = 0 
  } = event;
  
  try {
    // 构建查询条件
    let whereCondition = {};
    
    if (feedbackType) {
      whereCondition.type = feedbackType;
    }
    
    if (category) {
      whereCondition.category = category;
    }
    
    if (status) {
      whereCondition.status = status;
    }
    
    // 日期范围
    if (start_date || end_date) {
      whereCondition.create_time = {};
      if (start_date) {
        whereCondition.create_time = _.gte(new Date(start_date));
      }
      if (end_date) {
        const endDateTime = new Date(end_date);
        endDateTime.setHours(23, 59, 59, 999);
        whereCondition.create_time = start_date 
          ? _.and(_.gte(new Date(start_date)), _.lte(endDateTime))
          : _.lte(endDateTime);
      }
    }
    
    // 查询列表
    let query = db.collection('feedback').where(whereCondition);
    
    // 关键词搜索（标题或内容）
    if (keyword) {
      const searchResults = await db.collection('feedback')
        .where(whereCondition)
        .get();
      
      const filtered = searchResults.data.filter(item => 
        item.title.includes(keyword) || item.content.includes(keyword)
      );
      
      return {
        success: true,
        data: filtered.slice(skip, skip + limit),
        total: filtered.length,
        statistics: await getStatistics()
      };
    }
    
    const result = await query
      .orderBy('create_time', 'desc')
      .skip(skip)
      .limit(limit)
      .get();
    
    // 统计总数
    const countResult = await db.collection('feedback')
      .where(whereCondition)
      .count();
    
    // 获取统计信息
    const statistics = await getStatistics();
    
    return {
      success: true,
      data: result.data,
      total: countResult.total,
      statistics
    };
  } catch (error) {
    console.error('获取投诉列表失败:', error);
    throw error;
  }
}

/**
 * 获取统计信息（管理端）
 */
async function getStatistics() {
  try {
    // 待处理数量
    const pendingResult = await db.collection('feedback')
      .where({ status: 'pending' })
      .count();
    
    // 今日新增
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayResult = await db.collection('feedback')
      .where({
        create_time: _.gte(today)
      })
      .count();
    
    // 总数
    const totalResult = await db.collection('feedback')
      .count();
    
    return {
      pending: pendingResult.total,
      todayNew: todayResult.total,
      total: totalResult.total
    };
  } catch (error) {
    console.error('获取统计信息失败:', error);
    return {
      pending: 0,
      todayNew: 0,
      total: 0
    };
  }
}

/**
 * 处理投诉（管理端）
 * @param {Object} event - { feedback_id, status, admin_reply, admin_name }
 */
async function handleFeedback(event) {
  const { feedback_id, status, admin_reply, admin_name } = event;
  
  if (!feedback_id || !status || !admin_reply || !admin_name) {
    return {
      success: false,
      message: '缺少必填字段'
    };
  }
  
  // 验证状态值
  const validStatuses = ['pending', 'processing', 'resolved', 'closed'];
  if (!validStatuses.includes(status)) {
    return {
      success: false,
      message: '状态值无效'
    };
  }
  
  try {
    // 检查反馈是否存在
    const feedback = await db.collection('feedback')
      .doc(feedback_id)
      .get();
    
    if (!feedback.data) {
      return {
        success: false,
        message: '反馈不存在'
      };
    }
    
    // 更新反馈
    await db.collection('feedback')
      .doc(feedback_id)
      .update({
        data: {
          status,
          admin_reply,
          admin_name,
          reply_time: db.serverDate(),
          is_read: false,  // 管理员回复后，重置为未读
          update_time: db.serverDate()
        }
      });
    
    return {
      success: true,
      message: '处理成功'
    };
  } catch (error) {
    console.error('处理投诉失败:', error);
    throw error;
  }
}

