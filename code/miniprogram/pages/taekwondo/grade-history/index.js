Page({
  data: {
    gradeExamHistory: []
  },
  onLoad() {
    let userInfo = wx.getStorageSync('userInfo');
    if (userInfo && typeof userInfo === 'string') {
      userInfo = JSON.parse(userInfo);
    }
    const studentId = userInfo && userInfo.userInfo && userInfo.userInfo._id;
    if (studentId) {
      this.fetchGradeExamHistory(studentId);
    } else {
      wx.showToast({ title: '未获取到用户信息', icon: 'none' });
    }
  },
  async fetchGradeExamHistory(studentId) {
    wx.showLoading({ title: '加载中' });
    try {
      const res = await wx.cloud.callFunction({
        name: 'taekwondoFunctions',
        data: {
          type: 'getGradeExamHistory',
          student_id: studentId,
          delete: 1
        }
      });
      wx.hideLoading();
      const paidList = (res.result || []).map(item => ({
        ...item,
        pay_time_fmt: this.formatTime(item.pay_time)
      }));
      this.setData({ gradeExamHistory: paidList });
    } catch (e) {
      wx.hideLoading();
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },
  formatTime(val) {
    if (!val) return '';
    let d = new Date(val);
    if (isNaN(d.getTime())) return val;
    let y = d.getFullYear();
    let m = (d.getMonth() + 1).toString().padStart(2, '0');
    let day = d.getDate().toString().padStart(2, '0');
    let h = d.getHours().toString().padStart(2, '0');
    let min = d.getMinutes().toString().padStart(2, '0');
    let s = d.getSeconds().toString().padStart(2, '0');
    return `${y}-${m}-${day} ${h}:${min}:${s}`;
  }
}); 