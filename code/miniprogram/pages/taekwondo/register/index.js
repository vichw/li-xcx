// 报名页面
const app = getApp();

Page({
  data: {
    phoneNumber: '', // 电话号码
    agreedToTerms: false, // 是否同意协议
    qrCodeUrl: '', // 二维码图片地址
    loading: false
  },

  onLoad: function () {
    // 页面加载时生成二维码
    this.generateQrCode();
  },

  // 输入手机号
  inputPhoneNumber: function (e) {
    this.setData({
      phoneNumber: e.detail.value
    });
  },

  // 生成二维码
  generateQrCode: function () {
    const that = this;
    that.setData({
      loading: true
    });

    // 调用云函数生成小程序码
    wx.cloud.callFunction({
      name: 'taekwondoFunctions',
      data: {
        type: 'genMpQrcode',
        page: 'pages/taekwondo/register/index',
        scene: 'register',
      },
      success: res => {
        console.log('生成二维码成功', res);
        if (res.result && res.result.fileID) {
          that.setData({
            qrCodeUrl: res.result.fileID,
            loading: false
          });
        } else {
          // 如果没有返回fileID，则使用临时图片
          that.setData({
            qrCodeUrl: '/images/temp-qrcode.png',
            loading: false
          });
          console.error('生成二维码失败，使用临时图片');
        }
      },
      fail: err => {
        console.error('生成二维码失败', err);
        // 失败时使用临时图片
        that.setData({
          qrCodeUrl: '/images/temp-qrcode.png',
          loading: false
        });
        
        wx.showToast({
          title: '二维码生成失败',
          icon: 'none'
        });
      }
    });
  },

  // 提交报名信息
  submitRegistration: function () {
    const { phoneNumber, agreedToTerms } = this.data;
    
    // 验证是否同意协议
    if (!agreedToTerms) {
      wx.showToast({
        title: '请先阅读并同意用户协议',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    // 校验手机号
    if (!phoneNumber || phoneNumber.length !== 11) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      });
      return;
    }
    
    // 显示加载提示
    wx.showLoading({
      title: '提交中...',
      mask: true
    });
    
    // 调用云函数提交报名信息
    wx.cloud.callFunction({
      name: 'taekwondoFunctions',
      data: {
        type: 'submitRegistration',
        phoneNumber: phoneNumber
      },
      success: res => {
        wx.hideLoading();
        console.log('提交报名信息成功', res);
        
        if (res.result && res.result.success) {
          wx.showModal({
            title: '报名成功',
            content: res.result.message,
            showCancel: false,
            success: () => {
              // 重置手机号
              this.setData({
                phoneNumber: ''
              });
            }
          });
        } else {
          // 根据不同的错误码显示不同提示
          let message = res.result.message;
          
          switch (res.result.code) {
            case 'ALREADY_MEMBER':
            case 'ALREADY_REGISTERED':
            case 'MEMBERSHIP_EXPIRED':
            case 'NO_REMAINING_COUNT':
            case 'MEMBERSHIP_NOT_ACTIVE':
            case 'MEMBERSHIP_SUSPENDED':
            case 'PENDING_REVIEW':
            case 'APPROVED':
            case 'REJECTED':
              message = res.result.message;
              break;
            default:
              message = res.result.message;
          }
          
          wx.showModal({
            title: '提示',
            content: message,
            showCancel: false
          });
        }
      },
      fail: err => {
        wx.hideLoading();
        console.error('提交报名信息失败', err);
        
        wx.showToast({
          title: '报名失败，请稍后再试',
          icon: 'none'
        });
      }
    });
  },
  
  // 保存二维码到相册
  saveQrCode: function () {
    if (!this.data.qrCodeUrl) {
      wx.showToast({
        title: '二维码不存在',
        icon: 'none'
      });
      return;
    }
    
    wx.showLoading({
      title: '保存中...'
    });
    
    // 下载云存储的图片
    wx.cloud.downloadFile({
      fileID: this.data.qrCodeUrl,
      success: res => {
        console.log('下载成功', res);
        
        // 保存图片到相册
        wx.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success: () => {
            wx.hideLoading();
            wx.showToast({
              title: '保存成功',
              icon: 'success'
            });
          },
          fail: err => {
            wx.hideLoading();
            console.error('保存失败', err);
            
            if (err.errMsg.indexOf('auth deny') >= 0) {
              wx.showModal({
                title: '提示',
                content: '需要您授权保存图片到相册',
                showCancel: false
              });
            } else {
              wx.showToast({
                title: '保存失败',
                icon: 'none'
              });
            }
          }
        });
      },
      fail: err => {
        wx.hideLoading();
        console.error('下载失败', err);
        
        wx.showToast({
          title: '下载失败',
          icon: 'none'
        });
      }
    });
  },
  
  // 拨打电话
  makePhoneCall: function () {
    wx.makePhoneCall({
      phoneNumber: '15048940005', // 替换为真实的电话号码
      fail: err => {
        console.error('拨打电话失败', err);
      }
    });
  },

  /**
   * 协议勾选状态变化
   */
  onAgreementChange: function(e) {
    const checked = e.detail.value.length > 0;
    this.setData({
      agreedToTerms: checked
    });
  },

  /**
   * 查看用户服务协议
   */
  viewServiceAgreement: function() {
    wx.navigateTo({
      url: '/pages/taekwondo/agreement/service-agreement'
    });
  },

  /**
   * 查看隐私政策
   */
  viewPrivacyPolicy: function() {
    wx.navigateTo({
      url: '/pages/taekwondo/agreement/privacy-policy'
    });
  }
});
