// app.js
App({

  beltconfig:[],

  onLaunch: function () {


    if (!wx.cloud) {
      console.error("请使用 2.2.3 或以上的基础库以使用云能力");
    } else {
      wx.cloud.init({
        // env 参数说明：
        //   env 参数决定接下来小程序发起的云开发调用（wx.cloud.xxx）会默认请求到哪个云环境的资源
        //   此处请填入环境 ID, 环境 ID 可打开云控制台查看
        //   如不填则使用默认环境（第一个创建的环境）
        env: "",
        traceUser: true,
      });
    }

    this.initBeltConfig();//初始化级别配置

    this.globalData = {
      userInfo: null,
      isLoggedIn: false,
      taekwondoApp: true // 标记为跆拳道应用
    };

    // 启动时检查登录状态
    this.checkLoginStatus();
  },

  initBeltConfig:function(){
    wx.cloud.callFunction({
      name: 'taekwondoFunctions',
      data: {
        type: 'getConfig',
        codetype:'belt_level'
      },
      success: res => {

        console.log('---init config---->',res)

        if (res.result && res.result.success) {
          

          if(res.result.data){
            this.globalData.beltconfig = res.result.data;
          
          this.globalData.beltLabelList = res.result.data.map(belt => belt.name);
          }

          
          
        } 
      },
      fail: err => {
        console.error('获取配置列表失败', err);
        
      }
    });
  },
  
  // 检查登录状态 - 优化版本
  checkLoginStatus: function(callback) {
    const that = this;
    
    // 先检查本地存储
    const localUserInfo = wx.getStorageSync('userInfo');
    if (localUserInfo) {
      try {
        const userData = JSON.parse(localUserInfo);
        if (userData.userInfo && userData.phoneNumber) {
          // 验证服务器端状态
          wx.cloud.callFunction({
            name: 'taekwondoFunctions',
            data: {
              type: 'getUserInfo',
              phoneNumber: userData.phoneNumber
            },
            success: res => {
              if (res.result && res.result.success && res.result.data) {
                // 服务器验证成功，更新全局状态
                that.globalData.isLoggedIn = true;
                that.globalData.userInfo = res.result.data;
                
                if (callback) {
                  callback(true, res.result.data);
                }
              } else {
                // 服务器验证失败，清除本地存储
                that.clearLoginStatus();
                if (callback) {
                  callback(false);
                }
              }
            },
            fail: err => {
              console.error('验证登录状态失败', err);
              // 网络错误时保持本地状态，但标记为需要重新验证
              that.globalData.isLoggedIn = true;
              that.globalData.userInfo = userData.userInfo;
              
              if (callback) {
                callback(true, userData.userInfo);
              }
            }
          });
          return;
        }
      } catch (e) {
        console.error('解析本地用户信息失败', e);
        that.clearLoginStatus();
      }
    }
    
    // 没有本地存储或解析失败
    that.globalData.isLoggedIn = false;
    that.globalData.userInfo = null;
    
    if (callback) {
      callback(false);
    }
  },

  // 清除登录状态
  clearLoginStatus: function() {
    this.globalData.isLoggedIn = false;
    this.globalData.userInfo = null;
    wx.removeStorageSync('userInfo');
  },

  // 设置登录状态
  setLoginStatus: function(userInfo, phoneNumber) {
    this.globalData.isLoggedIn = true;
    this.globalData.userInfo = userInfo;
    
    const loginData = {
      userInfo: userInfo,
      phoneNumber: phoneNumber,
      isLogin: true
    };
    
    wx.setStorageSync('userInfo', JSON.stringify(loginData));
  }
});
