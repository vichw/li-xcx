// pages/feedback/feedback-submit/index.js
Page({
  data: {
    feedbackType: 'complaint',  // complaint/suggestion
    categories: [],  // 投诉类别列表
    formData: {
      category: '',
      category_name: '',
      title: '',
      content: '',
      images: [],
      user_name: '',
      user_phone: ''
    },
    titleMaxLength: 30,
    contentMaxLength: 500,
    maxImages: 5
  },

  onLoad(options) {
    // 如果从其他页面传递了类型，设置默认类型
    if (options.type === 'suggestion') {
      this.setData({
        feedbackType: 'suggestion'
      });
    }
    
    // 加载投诉类别
    this.loadCategories();
    
    // 加载用户信息
    this.loadUserInfo();
  },

  /**
   * 加载投诉类别
   */
  async loadCategories() {
    try {
      wx.showLoading({ title: '加载中...' });
      
      const db = wx.cloud.database();
      const result = await db.collection('configs')
        .where({ type: 'complain' })
        .get();
      
      if (result.data && result.data.length > 0) {
        this.setData({
          categories: result.data
        });
      }
      
      wx.hideLoading();
    } catch (error) {
      console.error('加载类别失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '加载类别失败',
        icon: 'none'
      });
    }
  },

  /**
   * 加载用户信息
   */
  async loadUserInfo() {
    try {
      // 从本地存储获取用户信息
      const userInfo = wx.getStorageSync('userInfo');
      
      if (userInfo) {
        this.setData({
          'formData.user_name': userInfo.name || '',
          'formData.user_phone': userInfo.phone || ''
        });
      } else {
        // 如果本地没有，尝试从云端获取
        const db = wx.cloud.database();
        const result = await db.collection('students')
          .where({ _openid: '{openid}' })
          .get();
        
        if (result.data && result.data.length > 0) {
          const user = result.data[0];
          this.setData({
            'formData.user_name': user.name || '',
            'formData.user_phone': user.phone || user.contact || ''
          });
        }
      }
    } catch (error) {
      console.error('加载用户信息失败:', error);
    }
  },

  /**
   * 切换反馈类型
   */
  onTypeChange(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({
      feedbackType: type
    });
  },

  /**
   * 选择类别
   */
  onCategoryChange(e) {
    const index = e.detail.value;
    const category = this.data.categories[index];
    
    this.setData({
      'formData.category': category.value,
      'formData.category_name': category.name
    });
  },

  /**
   * 标题输入
   */
  onTitleInput(e) {
    this.setData({
      'formData.title': e.detail.value
    });
  },

  /**
   * 内容输入
   */
  onContentInput(e) {
    this.setData({
      'formData.content': e.detail.value
    });
  },

  /**
   * 联系方式输入
   */
  onPhoneInput(e) {
    this.setData({
      'formData.user_phone': e.detail.value
    });
  },

  /**
   * 选择图片
   */
  async chooseImage() {
    const { maxImages, formData } = this.data;
    const images = formData.images || [];
    
    if (images.length >= maxImages) {
      wx.showToast({
        title: `最多上传${maxImages}张图片`,
        icon: 'none'
      });
      return;
    }
    
    try {
      const res = await wx.chooseImage({
        count: maxImages - images.length,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      });
      
      // 上传图片
      this.uploadImages(res.tempFilePaths);
    } catch (error) {
      console.error('选择图片失败:', error);
    }
  },

  /**
   * 上传图片到云存储
   */
  async uploadImages(tempFilePaths) {
    wx.showLoading({ title: '上传中...' });
    
    try {
      const uploadPromises = tempFilePaths.map(async (path) => {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        const cloudPath = `feedback-images/${timestamp}-${random}.jpg`;
        
        const result = await wx.cloud.uploadFile({
          cloudPath,
          filePath: path
        });
        
        return result.fileID;
      });
      
      const fileIDs = await Promise.all(uploadPromises);
      
      // 添加到图片列表
      this.setData({
        'formData.images': [...this.data.formData.images, ...fileIDs]
      });
      
      wx.hideLoading();
      wx.showToast({
        title: '上传成功',
        icon: 'success'
      });
    } catch (error) {
      console.error('上传图片失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '上传失败',
        icon: 'none'
      });
    }
  },

  /**
   * 预览图片
   */
  previewImage(e) {
    const index = e.currentTarget.dataset.index;
    const { images } = this.data.formData;
    
    wx.previewImage({
      current: images[index],
      urls: images
    });
  },

  /**
   * 删除图片
   */
  deleteImage(e) {
    const index = e.currentTarget.dataset.index;
    const images = [...this.data.formData.images];
    
    wx.showModal({
      title: '提示',
      content: '确定删除这张图片吗？',
      success: (res) => {
        if (res.confirm) {
          images.splice(index, 1);
          this.setData({
            'formData.images': images
          });
        }
      }
    });
  },

  /**
   * 提交反馈
   */
  async submitFeedback() {
    const { feedbackType, formData } = this.data;
    
    // 表单验证
    if (!formData.category) {
      wx.showToast({
        title: '请选择类别',
        icon: 'none'
      });
      return;
    }
    
    if (!formData.title.trim()) {
      wx.showToast({
        title: '请输入标题',
        icon: 'none'
      });
      return;
    }
    
    if (formData.title.length > this.data.titleMaxLength) {
      wx.showToast({
        title: `标题不能超过${this.data.titleMaxLength}字`,
        icon: 'none'
      });
      return;
    }
    
    if (!formData.content.trim()) {
      wx.showToast({
        title: '请输入详细描述',
        icon: 'none'
      });
      return;
    }
    
    if (formData.content.length > this.data.contentMaxLength) {
      wx.showToast({
        title: `描述不能超过${this.data.contentMaxLength}字`,
        icon: 'none'
      });
      return;
    }
    
    if (!formData.user_phone.trim()) {
      wx.showToast({
        title: '请输入联系方式',
        icon: 'none'
      });
      return;
    }
    
    // 验证手机号格式
    const phoneReg = /^1[3-9]\d{9}$/;
    if (!phoneReg.test(formData.user_phone)) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      });
      return;
    }
    
    try {
      wx.showLoading({ title: '提交中...' });
      
      const result = await wx.cloud.callFunction({
        name: 'feedbackFunctions',
        data: {
          type: 'submitFeedback',
          feedbackType,
          category: formData.category,
          category_name: formData.category_name,
          title: formData.title.trim(),
          content: formData.content.trim(),
          images: formData.images,
          user_phone: formData.user_phone.trim()
        }
      });
      
      wx.hideLoading();
      
      if (result.result && result.result.success) {
        wx.showToast({
          title: '提交成功',
          icon: 'success'
        });
        
        // 延迟返回上一页
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        wx.showToast({
          title: result.result?.message || '提交失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('提交失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '提交失败，请重试',
        icon: 'none'
      });
    }
  }
});

