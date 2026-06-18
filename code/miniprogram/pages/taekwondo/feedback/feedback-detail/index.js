// pages/feedback/feedback-detail/index.js
Page({
  data: {
    feedbackId: '',
    feedback: null,
    loading: true
  },

  onLoad(options) {
    
    if (options.id) {
      this.setData({
        feedbackId: options.id
      });
      this.loadFeedbackDetail();
    } else {
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  /**
   * 加载反馈详情
   */
  async loadFeedbackDetail() {
    try {
      wx.showLoading({ title: '加载中...' });
      
      const result = await wx.cloud.callFunction({
        name: 'feedbackFunctions',
        data: {
          type: 'getFeedbackDetail',
          feedback_id: this.data.feedbackId
        }
      });
      
      wx.hideLoading();
      
      if (result.result && result.result.success) {
        const feedback = result.result.data;
        
        // 预先格式化时间，供模板直接使用
        if (feedback.create_time) {
          feedback.create_time_formatted = this.formatTime(feedback.create_time);
        }
        if (feedback.reply_time) {
          feedback.reply_time_formatted = this.formatTime(feedback.reply_time);
        }
        
        this.setData({
          feedback: feedback,
          loading: false
        });
        
        // 如果有回复且未读，标记为已读
        if (feedback.admin_reply && !feedback.is_read) {
          this.markAsRead();
        }
      } else {
        throw new Error(result.result?.message || '加载失败');
      }
    } catch (error) {
      console.error('加载详情失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
      this.setData({ loading: false });
    }
  },

  /**
   * 标记为已读
   */
  async markAsRead() {
    try {
      await wx.cloud.callFunction({
        name: 'feedbackFunctions',
        data: {
          type: 'markAsRead',
          feedback_id: this.data.feedbackId
        }
      });
    } catch (error) {
      console.error('标记已读失败:', error);
    }
  },

  /**
   * 预览图片
   */
  previewImage(e) {
    const index = e.currentTarget.dataset.index;
    const feedback = this.data.feedback;
    
    // 安全检查
    if (!feedback || !feedback.images || !Array.isArray(feedback.images) || feedback.images.length === 0) {
      wx.showToast({
        title: '暂无图片',
        icon: 'none'
      });
      return;
    }
    
    wx.previewImage({
      current: feedback.images[index],
      urls: feedback.images
    });
  },

  /**
   * 格式化时间
   */
  formatTime($date) {
    if (!$date) return '';
    
    // 处理云数据库的 serverDate 格式 { $date: 'xxx' }
    let dateValue = $date;
    if (typeof $date === 'object' && $date.$date) {
      dateValue = $date.$date;
    }
    
    const d = new Date(dateValue);
    
    // 检查日期是否有效
    if (isNaN(d.getTime())) {
      console.error('无效的日期格式:', $date);
      return '';
    }
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hour = String(d.getHours()).padStart(2, '0');
    const minute = String(d.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hour}:${minute}`;
  },

  /**
   * 获取状态文本
   */
  getStatusText(status) {
    const statusMap = {
      pending: '待处理',
      processing: '处理中',
      resolved: '已解决',
      closed: '已关闭'
    };
    return statusMap[status] || status;
  },

  /**
   * 获取状态样式类
   */
  getStatusClass(status) {
    const classMap = {
      pending: 'status-pending',
      processing: 'status-processing',
      resolved: 'status-resolved',
      closed: 'status-closed'
    };
    return classMap[status] || 'status-pending';
  },

  /**
   * 获取类型文本
   */
  getTypeText(type) {
    return type === 'complaint' ? '投诉' : '建议';
  },

  /**
   * 复制联系方式
   */
  copyPhone() {
    if (this.data.feedback && this.data.feedback.user_phone) {
      wx.setClipboardData({
        data: this.data.feedback.user_phone,
        success: () => {
          wx.showToast({
            title: '已复制',
            icon: 'success'
          });
        }
      });
    }
  }
});

