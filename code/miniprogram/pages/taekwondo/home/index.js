// 荣誉榜首页
const app = getApp();

Page({
  data: {
    honors: [], // 荣誉记录列表
    loading: false,
    searchKeyword: '',
    isSearching: false,
    pageSize: 20,
    currentPage: 1,
    hasMore: true ,
    isRefresh: false
  },

  onLoad: function (options) {
    console.log('onLoad called');
    this.loadHonors();
  },

  // 跳转到比赛列表
  goToCompetition: function() {
    wx.navigateTo({
      url: '/pages/taekwondo/competition-list/index'
    });
  },

  onShow: function () {
    console.log('onShow triggered, honorRefreshNeeded:', app.globalData.honorRefreshNeeded);
    if (app.globalData.honorRefreshNeeded) {
      console.log('Refreshing honors list due to honorRefreshNeeded flag');
      app.globalData.honorRefreshNeeded = false;
      this.setData({
        honors: [],
        currentPage: 1,
        hasMore: true
      });
      console.log('currentPage set to 0 in onShow');
      this.loadHonors();
    }
  },

  onHide: function () {
    console.log('onHide called');
  },

  onUnload: function () {
    console.log('onUnload called');
  },

  // 加载荣誉列表数据
  // loadHonors: function () {
  //   console.log('loadHonors called, current page:', this.data.currentPage, 'hasMore:', this.data.hasMore);
  //   console.trace('loadHonors called from:');
  //   if (!this.data.hasMore) return;
    
  //   const page = this.data.currentPage;
  //   const size = this.data.pageSize;
  //   const skip = page * size;
    
  //   this.setData({ loading: true });
    
  //   wx.cloud.callFunction({
  //     name: 'taekwondoFunctions',
  //     data: {
  //       skip: skip,
  //       limit: size,
  //       'type':'getHonorList'
  //     }
  //   })
  //   .then(res => {
  //     let honors = res.result.data || [];
  //     let total = res.result.total || 0;
      
  //     // 为每个荣誉项初始化头像错误状态和颜色
  //     honors = honors.map(honor => {
  //       let gradeImg =app.globalData.beltconfig.find(item => item.name === honor.studentGrade)?.image;
        
  //       return {
  //         ...honor,
  //         avatarLoadError: !honor.studentAvatar?true:false, // 初始设为不显示错误
  //         gradeImg:gradeImg
  //       };
  //     });      
  //     debugger
  //     const hasMore = honors.length<total?true:false ;
  //     const allHonors = page === 1 ? honors : [...this.data.honors, ...honors];
      
  //     this.setData({
  //       honors: allHonors,
  //       loading: false,
  //       currentPage: page + 1,
  //       hasMore: hasMore
  //     });
  //   })
  //   .catch(err => {
  //     console.error('获取荣誉列表失败:', err);
  //     this.setData({
  //       loading: false
  //     });
  //     wx.showToast({
  //       title: '加载失败，请重试',
  //       icon: 'none'
  //     });
  //   });
  // },
  loadHonors: function () {
    console.log('loadHonors called, current page:', this.data.currentPage, 'hasMore:', this.data.hasMore);
    
    // 如果正在加载或没有更多数据，则返回
    if (this.data.loading || !this.data.hasMore) return;
    
    // 如果是刷新操作，重置页码
    const page = this.data.isRefresh ? 1 : this.data.currentPage;
    const size = this.data.pageSize;
    const skip = (page - 1) * size;  // 页码通常从1开始
    
    // this.setData({ loading: true });
    
    wx.cloud.callFunction({
      name: 'taekwondoFunctions',
      data: {
        skip: skip,
        limit: size,
        type: 'getHonorList'  // 修正引号位置
      }
    })
    .then(res => {
      if (!res || !res.result) {
        throw new Error('Invalid response format');
      }
      
      const honors = Array.isArray(res.result.data) ? res.result.data : [];
      const total = Number(res.result.total) || 0;
      
      // 处理荣誉数据
      const processedHonors = honors.map(honor => ({
        ...honor,
        avatarLoadError: !honor.studentAvatar,
        gradeImg: app.globalData.beltconfig.find(item => item.name === honor.studentGrade)?.image
      }));
      
      // 计算是否还有更多数据
      const hasMore = (skip + honors.length) < total;
      const allHonors = this.data.isRefresh ? processedHonors : [...this.data.honors, ...processedHonors];
      
      this.setData({
        honors: allHonors,
        loading: false,
        currentPage: page + 1,
        hasMore: hasMore
      });
    })
    .catch(err => {
      console.error('获取荣誉列表失败:', err);
      this.setData({ loading: false });
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none'
      });
    });
  },


  // 头像加载错误处理
  onAvatarError: function(e) {
    console.log('onAvatarError=====>',e)
    
    const index = e.currentTarget.dataset.index;
    const honorsCopy = this.data.honors;
    
    // 标记该项头像加载错误
    honorsCopy[index].avatarLoadError = true;
    
    // 根据姓名生成稳定的背景色
    const studentName = honorsCopy[index].studentName || '';
    honorsCopy[index].avatarColor = this.generateColorFromName(studentName);
    
    this.setData({
      honors: honorsCopy
    });
  },

  // 根据姓名生成固定的背景色
  generateColorFromName: function(name) {
    if (!name) return '#CCCCCC'; // 默认灰色
    
    // 使用姓名的 ASCII 值总和作为颜色生成的种子
    let hashCode = 0;
    for (let i = 0; i < name.length; i++) {
      hashCode += name.charCodeAt(i);
    }
    
    // 预定义一组美观的头像背景颜色
    const colors = [
      '#FF6B6B', // 红色
      '#4ECDC4', // 青色
      '#FF9F1C', // 橙色
      '#6A0572', // 紫色
      '#1A535C', // 深青色
      '#FFD700', // 金色
      '#2EC4B6', // 蓝绿色
      '#E71D36', // 亮红色
      '#3D5A80', // 蓝色
      '#8F2D56'  // 深红色
    ];
    
    // 使用 hashCode 选择一个颜色
    const colorIndex = hashCode % colors.length;
    return colors[colorIndex];
  },

  // 搜索输入处理
  onSearchInput: function(e) {
    this.setData({
      searchKeyword: e.detail.value
    });
  },
  // 执行搜索
  searchHonors: function() {
    const keyword = this.data.searchKeyword.trim();

    console.log('search keyword====>',keyword)
    if (!keyword) {
      // 如果搜索关键词为空，恢复显示全部
      this.setData({
        isSearching: false,
        honors: [],
        currentPage: 0,
        hasMore: true
      });
      console.log('currentPage set to 0 in searchHonors (keyword empty)');
      this.loadHonors()
      return;
    }

    this.setData({ 
      loading: true,
      isSearching: true
    });
    
    wx.cloud.callFunction({
      name: 'taekwondoFunctions',
      data: {
        keyword: keyword,
        'type':'searchHonors'
      }
    })
    .then(res => {

      if(res.result.data){
        const searchResults = res.result.data.map(honor => {
          // 为搜索结果添加随机背景色和头像加载错误标记   
          let gradeImg =app.globalData.beltconfig.find(item => item.name === honor.studentGrade)?.image;         
          return { 
            ...honor, 
            avatarLoadError: !honor.studentAvatar?true:false,
            gradeImg:gradeImg            
          };
        });
        
        this.setData({
          honors: searchResults,
          loading: false,
          hasMore: false // 搜索结果一次性加载全部
  
        });

        
      }
      
    })
    .catch(err => {
      console.error('搜索荣誉失败', err);
      this.setData({
        loading: false
      });
      wx.showToast({
        title: '搜索失败，请重试',
        icon: 'none'
      });
    });
  },

  getRegex: function(){
    return  grade.match(/(\d+)段|级/);
  },

  // 查看荣誉详情
  viewHonorDetail: function (e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/taekwondo/honor-detail/index?id=${id}`
    });
  },

  // 分享荣誉
  shareHonor: function (e) {
     
    const id = e.currentTarget.dataset.id;
    const honor = this.data.honors.find(item => item._id === id);
    
    if (honor) {
      // 增加热度
      wx.cloud.callFunction({
        name: 'taekwondoFunctions',
        data: {
          type: 'increaseHeat',
          honorId: id
        },
        success: res => {
          console.log('增加热度成功', res);
          if (res.result && res.result.success) {
            // 更新本地数据
            const honors = this.data.honors.map(item => {
              if (item._id === id) {
                return {
                  ...item,
                  heatValue: (item.heatValue || 0) + 1
                };
              }
              return item;
            });
            this.setData({ honors });
          }
        }
      });
    }
  },

  // 分享到朋友圈或群聊
  onShareAppMessage: function (res) {
    if (res.from === 'button') {
      // 来自页面内分享按钮
      const id = res.target.dataset.id;
      const honor = this.data.honors.find(item => item._id === id);
      
      return {
        title: `${honor.studentName}的跆拳道荣誉：${honor.awardName}`,
        path: `/pages/taekwondo/home/index`,
        imageUrl: honor.imageUrl || '/images/taekwondo-banner.png'
      };
    }
    
    // 默认分享
    return {
      title: '荣誉榜 - 查看学员的最新成就！',
      path: '/pages/taekwondo/home/index'
    };
  },

  // 上拉加载更多
  onReachBottom: function () {
    if (this.data.hasMore && !this.data.isSearching && !this.data.loading) {
      this.loadHonors();
    }
  },

  // 下拉刷新
  onPullDownRefresh: function () {
    this.setData({
      honors: [],
      currentPage: 0,
      hasMore: true,
      isSearching: false
    });
    console.log('currentPage set to 0 in onPullDownRefresh');
    this.loadHonors();
    wx.stopPullDownRefresh();
  },

  getLevelRegex(){

    return grade.match(/(\d+)级/);
  }
}); 