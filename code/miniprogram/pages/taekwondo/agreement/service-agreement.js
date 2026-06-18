// 用户服务协议
Page({
  data: {},

  onLoad(options) {
    wx.setNavigationBarTitle({
      title: '用户服务协议'
    });
  },

  // 返回
  goBack() {
    wx.navigateBack();
  }
});

