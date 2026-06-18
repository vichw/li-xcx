// pages/feedback/feedback-list/index.js
Page({
  data: {
    activeTab: 'all',  // all/pending/processed
    feedbackList: [],
    loading: false,
    hasMore: true,
    page: 0,
    pageSize: 20
  },

  onLoad(options) {
    this.loadFeedbackList();
  },

  onShow() {
    // 每次显示页面时刷新列表
    this.refreshList();
  },

  onPullDownRefresh() {
    this.refreshList();
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMore();
    }
  },

  /**
   * Tab切换
   */
  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({
      activeTab: tab,
      page: 0,
      feedbackList: [],
      hasMore: true
    });
    this.loadFeedbackList();
  },

  /**
   * 刷新列表
   */
  async refreshList() {
    this.setData({
      page: 0,
      feedbackList: [],
      hasMore: true
    });
    await this.loadFeedbackList();
    wx.stopPullDownRefresh();
  },

  /**
   * 加载更多
   */
  loadMore() {
    this.setData({
      page: this.data.page + 1
    });
    this.loadFeedbackList();
  },

  /**
   * 加载投诉列表
   */
  async loadFeedbackList() {
    if (this.data.loading) return;
    
    this.setData({ loading: true });
    
    try {
      const { activeTab, page, pageSize } = this.data;
      
      // 构建查询参数
      const params = {
        type: 'getMyFeedbacks',
        limit: pageSize,
        skip: page * pageSize
      };
      
      // 根据Tab设置状态筛选
      if (activeTab === 'pending') {
        params.status = 'pending';
      } else if (activeTab === 'processed') {
        params.status = 'processed';
      }
      
      const result = await wx.cloud.callFunction({
        name: 'feedbackFunctions',
        data: params
      });
      
      if (result.result && result.result.success) {
        const newList = result.result.data || [];
        
        // 预先格式化时间
        newList.forEach(item => {
          if (item.create_time) {
            item.create_time_formatted = this.formatTime(item.create_time);
          }
        });
        
        const feedbackList = page === 0 ? newList : [...this.data.feedbackList, ...newList];
        
        this.setData({
          feedbackList,
          hasMore: newList.length >= pageSize,
          loading: false
        });
      } else {
        throw new Error(result.result?.message || '加载失败');
      }
    } catch (error) {
      console.error('加载列表失败:', error);
      this.setData({ loading: false });
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  /**
   * 跳转到详情
   */
  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/taekwondo/feedback/feedback-detail/index?id=${id}`
    });
  },

  /**
   * 跳转到提交页面
   */
  goToSubmit() {
    wx.navigateTo({
      url: '/pages/taekwondo/feedback/feedback-submit/index'
    });
  },

  /**
   * 格式化时间
   */
  formatTime(date) {
    if (!date) return '';
    
    // 处理云数据库的 serverDate 格式 { $date: 'xxx' }
    let dateValue = date;
    if (typeof date === 'object' && date.$date) {
      dateValue = date.$date;
    }
    
    const d = new Date(dateValue);
    
    // 检查日期是否有效
    if (isNaN(d.getTime())) {
      console.error('无效的日期格式:', date);
      return '';
    }
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
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
  }
});

