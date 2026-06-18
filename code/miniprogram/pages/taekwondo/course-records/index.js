// 课时消费记录页面
const app = getApp();

Page({
  data: {
    isLogin: false,
    userInfo: null,
    courseProgress: {},
    courseRecords: [],
    loading: false,
    page: 1,
    pageSize: 20,
    total: 0,
    hasMore: true
  },

  onLoad() {
    this.checkLoginStatus();
  },

  onShow() {
    if (this.data.isLogin) {
      this.loadCourseProgress();
      this.loadCourseRecords(true);
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadCourseRecords(true);
  },

  // 上拉加载更多
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadCourseRecords(false);
    }
  },

  // 检查登录状态
  checkLoginStatus() {
    app.checkLoginStatus((isLoggedIn, userInfo) => {
      if (isLoggedIn && userInfo) {
        this.setData({
          isLogin: true,
          userInfo: userInfo
        }, () => {
          this.loadCourseProgress();
          this.loadCourseRecords(true);
        });
      } else {
        this.setData({
          isLogin: false,
          userInfo: null
        });
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      }
    });
  },

  // 加载课时进度
  loadCourseProgress() {
    const userInfo = this.data.userInfo;
    if (!userInfo || !userInfo._id) return;

    wx.cloud.callFunction({
      name: 'taekwondoFunctions',
      data: {
        type: 'getCourseProgress',
        studentId: userInfo._id
      },
      success: res => {
        if (res.result && res.result.success) {
          // 确保数据安全，兼容历史数据
          const progressData = res.result.data || {};
          this.setData({
            courseProgress: {
              current_grade: progressData.current_grade || '',
              completed_courses: (progressData.completed_courses !== undefined && progressData.completed_courses !== null) ? progressData.completed_courses : 0,
              required_courses: progressData.required_courses || 0,
              remaining_courses: progressData.remaining_courses || 0,
              progress: progressData.progress || 0,
              can_apply_exam: progressData.can_apply_exam || false,
              today_count: progressData.today_count || 0,
              membership_type: progressData.membership_type || '',
              remaining_count: progressData.remaining_count || 0
            }
          });
        }
      },
      fail: err => {
        console.error('获取课时进度失败:', err);
      }
    });
  },

  // 加载课时记录
  loadCourseRecords(refresh = false) {
    const userInfo = this.data.userInfo;
    if (!userInfo || !userInfo._id) return;

    if (refresh) {
      this.setData({
        page: 1,
        courseRecords: [],
        hasMore: true
      });
    }

    if (!this.data.hasMore) return;

    this.setData({ loading: true });

    wx.cloud.callFunction({
      name: 'taekwondoFunctions',
      data: {
        type: 'getCourseRecords',
        studentId: userInfo._id,
        page: this.data.page,
        pageSize: this.data.pageSize
      },
      success: res => {
        wx.stopPullDownRefresh();
        
        if (res.result && res.result.success && res.result.data) {
          const newRecords = res.result.data.list || [];
          const total = res.result.data.total || 0;
          
          this.setData({
            courseRecords: refresh ? newRecords : [...this.data.courseRecords, ...newRecords],
            total: total,
            page: this.data.page + 1,
            hasMore: this.data.courseRecords.length + newRecords.length < total,
            loading: false
          });
        } else {
          this.setData({ loading: false });
        }
      },
      fail: err => {
        wx.stopPullDownRefresh();
        console.error('获取课时记录失败:', err);
        this.setData({ loading: false });
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        });
      }
    });
  },

  // 格式化时间
  formatTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}`;
  }
});

