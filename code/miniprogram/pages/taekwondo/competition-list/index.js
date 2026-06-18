// 比赛列表页面
Page({
  data: {
    activeTab: 'ongoing', // ongoing: 进行中, finished: 已完成
    ongoingCompetitions: [],
    finishedCompetitions: [],
    loading: false
  },

  onLoad: function() {
    this.loadCompetitions();
  },

  onShow: function() {
    // 每次显示时刷新数据
    this.loadCompetitions();
  },

  // 切换Tab
  switchTab: function(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({
      activeTab: tab
    });
  },

  // 加载比赛列表
  loadCompetitions: function() {
    const that = this;
    that.setData({ loading: true });

    // 并行加载进行中和已完成的比赛
    Promise.all([
      that.loadByStatus('ongoing'),
      that.loadByStatus('finished')
    ]).then(([ongoing, finished]) => {
      that.setData({
        ongoingCompetitions: ongoing,
        finishedCompetitions: finished,
        loading: false
      });
    }).catch(err => {
      console.error('加载比赛列表失败:', err);
      that.setData({ loading: false });
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    });
  },

  // 按状态加载比赛
  loadByStatus: function(status) {
    const that = this;
    return new Promise((resolve, reject) => {
      wx.cloud.callFunction({
        name: 'competitionFunctions',
        data: {
          type: 'getCompetitions',
          status: status,
          limit: 50
        },
        success: res => {
          if (res.result && res.result.success) {
            const competitions = res.result.data || [];
            // 格式化日期
            competitions.forEach(item => {
              item.start_date = that.formatDate(item.start_date);
              item.end_date = that.formatDate(item.end_date);
            });
            resolve(competitions);
          } else {
            resolve([]);
          }
        },
        fail: err => {
          console.error('加载比赛失败:', err);
          reject(err);
        }
      });
    });
  },

  // 跳转到比赛详情
  goToDetail: function(e) {
    const competitionId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/taekwondo/competition-detail/index?id=${competitionId}`
    });
  },

  // 跳转到报名页面
  goToRegister: function(e) {
    const competitionId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/taekwondo/competition-register/index?id=${competitionId}`
    });
  },

  // 格式化日期
  formatDate: function(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // 下拉刷新
  onPullDownRefresh: function() {
    this.loadCompetitions();
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  }
});

