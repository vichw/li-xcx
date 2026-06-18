// pages/taekwondo/competition-detail/index.js
Page({
  data: {
    competitionId: '',
    competition: {},
    subGroups: [],              // 子组列表
    selectedSubGroup: null,     // 当前选中的子组
    brackets: [],
    rounds: [],
    totalRounds: 0,
    results: [],
    activeTab: 'groups',        // groups/bracket/result
    loading: false,
    isAutoGrouping: false       // 是否启用自动分组
  },

  onLoad: function(options) {
    
    if (options.id) {
      this.setData({
        competitionId: options.id
      });
      this.loadCompetitionDetail();
    }
  },

  // 加载比赛详情
  loadCompetitionDetail: function() {
    this.setData({ loading: true });

    wx.cloud.callFunction({
      name: 'competitionFunctions',
      data: {
        type: 'getCompetitionDetail',
        competition_id: this.data.competitionId
      },
      success: res => {
        if (res.result && res.result.success) {
          const { competition, sub_groups, brackets, results } = res.result.data;
          
          // 格式化日期
          competition.start_date = this.formatDate(competition.start_date);
          competition.end_date = this.formatDate(competition.end_date);
          
          // 所有比赛都是自动分组模式
          // 按年龄组分组展示
          const groupedSubGroups = this.groupSubGroups(sub_groups || []);
          
          this.setData({
            competition: competition,
            isAutoGrouping: true,
            subGroups: groupedSubGroups,
            activeTab: 'groups'  // 默认显示分组情况
          });
        } else {
          wx.showToast({
            title: res.result?.message || '加载失败',
            icon: 'none'
          });
        }
        this.setData({ loading: false });
      },
      fail: err => {
        console.error('加载比赛详情失败:', err);
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        });
        this.setData({ loading: false });
      }
    });
  },

  // 按年龄组分组子组
  groupSubGroups: function(subGroups) {
    const grouped = {};
    
    subGroups.forEach(subGroup => {
      const ageGroupKey = subGroup.age_group_name;
      if (!grouped[ageGroupKey]) {
        grouped[ageGroupKey] = {
          age_group_name: ageGroupKey,
          age_group_code: subGroup.age_group_code,
          sub_groups: []
        };
      }
      grouped[ageGroupKey].sub_groups.push(subGroup);
    });
    
    return Object.values(grouped);
  },

  // 选择子组
  selectSubGroup: function(e) {
    const subGroupId = e.currentTarget.dataset.id;
    const subGroupName = e.currentTarget.dataset.name;
    
    this.setData({
      selectedSubGroup: {
        sub_group_id: subGroupId,
        sub_group_name: subGroupName
      },
      loading: true
    });
    
    // 加载该子组的对战表和结果
    this.loadSubGroupData(subGroupId);
  },

  // 加载子组数据
  loadSubGroupData: function(subGroupId) {
    wx.cloud.callFunction({
      name: 'competitionFunctions',
      data: {
        type: 'getCompetitionDetail',
        competition_id: this.data.competitionId,
        sub_group_id: subGroupId
      },
      success: res => {
        if (res.result && res.result.success) {
          const { brackets, results } = res.result.data;
          
          const rounds = this.calculateRounds(brackets || []);
          const totalRounds = brackets && brackets.length > 0 
            ? Math.max(...brackets.map(m => m.round)) 
            : 0;
          
          this.setData({
            brackets: brackets || [],
            rounds: rounds,
            totalRounds: totalRounds,
            results: results || [],
            activeTab: 'bracket',  // 切换到对战表标签
            loading: false
          });
        } else {
          wx.showToast({
            title: '加载失败',
            icon: 'none'
          });
          this.setData({ loading: false });
        }
      },
      fail: err => {
        console.error('加载子组数据失败:', err);
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        });
        this.setData({ loading: false });
      }
    });
  },

  // 返回子组列表
  backToGroups: function() {
    this.setData({
      selectedSubGroup: null,
      brackets: [],
      results: [],
      activeTab: 'groups'
    });
  },

  // 加载比赛结果
  loadResults: function() {
  
    this.setData({ loading: true });
    
    // 判断是否选中了某个子组
    const selectedSubGroup = this.data.selectedSubGroup;
    
    // 如果选中了子组，只获取该子组的结果
    if (selectedSubGroup && selectedSubGroup.sub_group_id) {
      wx.cloud.callFunction({
        name: 'competitionFunctions',
        data: {
          type: 'getResults',
          competition_id: this.data.competitionId,
          sub_group_id: selectedSubGroup.sub_group_id
        },
        success: res => {
          if (res.result && res.result.success) {
            // 单个子组的结果，包装成统一格式
            this.setData({
              results: [{
                sub_group_id: selectedSubGroup.sub_group_id,
                sub_group_name: selectedSubGroup.sub_group_name,
                results: res.result.data || []
              }]
            });
          } else {
            wx.showToast({
              title: res.result?.message || '加载失败',
              icon: 'none'
            });
          }
          this.setData({ loading: false });
        },
        fail: err => {
          console.error('加载比赛结果失败:', err);
          wx.showToast({
            title: '加载失败',
            icon: 'none'
          });
          this.setData({ loading: false });
        }
      });
      return;
    }
    
    // 没有选中子组，获取所有子组的结果
    Promise.all([
      // 获取所有子组（扁平列表）
      wx.cloud.callFunction({
        name: 'competitionFunctions',
        data: {
          type: 'getSubGroups',
          competition_id: this.data.competitionId,
          flat: true  // 获取扁平列表
        }
      }),
      // 获取所有结果数据
      wx.cloud.callFunction({
        name: 'competitionFunctions',
        data: {
          type: 'getResults',
          competition_id: this.data.competitionId
        }
      })
    ]).then(([subGroupsRes, resultsRes]) => {
      if (subGroupsRes.result?.success && resultsRes.result?.success) {
        const subGroups = subGroupsRes.result.data || [];
        const resultsData = resultsRes.result.data || [];
        
        // 创建结果映射（按 sub_group_id）
        const resultsMap = {};
        resultsData.forEach(group => {
          resultsMap[group.sub_group_id] = group.results || [];
        });
        
        // 合并子组和结果数据
        const mergedResults = subGroups.map(subGroup => ({
          sub_group_id: subGroup.sub_group_id,
          sub_group_name: subGroup.sub_group_name,
          results: resultsMap[subGroup.sub_group_id] || []
        }));
        
        this.setData({
          results: mergedResults
        });
      } else {
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        });
      }
      this.setData({ loading: false });
    }).catch(err => {
      console.error('加载比赛结果失败:', err);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
      this.setData({ loading: false });
    });
  },

  // 切换Tab
  switchTab: function(e) {
  
    const tab = e.currentTarget.dataset.tab;
    this.setData({
      activeTab: tab
    });
    
    if (tab === 'result' ) {
      this.loadResults();
    }
  },

  // 计算轮次分组
  calculateRounds: function(brackets) {
    if (!brackets || brackets.length === 0) return [];
    
    const grouped = {};
    brackets.forEach(match => {
      if (!grouped[match.round]) {
        grouped[match.round] = {
          round: match.round,
          matches: []
        };
      }
      grouped[match.round].matches.push(match);
    });
    
    return Object.values(grouped).sort((a, b) => a.round - b.round);
  },

  // 获取轮次标题
  getRoundTitle: function(round, total) {
    if (round === total) return '决赛';
    if (round === total - 1) return '半决赛';
    if (round === total - 2) return '四分之一决赛';
    return `第 ${round} 轮`;
  },

  // 跳转到报名页面
  goToRegister: function() {
    wx.navigateTo({
      url: `/pages/taekwondo/competition-register/index?id=${this.data.competitionId}`
    });
  },

  // 返回
  goBack: function() {
    wx.navigateBack();
  },

  // 格式化日期
  formatDate: function(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // 下拉刷新
  onPullDownRefresh: function() {
    this.loadCompetitionDetail();
    if (this.data.activeTab === 'result') {
      
      this.loadResults();
    }
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  }
});
