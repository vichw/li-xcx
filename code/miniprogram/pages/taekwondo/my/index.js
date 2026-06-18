// 我的页面
const app = getApp();

Page({
  data: {
    isLogin: false, // 是否已登录
    phoneNumber: '', // 手机号
    agreedToTerms: false, // 是否同意协议
    userInfo: null, // 用户信息
    honorList: [], // 荣誉列表
    loading: false, // 加载状态
    showEditInfo: false, // 是否显示编辑个人信息表单
    // 编辑表单的数据
    formData: {
      name: '',
      avatar: '' // 头像URL
    },

    currentGradeInfo: {}, // 当前级别信息
    nextGradeInfo: {},    // 下一级别信息
    showGradeExamDialog: false, // 考级支付弹窗
    gradeExamPaid: false, // 是否已缴费
    gradeExamPayStatus: '未缴费',
    gradeExamPayTime: '',
    gradeExamScore: null, // 新增：考级成绩
    // 新增历史考级弹窗相关
    showGradeHistoryModal: false,
    gradeExamHistory: [],
    nextGradeExamInfo: null,
    // 会员状态相关
    membershipStatus: '', // 会员状态
    membershipMessage: '', // 会员状态消息
    remainingCount: 0, // 剩余次数
    membershipStartDate: '', // 会员开始日期
    membershipEndDate: '', // 会员结束日期
    hasShownExpiryReminder: false, // 是否已显示过会员到期提醒（本次登录）
    // 投诉建议未读数量
    feedbackUnreadCount: 0,
    // 课时进度相关
    courseProgress: {
      current_grade: '',
      completed_courses: 0,
      required_courses: 0,
      remaining_courses: 0,
      progress: 0,
      can_apply_exam: false,
      today_count: 0,
      remaining_count: 0
    }
  },

  onLoad: function () {
    
    // 检查是否已登录
    this.checkLoginStatus();
  },
  
  onShow: function () {
    console.log('========== onShow 执行 ==========');
    console.log('isLogin:', this.data.isLogin);
    
    if (this.data.isLogin) {
      console.log('✓ 用户已登录，开始加载数据');
      // 先加载用户数据，然后在回调中加载考级信息和会员状态
      this.loadUserData(() => {
        console.log('>>> loadUserData 回调执行');
        console.log('>>> this.data.userInfo 是否存在:', !!this.data.userInfo);
        console.log('>>> userInfo 数据:', this.data.userInfo);
        
        this.loadGradeInfo();
        // 加载考级缴费状态
        this.loadGradeExamPayStatus();
        // 加载课时进度
        this.loadCourseProgress();
        
        // 直接从用户数据中获取会员状态信息，无需再次调用loadMembershipStatus
        if (this.data.userInfo) {
          console.log('✓ userInfo 存在，准备设置会员数据');
          const userInfo = this.data.userInfo;
          
          // 如果 gradeImg 为空，尝试重新获取
          if (!userInfo.gradeImg && userInfo.grade) {
            console.log('检测到 gradeImg 为空，尝试在 onShow 中重新获取');
            const gradeImg = this.getGradeImage(userInfo.grade);
            if (gradeImg) {
              userInfo.gradeImg = gradeImg;
              this.setData({ userInfo: userInfo });
            }
          }
          
          // 格式化日期显示
          const formatDate = (dateStr) => {
            if (!dateStr) return '';
            const date = new Date(dateStr);
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            return `${year}-${month}-${day}`;
          };
         
          console.log('准备 setData，会员数据:', {
            membership_type: userInfo.membership_type,
            membership_end_date: userInfo.membership_end_date,
            remaining_count: userInfo.remaining_count
          });
          
          this.setData({
            membershipStatus: userInfo.status || '',
            membershipMessage: '',
            remainingCount: userInfo.remaining_count || 0,
            membershipStartDate: formatDate(userInfo.membership_start_date),
            membershipEndDate: formatDate(userInfo.membership_end_date)
          }, () => {
            // 检查会员到期状态（在setData回调中执行，确保数据已更新）
            console.log('✓ setData 回调执行，准备检查会员到期状态');
            console.log('最终数据:', {
              membershipEndDate: this.data.membershipEndDate,
              remainingCount: this.data.remainingCount,
              membership_type: this.data.userInfo.membership_type
            });
            
            this.checkMembershipExpiry();
          });
        } else {
          console.warn('❌ userInfo 不存在，无法检查会员到期状态');
        }
      });
      
      // 加载投诉建议未读数量
      this.loadFeedbackUnreadCount();
    } else {
      console.log('❌ 用户未登录');
    }
  },

  // 检查登录状态 - 优化版本
  checkLoginStatus: function () {
    // 使用app.js的统一登录状态检查
    app.checkLoginStatus((isLoggedIn, userInfo) => {
      if (isLoggedIn && userInfo) {
        // 如果 gradeImg 为空，尝试重新获取
        if (!userInfo.gradeImg && userInfo.grade) {
          console.log('检测到 gradeImg 为空，尝试重新获取');
          const gradeImg = this.getGradeImage(userInfo.grade);
          if (gradeImg) {
            userInfo.gradeImg = gradeImg;
            // 更新 app 中的 userInfo
            app.setLoginStatus(userInfo, userInfo.phoneNumber);
          }
        }
        
        // 格式化日期显示
        const formatDate = (dateStr) => {
          if (!dateStr) return '';
          const date = new Date(dateStr);
          const year = date.getFullYear();
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const day = date.getDate().toString().padStart(2, '0');
          return `${year}-${month}-${day}`;
        };
        
        this.setData({
          isLogin: true,
          userInfo: userInfo,
          phoneNumber: userInfo.phoneNumber || '',
          membershipStatus: userInfo.status || '',
          membershipMessage: '',
          remainingCount: userInfo.remaining_count || 0,
          membershipStartDate: formatDate(userInfo.membership_start_date),
          membershipEndDate: formatDate(userInfo.membership_end_date)
        }, () => {
          // 在setData回调中加载数据，确保userInfo已经设置完成
          // 加载用户荣誉数据
          this.loadGradeInfo();
          // 加载考级缴费状态
          this.loadGradeExamPayStatus();
          this.loadUserHonors();
          // 加载课时进度
          this.loadCourseProgress();
          // 检查会员到期状态
          this.checkMembershipExpiry();
        });
      } else {
        // 未登录，清除页面状态
        this.setData({
          isLogin: false,
          userInfo: null,
          phoneNumber: '',
          honorList: [],
          formData: {
            name: '',
            avatar: ''
          }
        });
      }
    });
  },

  // 登录操作
  doLogin: function (e) {
    
    console.log('获取用户信息:',e.detail.userInfo)
    const phoneNumber = this.data.phoneNumber;  
    
    // 验证是否同意协议
    if (!this.data.agreedToTerms) {
      wx.showToast({
        title: '请先阅读并同意用户协议',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    // 验证手机号
    if (!phoneNumber || phoneNumber.length !== 11) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      });
      return;
    }
    wx.showLoading({
      title: '登录中...',
      mask: true
    });

    // 调用云函数进行登录
    wx.cloud.callFunction({
          name: 'taekwondoFunctions',
          data: {
            type: 'userLogin',
            phoneNumber: phoneNumber
          },
          success: res => {

            wx.hideLoading();
            console.log('登录成功', res);
            
            // 使用统一的方法获取级别图片
            const gradeImg = this.getGradeImage(res.result.data.grade);
            console.log('级别图片:', gradeImg);
            console.log('用户数据:', res.result.data);
            
                if (res.result && res.result.success) {
                  // 登录成功，使用app.js的统一状态管理

                  const userInfo = {
                    ...res.result.data,
                    vipPayTimeFmt:this.formatDateTime(res.result.data.vipPayTime),
                    gradeImg: gradeImg
                  };
                  
                  app.setLoginStatus(userInfo, phoneNumber);
                  
                  // 格式化日期显示
                  const formatDate = (dateStr) => {
                    if (!dateStr) return '';
                    const date = new Date(dateStr);
                    const year = date.getFullYear();
                    const month = (date.getMonth() + 1).toString().padStart(2, '0');
                    const day = date.getDate().toString().padStart(2, '0');
                    return `${year}-${month}-${day}`;
                  };
                  
                  this.setData({
                    isLogin: true,
                    userInfo: userInfo,
                    membershipStatus: userInfo.status || '',
                    membershipMessage: '',
                    remainingCount: userInfo.remaining_count || 0,
                    membershipStartDate: formatDate(userInfo.membership_start_date),
                    membershipEndDate: formatDate(userInfo.membership_end_date)
                  }, () => {
                    // 在setData回调中加载数据，确保userInfo已经设置完成
                    // 加载考级信息
                    this.loadGradeInfo();
                    // 加载考级缴费状态
                    this.loadGradeExamPayStatus();
                    // 加载用户荣誉数据
                    this.loadUserHonors();
                    // 加载课时进度
                    this.loadCourseProgress();
                    // 检查会员到期状态
                    this.checkMembershipExpiry();
                  });
                  
                  wx.showToast({
                    title: '登录成功',
                    icon: 'success'
                  });
                } else {
                  // 登录失败
                  wx.showModal({
                    title: '登录失败',
                    content: res.result.message || '手机号未注册或系统错误，请联系管理员',
                    showCancel: false
                  });
                }
              },
              fail: err => {
                wx.hideLoading();
                console.error('登录失败', err);
                
                wx.showToast({
                  title: '登录失败，请稍后再试',
                  icon: 'none'
                });
              }
      });

  },

  // 退出登录
  logout: function () {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: res => {
        if (res.confirm) {
          // 使用app.js的统一状态管理
          app.clearLoginStatus();
          
          this.setData({
            isLogin: false,
            userInfo: null,
            phoneNumber: '',
            honorList: [],
            formData: {
              name: '',
              avatar: ''
            },
            hasShownExpiryReminder: false // 重置提醒标志位
          });
          
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          });
        }
      }
    });
  },

  // 工具函数：格式化时间
  formatDateTime: function(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    const h = date.getHours().toString().padStart(2, '0');
    const min = date.getMinutes().toString().padStart(2, '0');
    const s = date.getSeconds().toString().padStart(2, '0');
    return `${y}-${m}-${d} ${h}:${min}:${s}`;
  },

  // 加载用户数据
  loadUserData: function (callback) {
    const that = this;
    const phoneNumber = this.data.phoneNumber;
    
    if (!phoneNumber) {
      console.error('手机号不存在，无法加载用户数据');
      if (typeof callback === 'function') {
        callback();
      }
      return;
    }
    
    wx.cloud.callFunction({
      name: 'taekwondoFunctions',
      data: {
        type: 'getUserInfo',
        phoneNumber: phoneNumber
      },
      success: res => {
        console.log('获取用户信息成功', res.result.data);
        if (res.result && res.result.data) {
          // 使用统一的方法获取级别图片
          const gradeImg = this.getGradeImage(res.result.data.grade);
          
          // 判断会员状态 - 直接使用数据库中的isVipPaid字段
          let isVipPaid = res.result.data.isVipPaid ;
          let vipPayTimeFmt = '';
          
          // 如果已支付，格式化支付时间
          if (isVipPaid && res.result.data.vipPayTime) {
            vipPayTimeFmt = this.formatDateTime(res.result.data.vipPayTime);
          } else if (isVipPaid && res.result.data.membership_start_date) {
            // 如果没有支付时间但有会员开始日期，使用会员开始日期作为支付时间
            vipPayTimeFmt = this.formatDateTime(res.result.data.membership_start_date);
          }
          
          // 确保会员类型和价格信息存在
          const membership_type = res.result.data.membership_type || '';
          const membership_name = res.result.data.membership_name || '';
          const membership_price = res.result.data.membership_price || 0;
          
          const userInfo = {
            ...res.result.data,
            gradeImg: gradeImg,
            vipPayTimeFmt: vipPayTimeFmt,
            isVipPaid: isVipPaid,
            membership_type: membership_type,
            membership_name: membership_name,
            membership_price: membership_price
          };
          
          that.setData({
            userInfo: userInfo,
            formData: {
              name: res.result.data.name || '',
              avatar: res.result.data.avatar || ''
            }
          }, () => {
            // 更新全局状态和本地存储
            app.setLoginStatus(userInfo, phoneNumber);
            
            // 在setData的回调中执行callback
            if (typeof callback === 'function') {
              callback();
            }
          });
        }
      },
      fail: err => {
        console.error('获取用户信息失败', err);
        if (typeof callback === 'function') {
          callback();
        }
      }
    });
  },

  // 加载会员状态信息
  loadMembershipStatus: function() {
    const phoneNumber = this.data.phoneNumber;
    
    if (!phoneNumber) {
      return;
    }
    
    wx.cloud.callFunction({
      name: 'taekwondoFunctions',
      data: {
        type: 'checkMembershipStatus',
        phoneNumber: phoneNumber
      },
      success: res => {
        
        console.log('获取会员状态成功', res);
        if (res.result && res.result.success) {
          const membershipInfo = res.result.data;
          
          // 格式化日期显示
          const formatDate = (dateStr) => {
            if (!dateStr) return '';
            const date = new Date(dateStr);
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            return `${year}-${month}-${day}`;
          };
          
          this.setData({
            membershipStatus: membershipInfo.status || '',
            membershipMessage: membershipInfo.message || '',
            remainingCount: membershipInfo.remaining_count || 0,
            membershipStartDate: formatDate(membershipInfo.membership_start_date),
            membershipEndDate: formatDate(membershipInfo.membership_end_date)
          });
        } else {
          // 如果没有会员信息，设置默认值
          this.setData({
            membershipStatus: '未开通',
            membershipMessage: '暂无会员信息',
            remainingCount: 0,
            membershipStartDate: '',
            membershipEndDate: ''
          });
        }
      },
      fail: err => {
        console.error('获取会员状态失败', err);
        // 出错时设置默认值
        this.setData({
          membershipStatus: '未知',
          membershipMessage: '获取会员信息失败',
          remainingCount: 0,
          membershipStartDate: '',
          membershipEndDate: ''
        });
      }
    });
  },
 getRegex: function(){

  return  grade.match(/(\d+)段|级/);
 },
  // 加载用户荣誉
  loadUserHonors: function () {
    const that = this;
    that.setData({
      loading: true
    });
    
    wx.cloud.callFunction({
      name: 'taekwondoFunctions',
      data: {
        type: 'getUserHonors',
        phoneNumber:this.data.phoneNumber
      },
      success: res => {
        console.log('获取用户荣誉成功', res);
        
        that.setData({
          honorList: res.result.data || [],
          loading: false
        });
      },
      fail: err => {
        console.error('获取用户荣誉失败', err);
        that.setData({
          loading: false
        });
        
        wx.showToast({
          title: '获取荣誉数据失败',
          icon: 'none'
        });
      }
    });
  },



  // 显示编辑个人信息表单
  showEditForm: function () {     
    this.loadUserData();
    
    this.setData({
      showEditInfo: true
    });
  },

  // 隐藏编辑个人信息表单
  hideEditForm: function () {
    this.setData({
      showEditInfo: false
    });
  },

  // 表单输入事件处理
  inputFormField: function (e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    
    // 更新对应字段的值
    this.setData({
      [`formData.${field}`]: value
    });
  },

  // 提交个人信息表单
  submitForm: function () {
    const formData = this.data.formData;
    
    // 表单验证
    if (!formData.name || formData.name.trim() === '') {
      wx.showToast({
        title: '请输入姓名',
        icon: 'none'
      });
      return;
    }
    
    wx.showLoading({
      title: '保存中...',
      mask: true
    });
    
    // 调用云函数更新用户信息
    wx.cloud.callFunction({
      name: 'taekwondoFunctions',
      data: {
        type: 'updateUserInfo',
        userInfo: {
          name: formData.name,
          avatar: formData.avatar,
          phoneNumber: this.data.phoneNumber
        }  
      },
      success: res => {
        wx.hideLoading();
        console.log('更新用户信息成功', res);
        
        if (res.result && res.result.success) {
          
          this.loadUserData();

          this.setData({
            showEditInfo: false
          })
        } else {
          wx.showToast({
            title: '保存失败，请稍后再试',
            icon: 'none'
          });
        }
      },
      fail: err => {
        wx.hideLoading();
        console.error('更新用户信息失败', err);
        
        wx.showToast({
          title: '保存失败，请稍后再试',
          icon: 'none'
        });
      }
    });
  },

  // 上传头像
  uploadAvatar: function () {
    const that = this;
    
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: res => {
        const tempFilePath = res.tempFilePaths[0];
        
        wx.showLoading({
          title: '上传中...',
          mask: true
        });
        
        // 上传图片到云存储
        const uploadTask = wx.cloud.uploadFile({
          cloudPath: `avatars/${Date.now()}.jpg`,
          filePath: tempFilePath,
          success: uploadRes => {
            console.log('上传成功', uploadRes);                        
            // 更新头像URL
            const fileID = uploadRes.fileID;
            that.setData(
              {                
                'formData.avatar': fileID // 使用字符串路径更新嵌套对象
               
            });
            
            wx.hideLoading();
            wx.showToast({
              title: '上传成功',
              icon: 'success'
            });
          },
          fail: err => {
            wx.hideLoading();
            console.error('上传失败', err);
            
            wx.showToast({
              title: '上传失败，请稍后再试',
              icon: 'none'
            });
          }
        });
      }
    });
  },



  // 处理会员费支付
  handleVipPay: function() {
    const { userInfo } = this.data;
    
    // 检查是否有会员类型和价格信息
    if (!userInfo.membership_type || !userInfo.membership_price) {
      wx.showToast({
        title: '会员信息不完整，请联系管理员',
        icon: 'none'
      });
      return;
    }
    
    wx.showModal({
      title: '确认支付会员费',
      content: `会员类型: ${userInfo.membership_type}\n会员卡: ${userInfo.membership_name || '标准卡'}\n金额: ¥${userInfo.membership_price}`,
      confirmText: '确认支付',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.createVipPayOrder();
        }
      }
    });
  },

  // 创建会员支付订单
  createVipPayOrder: function() {
    wx.showLoading({
      title: '正在创建订单...'
    });
    
    // 调用云函数获取支付参数
    wx.cloud.callFunction({
      name: 'taekwondoFunctions', 
      data: {
        studentId: this.data.userInfo._id,
        type: 'createVipPayment',
        membershipType: this.data.userInfo.membership_type,
        membershipName: this.data.userInfo.membership_name,
        membershipPrice: this.data.userInfo.membership_price
      }
    }).then(res => {
      wx.hideLoading();
      if(res.result.success) {
        this.startWxPay(res.result.payParams);
      } else {
        wx.showToast({
          title: res.result.error || '创建订单失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({
        title: '创建订单失败',
        icon: 'none'
      });
      console.error('创建订单失败', err);
    });
  },

  // 发起微信支付
  startWxPay: function(payParams) {
    console.log('开始发起支付，参数:', payParams);
    
    // 检查支付参数
    if (!payParams || !payParams.payment) {
      console.error('支付参数错误:', payParams);
      wx.showToast({
        title: '支付参数错误',
        icon: 'none'
      });
      return;
    }

    wx.requestPayment({
      timeStamp: payParams.payment.timeStamp,
      nonceStr: payParams.payment.nonceStr,
      package: payParams.payment.package,
      signType: payParams.payment.signType,
      paySign: payParams.payment.paySign,
      success: () => {
        console.log('支付成功');
        // 支付成功后，主动查询订单状态
        if (payParams.outTradeNo) {
          this.checkOrderStatus(payParams.outTradeNo);
        } else {
          wx.showToast({
            title: '未获取到订单号',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('支付失败', err);
        // 支付失败时，也查询订单状态，因为可能是用户取消支付
        if (payParams.outTradeNo) {
          this.checkOrderStatus(payParams.outTradeNo);
        } else {
          wx.showToast({
            title: '支付失败',
            icon: 'none'
          });
        }
      }
    });
  },

  // 查询订单状态
  checkOrderStatus: function(orderNo) {
    console.log('查询订单状态:', orderNo);
    wx.showLoading({
      title: '查询订单状态...'
    });

    // 添加重试机制
    const maxRetries = 3;
    const retryInterval = 2000; // 2秒
    let retryCount = 0;

    const checkStatus = () => {
      wx.cloud.callFunction({
        name: 'taekwondoFunctions',
        data: {
          type: 'checkOrderStatus',
          orderNo: orderNo
        }
      }).then(res => {
        
        wx.hideLoading();
        console.log('订单状态查询结果:', res);
        
        if (res.result && res.result.success) {
          if (res.result.data.status === 1) {
            wx.showToast({
              title: '支付成功'
            });
            
            // 更新本地用户信息的支付状态
            if (this.data.userInfo) {
              const userInfo = this.data.userInfo;
              userInfo.isVipPaid = true; // 设置为布尔值true，对应数据库中的1
              
              if (res.result.data.pay_time) {
                userInfo.vipPayTime = res.result.data.pay_time;
                userInfo.vipPayTimeFmt = this.formatDateTime(res.result.data.pay_time);
              }
              
              this.setData({ userInfo: userInfo });
              
              // 更新全局状态
              app.setLoginStatus(userInfo, this.data.phoneNumber);
            }
            
            this.loadUserData(); // 刷新用户信息
          } else if (retryCount < maxRetries) {
            // 如果订单未支付成功且未达到最大重试次数，则继续重试
            retryCount++;
            setTimeout(() => {
              checkStatus();
            }, retryInterval);
          } else {
            wx.showToast({
              title: '支付处理中',
              icon: 'none'
            });
          }
        } else {
          wx.showToast({
            title: '查询订单失败',
            icon: 'none'
          });
        }
      }).catch(err => {
        wx.hideLoading();
        console.error('查询订单状态失败:', err);
        if (retryCount < maxRetries) {
          // 如果查询失败且未达到最大重试次数，则继续重试
          retryCount++;
          setTimeout(() => {
            checkStatus();
          }, retryInterval);
        } else {
          wx.showToast({
            title: '查询订单失败',
            icon: 'none'
          });
        }
      });
    };

    // 开始第一次查询
    checkStatus();
  },

  // 加载考级信息
  loadGradeInfo: function() {
    const that = this;
    if (!that.data.userInfo) {
      console.log('用户信息未加载完成，跳过加载考级信息');
      return;
    }
    
    // 查询 configs，type=belt_level，获取所有级别
    wx.cloud.database().collection('configs')
      .where({ type: 'belt_level' })
      .get({
        success: res => {
          const beltList = res.data;

          // ===== 调试日志开始 =====
          console.log('=== loadGradeInfo 调试 ===');
          console.log('userInfo.grade:', that.data.userInfo.grade, '| type:', typeof that.data.userInfo.grade);
          console.log('beltList 条数:', beltList.length);
          beltList.forEach(item => {
            console.log('  belt item - name:', item.name, '| index:', item.index, '| index type:', typeof item.index);
          });
          // ===== 调试日志结束 =====

          // 默认值
          let current = null;
          let next = null;

          // 如果用户有等级信息，找到对应的当前级别和下一级别
          if (that.data.userInfo.grade) {
            // 找到当前级别
            current = beltList.find(item => item.name === that.data.userInfo.grade);
            console.log('匹配当前级别结果 current:', current ? current.name : '未找到');

            // 找到下一级别
            if (current) {
              next = beltList.find(item => item.index === current.index + 1);
              console.log('查找下一级别: current.index =', current.index, '| 查找 index =', current.index + 1, '| 结果 next:', next ? next.name : '未找到');
            }
          } else {
            console.log('userInfo.grade 为空，使用默认最低级别');
            // 如果用户没有等级信息，默认使用最低级别
            if (beltList.length > 0) {
              // 找到索引最小的级别作为当前级别
              current = beltList.reduce((min, item) =>
                (item.index < min.index) ? item : min, beltList[0]);
              console.log('默认当前级别:', current.name, '| index:', current.index);

              // 找到下一级别
              next = beltList.find(item => item.index === current.index + 1);
              console.log('默认查找下一级别 index =', current.index + 1, '| 结果 next:', next ? next.name : '未找到');
            }
          }

          console.log('最终结果 - currentGradeInfo:', current || {});
          console.log('最终结果 - nextGradeInfo:', next || {});
          console.log('=== loadGradeInfo 调试结束 ===');

          that.setData({
            currentGradeInfo: current || {},
            nextGradeInfo: next || {}
          }, () => {
            that.loadNextGradeExamInfo();
          });
          
          // 查询最近一次考级成绩
          that.loadLatestGradeExamScore();
        },
        fail: err => {
          console.error('加载考级信息失败', err);
          wx.showToast({
            title: '加载考级信息失败',
            icon: 'none'
          });
        }
      });
  },

  // 新增：查询下一级别的报名/缴费信息
  loadNextGradeExamInfo: function() {
    const studentId = this.data.userInfo && this.data.userInfo._id;
    const nextIndex = this.data.nextGradeInfo && this.data.nextGradeInfo.index;
    if (!studentId || nextIndex === undefined) {
      this.setData({ nextGradeExamInfo: null });
      return;
    }
    wx.cloud.database().collection('gradeExams')
      .where({
        student_id: studentId,
        next_index: nextIndex
      })
      .orderBy('create_time', 'desc')
      .limit(1)
      .get({
        success: res => {
          if (res.data && res.data.length > 0) {
            this.setData({ nextGradeExamInfo: res.data[0] });
          } else {
            this.setData({ nextGradeExamInfo: null });
          }
        },
        fail: err => {
          this.setData({ nextGradeExamInfo: null });
        }
      });
  },

  // 新增：查询最近一次考级成绩
  loadLatestGradeExamScore: function() {
    const that = this;
    const studentId = that.data.userInfo && that.data.userInfo._id;
    if (!studentId) return;
    wx.cloud.database().collection('gradeExams')
      .where({ student_id: studentId })
      .orderBy('create_time', 'desc')
      .limit(1)
      .get({
        success: res => {
          if (res.data && res.data.length > 0) {
            that.setData({ gradeExamScore: res.data[0] });
          } else {
            that.setData({ gradeExamScore: null });
          }
        },
        fail: err => {
          that.setData({ gradeExamScore: null });
        }
      });
  },

  // 报名考级
  handleGradeExamApply: function() {
    const { userInfo, nextGradeInfo } = this.data;
    
    // 移除会员费校验，考级与会员费无依赖关系
    
    if (!userInfo.avatar) {
      wx.showModal({
        title: '请先上传头像',
        content: '请在个人信息中维护头像后再报名考级',
        showCancel: false
      });
      return;
    }
    
    if (!nextGradeInfo.name) {
      console.log('=== 报名考级被阻止 ===');
      console.log('nextGradeInfo:', nextGradeInfo);
      console.log('currentGradeInfo:', this.data.currentGradeInfo);
      console.log('userInfo.grade:', userInfo.grade);
      wx.showToast({ title: '暂无下一级别可报名', icon: 'none' });
      return;
    }
    wx.showModal({
      title: '确认报名考级',
      content: `是否确认支付 ￥${nextGradeInfo.value} 报名 ${nextGradeInfo.name}？`,
      confirmText: '确认支付',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.handleGradeExamPay();
        }
      }
    });
  },

  // 确认并支付考级报名费
  handleGradeExamPay: function() {
    const { userInfo, currentGradeInfo, nextGradeInfo } = this.data;
    const that = this;
    wx.showLoading({ title: '创建订单...' });
    wx.cloud.callFunction({
      name: 'createGradeExamOrder',
      data: {
        studentId: userInfo._id,
        currentIndex: currentGradeInfo.index,
        currentGrade: currentGradeInfo.name,
        avatar: userInfo.avatar
      },
      success: res => {
        wx.hideLoading();
        if (res.result.success) {
          that.startGradeExamPay(res.result.payParams);
        } else {
          wx.showToast({ title: res.result.error || '创建订单失败', icon: 'none' });
        }
      },
      fail: err => {
        wx.hideLoading();
        wx.showToast({ title: '创建订单失败', icon: 'none' });
      }
    });
  },

  // 发起微信支付
  startGradeExamPay: function(payParams) {
    const that = this;
    wx.requestPayment({
      timeStamp: payParams.payment.timeStamp,
      nonceStr: payParams.payment.nonceStr,
      package: payParams.payment.package,
      signType: payParams.payment.signType,
      paySign: payParams.payment.paySign,
      success: () => {
        if (payParams.outTradeNo) {
          that.checkGradeExamOrderStatus(payParams.outTradeNo);
        } else {
          wx.showToast({ title: '未获取到订单号', icon: 'none' });
        }
      },
      fail: (err) => {
        if (payParams.outTradeNo) {
          that.checkGradeExamOrderStatus(payParams.outTradeNo);
        } else {
          wx.showToast({ title: '支付失败', icon: 'none' });
        }
      }
    });
  },

  // 查询考级订单状态
  checkGradeExamOrderStatus: function(orderNo) {
    const that = this;
    wx.showLoading({ title: '查询订单状态...' });
    wx.cloud.callFunction({
      name: 'taekwondoFunctions',
      data: { 
        type: 'checkOrderStatus',
        orderNo: orderNo
      },
      success: res => {
        wx.hideLoading();
        if (res.result && res.result.success && res.result.data.status === 1) {
          wx.showToast({ title: '考级报名成功' });
          // 新增：保存缴费状态和时间
          that.setData({
            gradeExamPayStatus: '已缴费',
            gradeExamPayTime: that.formatDateTime(res.result.data.pay_time),
            gradeExamPaid: true
          });
          that.loadGradeInfo(); // 刷新考级信息
        } else {
          wx.showToast({ title: '支付未完成', icon: 'none' });
        }
      },
      fail: err => {
        wx.hideLoading();
        console.error('查询考级订单状态失败:', err);
        wx.showToast({ title: '查询订单失败', icon: 'none' });
      }
    });
  },

  // 查询当前用户最新的考级报名订单状态
  loadGradeExamPayStatus: function() {
    const that = this;
    const studentId = this.data.userInfo && this.data.userInfo._id;
    if (!studentId) {
      that.setData({
        gradeExamPaid: false,
        gradeExamPayStatus: '未缴费',
        gradeExamPayTime: ''
      });
      return;
    }
    wx.cloud.database().collection('orders')
      .where({
        student_id: studentId,
        order_type: 2, // 考级报名
        status: 1      // 已支付
      })
      .orderBy('pay_time', 'desc')
      .limit(1)
      .get({
        success: res => {
          if (res.data && res.data.length > 0) {
            that.setData({
              gradeExamPaid: true,
              gradeExamPayStatus: '已缴费',
              gradeExamPayTime: that.formatDateTime(res.data[0].pay_time)
            });
          } else {
            that.setData({
              gradeExamPaid: false,
              gradeExamPayStatus: '未缴费',
              gradeExamPayTime: ''
            });
          }
        },
        fail: err => {
          that.setData({
            gradeExamPaid: false,
            gradeExamPayStatus: '未缴费',
            gradeExamPayTime: ''
          });
        }
      });
  },

  // 显示历史考级弹窗
  showGradeHistory() {
    this.setData({ showGradeHistoryModal: true });
    this.fetchGradeExamHistory();
  },

  // 关闭历史考级弹窗
  closeGradeHistory() {
    this.setData({ showGradeHistoryModal: false });
  },

  // 获取历史考级数据
  async fetchGradeExamHistory() {
    const userInfo = this.data.userInfo;
    if (!userInfo || !userInfo._id) return;
    wx.showLoading({ title: '加载中' });
    try {
      const res = await wx.cloud.callFunction({
        name: 'taekwondoFunctions',
        data: {
          type: 'getGradeExamHistory',
          student_id: userInfo._id
        }
      });
      wx.hideLoading();
      this.setData({ gradeExamHistory: res.result || [] });
    } catch (e) {
      wx.hideLoading();
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  // 跳转到历史考级页面
  goToGradeHistory() {
    wx.navigateTo({
      url: '/pages/taekwondo/grade-history/index'
    });
  },

  /**
   * 加载投诉建议未读数量
   */
  async loadFeedbackUnreadCount() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'feedbackFunctions',
        data: {
          type: 'getUnreadCount'
        }
      });
      
      if (result.result && result.result.success) {
        this.setData({
          feedbackUnreadCount: result.result.count || 0
        });
      }
    } catch (error) {
      console.error('加载未读数量失败:', error);
    }
  },

  /**
   * 跳转到投诉建议列表
   */
  goToFeedback() {
    wx.navigateTo({
      url: '/pages/taekwondo/feedback/feedback-list/index'
    });
  },

  /**
   * 加载课时进度
   */
  loadCourseProgress() {
    const that = this;
    const userInfo = this.data.userInfo;
    
    if (!userInfo || !userInfo._id) {
      console.log('用户信息不存在，跳过加载课时进度');
      return;
    }
    
    wx.cloud.callFunction({
      name: 'taekwondoFunctions',
      data: {
        type: 'getCourseProgress',
        studentId: userInfo._id
      },
      success: res => {
        console.log('获取课时进度成功:', res);
        if (res.result && res.result.success) {
          // 确保数据安全，兼容历史数据
          const progressData = res.result.data || {};
          that.setData({
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

  /**
   * 消课操作
   */
  handleConsumeCourse() {
    const that = this;
    const userInfo = this.data.userInfo;
    const courseProgress = this.data.courseProgress;
    
    if (!userInfo || !userInfo._id) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }
    
    // 检查次卡会员剩余次数
    if (userInfo.membership_type === '按次' && (courseProgress.remaining_count || 0) <= 0) {
      wx.showToast({
        title: '课时次数不足，请续费',
        icon: 'none'
      });
      return;
    }
    
    // 检查今日是否已消课
    if (courseProgress.today_count > 0) {
      wx.showModal({
        title: '重复消课确认',
        content: `今日已消课 ${courseProgress.today_count} 次，是否继续？`,
        confirmText: '继续消课',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            that.doConsumeCourse(true);
          }
        }
      });
      return;
    }
    
    // 首次消课确认
    wx.showModal({
      title: '签到消课',
      content: userInfo.membership_type === '按次' 
        ? `确定签到消课吗？\n当前剩余：${courseProgress.remaining_count || 0} 次`
        : '确定签到消课吗？\n（年卡会员不扣次数）',
      confirmText: '确定',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          that.doConsumeCourse(false);
        }
      }
    });
  },

  /**
   * 执行消课
   */
  doConsumeCourse(confirmRepeat) {
    const that = this;
    const userInfo = this.data.userInfo;
    
    wx.showLoading({
      title: '消课中...',
      mask: true
    });
    
    wx.cloud.callFunction({
      name: 'taekwondoFunctions',
      data: {
        type: 'consumeCourse',
        studentId: userInfo._id,
        operatorSource: 'miniprogram',
        operator: userInfo.name,
        remark: '',
        confirmRepeat: confirmRepeat
      },
      success: res => {
        wx.hideLoading();
        console.log('消课结果:', res);
        
        if (res.result && res.result.success) {
          wx.showToast({
            title: '消课成功',
            icon: 'success'
          });
          // 刷新课时进度
          that.loadCourseProgress();
          // 刷新用户数据
          that.loadUserData();
        } else if (res.result && res.result.needConfirm) {
          // 需要确认重复消课
          wx.showModal({
            title: '重复消课确认',
            content: res.result.message,
            confirmText: '继续消课',
            cancelText: '取消',
            success: (modalRes) => {
              if (modalRes.confirm) {
                that.doConsumeCourse(true);
              }
            }
          });
        } else {
          wx.showToast({
            title: res.result.message || '消课失败',
            icon: 'none'
          });
        }
      },
      fail: err => {
        wx.hideLoading();
        console.error('消课失败:', err);
        wx.showToast({
          title: '消课失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 跳转到课时记录页面
   */
  goToCourseRecords() {
    wx.navigateTo({
      url: '/pages/taekwondo/course-records/index'
    });
  },

  /**
   * 协议勾选状态变化
   */
  onAgreementChange(e) {
    const checked = e.detail.value.length > 0;
    this.setData({
      agreedToTerms: checked
    });
  },

  /**
   * 查看用户服务协议
   */
  viewServiceAgreement() {
    wx.navigateTo({
      url: '/pages/taekwondo/agreement/service-agreement'
    });
  },

  /**
   * 查看隐私政策
   */
  viewPrivacyPolicy() {
    wx.navigateTo({
      url: '/pages/taekwondo/agreement/privacy-policy'
    });
  },

  /**
   * 检查会员到期状态
   * - 年卡会员：检查是否已过期或7天内即将过期
   * - 按次会员：检查剩余次数是否用完或不足5次
   */
  checkMembershipExpiry() {
    const { userInfo, membershipEndDate, remainingCount, hasShownExpiryReminder } = this.data;
    
    console.log('========== 会员到期检测开始 ==========');
    console.log('userInfo:', userInfo);
    console.log('membershipEndDate:', membershipEndDate);
    console.log('remainingCount:', remainingCount);
    console.log('hasShownExpiryReminder:', hasShownExpiryReminder);
    
    if (!userInfo) {
      console.log('❌ userInfo 不存在，跳过检测');
      return;
    }
    
    // 如果本次登录已经显示过提醒，则不再显示
    if (hasShownExpiryReminder) {
      console.log('✓ 本次登录已显示过提醒，跳过检测');
      return;
    }
    
    const membershipType = userInfo.membership_type;
    console.log('会员类型:', membershipType);
    
    // 检查年卡会员到期情况
    if (membershipType === '年卡') {
      console.log('✓ 检测到年卡会员，开始检查到期情况');
      this.checkYearCardExpiry(userInfo, membershipEndDate);
    }
    // 检查按次会员剩余次数
    else if (membershipType === '按次') {
      console.log('✓ 检测到按次会员，开始检查剩余次数');
      this.checkCountCardExpiry(userInfo, remainingCount);
    } else {
      console.log('⚠️ 未识别的会员类型:', membershipType);
    }
    console.log('========== 会员到期检测结束 ==========');
  },

  /**
   * 检查年卡会员到期情况
   */
  checkYearCardExpiry(userInfo, membershipEndDate) {
    console.log('--- 年卡会员到期检测 ---');
    console.log('membershipEndDate 参数:', membershipEndDate);
    console.log('userInfo.membership_end_date:', userInfo.membership_end_date);
    
    if (!membershipEndDate || !userInfo.membership_end_date) {
      console.log('❌ 日期数据不完整，跳过检测');
      console.log('membershipEndDate 是否存在:', !!membershipEndDate);
      console.log('userInfo.membership_end_date 是否存在:', !!userInfo.membership_end_date);
      return;
    }
    
    const now = new Date();
    const endDate = new Date(userInfo.membership_end_date);
    
    console.log('当前时间:', now);
    console.log('到期时间:', endDate);
    
    // 计算剩余天数
    const timeDiff = endDate.getTime() - now.getTime();
    const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    
    console.log('时间差(毫秒):', timeDiff);
    console.log('剩余天数:', daysRemaining);
    
    // 已过期
    if (daysRemaining < 0) {
      console.log('🔴 会员已过期，显示弹窗');
      // 设置标志位，表示已显示过提醒
      this.setData({ hasShownExpiryReminder: true });
      wx.showModal({
        title: '会员已过期',
        content: `您的年卡会员已于 ${membershipEndDate} 到期为了不影响您的正常训练，请及时续费！`,
        confirmText: '立即续费',
        cancelText: '稍后再说',
        success: (res) => {
          if (res.confirm) {
            this.goToRenewal();
          }
        }
      });
    }
    // 即将到期（7天内）
    else if (daysRemaining >= 0 && daysRemaining <= 7) {
      console.log('🟠 会员即将到期，显示弹窗');
      // 设置标志位，表示已显示过提醒
      this.setData({ hasShownExpiryReminder: true });
      wx.showModal({
        title: '会员即将到期',
        content: `您的年卡会员还有 ${daysRemaining} 天到期（${membershipEndDate}）\n\n为了不影响您的正常训练，请及时续费！`,
        confirmText: '立即续费',
        cancelText: '稍后再说',
        success: (res) => {
          if (res.confirm) {
            this.goToRenewal();
          }
        }
      });
    } else {
      console.log('✓ 会员正常，剩余天数:', daysRemaining);
    }
  },

  /**
   * 检查按次会员剩余次数
   */
  checkCountCardExpiry(userInfo, remainingCount) {
    console.log('--- 按次会员次数检测 ---');
    console.log('remainingCount 参数:', remainingCount);
    
    const count = remainingCount || 0;
    console.log('实际剩余次数:', count);
    
    // 次数已用完
    if (count === 0) {
      console.log('🔴 次数已用完，显示弹窗');
      // 设置标志位，表示已显示过提醒
      this.setData({ hasShownExpiryReminder: true });
      wx.showModal({
        title: '课时次数已用完',
        content: '您的课时次数已用完，无法继续消课。为了不影响您的正常训练，请及时续费！',
        confirmText: '立即续费',
        cancelText: '稍后再说',
        success: (res) => {
          if (res.confirm) {
            this.goToRenewal();
          }
        }
      });
    }
    // 次数不足5次
    else if (count > 0 && count <= 5) {
      console.log('🟠 次数不足，显示弹窗，剩余:', count);
      // 设置标志位，表示已显示过提醒
      this.setData({ hasShownExpiryReminder: true });
      wx.showModal({
        title: '课时次数不足',
        content: `您的课时次数仅剩 ${count} 次。为了不影响您的正常训练，请及时续费！`,
        confirmText: '立即续费',
        cancelText: '稍后再说',
        success: (res) => {
          if (res.confirm) {
            this.goToRenewal();
          }
        }
      });
    } else {
      console.log('✓ 次数充足，剩余:', count);
    }
  },

  /**
   * 跳转到续费页面（暂时显示提示，后续可实现具体续费页面）
   */
  goToRenewal() {
    wx.showToast({
      title: '请联系教练办理续费',
      icon: 'none',
      duration: 2500
    });
    
    // TODO: 后续可以实现在线续费页面
    // wx.navigateTo({
    //   url: '/pages/taekwondo/renewal/index'
    // });
  },

  /**
   * 获取级别对应的图片
   * @param {string} gradeName - 级别名称
   * @returns {string} 图片路径
   */
  getGradeImage(gradeName) {
    if (!gradeName) {
      console.warn('级别名称为空');
      return '';
    }

    // 检查 beltconfig 是否已加载
    if (!app.globalData.beltconfig || app.globalData.beltconfig.length === 0) {
      console.warn('beltconfig 未加载或为空，尝试使用默认配置');
      // 可以返回一个默认图片路径
      return '';
    }

    // 查找对应级别的图片
    const beltItem = app.globalData.beltconfig.find(item => item.name === gradeName);
    
    if (beltItem && beltItem.image) {
      console.log(`找到级别 ${gradeName} 的图片:`, beltItem.image);
      return beltItem.image;
    } else {
      console.warn(`未找到级别 ${gradeName} 的图片配置`);
      return '';
    }
  }
}); 