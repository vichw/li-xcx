// 隐私政策
Page({
  data: {},

  onLoad(options) {
    wx.setNavigationBarTitle({
      title: '隐私政策'
    });
  },

  // 返回
  goBack() {
    wx.navigateBack();
  }
});

