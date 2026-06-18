// pages/taekwondo/competition-register/index.js
Page({
  data: {
    competitionId: '',
    competition: {},
    agreedToTerms: false, // 是否同意协议
    formData: {
      student_name: '',
      id_card: '',      // 身份证号
      age: '',          // 从身份证号计算得出
      gender: 'male',   // 从身份证号计算得出
      weight: '',
      contact: ''
    },
    submitting: false
  },

  onLoad: function(options) {
    if (options.id) {
      this.setData({
        competitionId: options.id
      });
      this.loadCompetitionInfo();
    }
  },

  // 加载比赛信息
  loadCompetitionInfo: function() {
    wx.showLoading({
      title: '加载中...'
    });

    wx.cloud.callFunction({
      name: 'competitionFunctions',
      data: {
        type: 'getCompetitionDetail',
        competition_id: this.data.competitionId
      },
      success: res => {
        wx.hideLoading();
        
        if (res.result && res.result.success) {
          const competition = res.result.data.competition;
          
          // 检查报名状态
          if (competition.registration_status !== 'open') {
            wx.showModal({
              title: '提示',
              content: '该比赛报名已截止',
              showCancel: false,
              success: () => {
                wx.navigateBack();
              }
            });
            return;
          }
          
          this.setData({
            competition: competition
          });
        } else {
          wx.showToast({
            title: res.result?.message || '加载失败',
            icon: 'none'
          });
        }
      },
      fail: err => {
        wx.hideLoading();
        console.error('加载比赛信息失败:', err);
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        });
      }
    });
  },

  // 姓名输入
  onNameInput: function(e) {
    this.setData({
      'formData.student_name': e.detail.value
    });
  },

  // 身份证号输入
  onIdCardInput: function(e) {
    const idCard = e.detail.value.toUpperCase();
    
    this.setData({
      'formData.id_card': idCard
    });
    
    // 实时验证并提取信息
    if (idCard.length === 18) {
      const validation = this.validateIdCard(idCard);
      
      if (validation.valid) {
        // 自动填充年龄和性别
        this.setData({
          'formData.age': validation.age,
          'formData.gender': validation.gender
        });
      } else {
        wx.showToast({
          title: '身份证号格式不正确',
          icon: 'none',
          duration: 2000
        });
      }
    }
  },

  // 验证身份证号并提取信息
  validateIdCard: function(idCard) {
    // 18位身份证号正则
    const reg = /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[0-9Xx]$/;
    
    if (!reg.test(idCard)) {
      return { valid: false };
    }
    
    // 提取出生日期
    const year = parseInt(idCard.substr(6, 4));
    const month = parseInt(idCard.substr(10, 2));
    const day = parseInt(idCard.substr(12, 2));
    
    // 计算年龄
    const today = new Date();
    let age = today.getFullYear() - year;
    const monthDiff = today.getMonth() + 1 - month;
    const dayDiff = today.getDate() - day;
    
    // 如果还没过生日，年龄减1
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      age--;
    }
    
    // 提取性别（倒数第二位，奇数为男，偶数为女）
    const genderCode = parseInt(idCard.charAt(16));
    const gender = genderCode % 2 === 1 ? 'male' : 'female';
    
    return {
      valid: true,
      age: age,
      gender: gender
    };
  },

  // 体重输入
  onWeightInput: function(e) {
    this.setData({
      'formData.weight': e.detail.value
    });
  },

  // 联系方式输入
  onContactInput: function(e) {
    this.setData({
      'formData.contact': e.detail.value
    });
  },

  // 验证表单
  validateForm: function() {
    const { student_name, id_card, age, gender, weight } = this.data.formData;
    const competition = this.data.competition;
    
    // 验证是否同意协议
    if (!this.data.agreedToTerms) {
      wx.showToast({
        title: '请先阅读并同意用户协议',
        icon: 'none',
        duration: 2000
      });
      return false;
    }
    
    if (!student_name || !student_name.trim()) {
      wx.showToast({
        title: '请输入姓名',
        icon: 'none'
      });
      return false;
    }
    
    if (!id_card || id_card.length !== 18) {
      wx.showToast({
        title: '请输入18位身份证号',
        icon: 'none'
      });
      return false;
    }
    
    // 验证身份证号格式
    const validation = this.validateIdCard(id_card);
    if (!validation.valid) {
      wx.showToast({
        title: '身份证号格式不正确',
        icon: 'none'
      });
      return false;
    }
    
    if (!age || age < 5 || age > 100) {
      wx.showToast({
        title: '年龄范围异常，请检查身份证号',
        icon: 'none'
      });
      return false;
    }
    
    if (!gender) {
      wx.showToast({
        title: '性别信息异常，请检查身份证号',
        icon: 'none'
      });
      return false;
    }
    
    if (!weight || weight < 20 || weight > 150) {
      wx.showToast({
        title: '请输入有效体重(20-150kg)',
        icon: 'none'
      });
      return false;
    }
    
    return true;
  },

  // 提交报名
  submitRegistration: function() {
    // 验证表单
    if (!this.validateForm()) {
      return;
    }
    
    // 先校验参赛资格
    this.validateEligibility();
  },
  
  // 校验参赛资格
  validateEligibility: function() {
    const { age, gender, weight } = this.data.formData;
    
    wx.showLoading({
      title: '校验中...'
    });
    
    wx.cloud.callFunction({
      name: 'competitionFunctions',
      data: {
        type: 'validateParticipantEligibility',
        competition_id: this.data.competitionId,
        age: parseInt(age),
        gender: gender,
        weight: parseFloat(weight)
      },
      success: res => {
        wx.hideLoading();
        
        if (res.result && res.result.success) {
          if (res.result.eligible) {
            // 符合条件，显示将要分配的子组信息并确认报名
            const subGroupInfo = res.result.sub_group_info;
            debugger
            // 格式化性别组信息
            let genderText = '';
            if (subGroupInfo.gender_group === 'male') {
              genderText = '男子组';
            } else if (subGroupInfo.gender_group === 'female') {
              genderText = '女子组';
            } else {
              genderText = '不分男女';
            }
            
            wx.showModal({
              title: '资格校验通过',
              content: `您符合参赛条件！\n\n将被分配到：\n${subGroupInfo.sub_group_name}\n\n年龄组：${subGroupInfo.age_group_name}\n性别组：${genderText}\n体重级别：${subGroupInfo.weight_category_label}kg\n\n确定要提交报名吗？`,
              confirmText: '确认报名',
              cancelText: '取消',
              success: modalRes => {
                if (modalRes.confirm) {
                  this.doSubmit();
                }
              }
            });
          } else {
            // 不符合条件，显示详细原因
            wx.showModal({
              title: '不符合参赛条件',
              content: `抱歉，您不符合本次比赛的参赛要求。\n\n${res.result.error_reason || res.result.message}`,
              showCancel: false,
              confirmText: '我知道了'
            });
          }
        } else {
          wx.showToast({
            title: res.result?.message || '校验失败',
            icon: 'none'
          });
        }
      },
      fail: err => {
        wx.hideLoading();
        console.error('校验参赛资格失败:', err);
        wx.showToast({
          title: '校验失败，请重试',
          icon: 'none'
        });
      }
    });
  },

  // 执行提交
  doSubmit: function() {
    this.setData({ submitting: true });
    
    wx.showLoading({
      title: '提交中...'
    });

    const { student_name, id_card, age, gender, weight, contact } = this.data.formData;
    
    wx.cloud.callFunction({
      name: 'competitionFunctions',
      data: {
        type: 'register',
        competition_id: this.data.competitionId,
        student_name: student_name.trim(),
        id_card: id_card.trim(),
        age: parseInt(age),
        gender: gender,
        weight: parseFloat(weight),
        contact: contact.trim()
      },
      success: res => {
        wx.hideLoading();
        this.setData({ submitting: false });
        
        if (res.result && res.result.success) {
          // 获取分组信息
          const groupInfo = res.result.groupInfo;
          
          // 格式化性别组信息
          let genderText = '';
          if (groupInfo.gender_group === 'male') {
            genderText = '男子组';
          } else if (groupInfo.gender_group === 'female') {
            genderText = '女子组';
          } else {
            genderText = '不分男女';
          }
          
          const content = `报名成功！\n\n您已被分配到：\n${groupInfo.sub_group_name}\n\n年龄组：${groupInfo.age_group_name}\n性别组：${genderText}\n体重级别：${groupInfo.weight_category_label}kg\n\n请关注对战表发布。`;
          
          wx.showModal({
            title: '报名成功',
            content: content,
            showCancel: false,
            success: () => {
              wx.navigateBack();
            }
          });
        } else {
          wx.showToast({
            title: res.result?.message || '报名失败',
            icon: 'none'
          });
        }
      },
      fail: err => {
        wx.hideLoading();
        this.setData({ submitting: false });
        console.error('提交报名失败:', err);
        wx.showToast({
          title: '提交失败，请重试',
          icon: 'none'
        });
      }
    });
  },

  // 返回
  goBack: function() {
    wx.navigateBack();
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

