<template>
  <div class="bracket-container">
    <div class="header">
      <div>
        <el-button @click="goBack" class="mb-2">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
        <h2 class="text-2xl font-bold text-gray-800">
          🏆 {{ competition?.name }} - 对战表管理
        </h2>
        <div class="info-bar">
          <el-tag :type="getStatusType(competition?.status)">
            {{ getStatusText(competition?.status) }}
          </el-tag>
          <span class="ml-4 text-gray-600">
            参赛人数: {{ competition?.participant_count }}人
          </span>
          <span class="ml-4 text-gray-600">
            {{ formatDate(competition?.start_date) }} - {{ formatDate(competition?.end_date) }}
          </span>
        </div>
      </div>
      <el-button
        v-if="competition?.bracket_generated"
        type="success"
        @click="exportBracket"
      >
        <el-icon><Download /></el-icon>
        导出对战表
      </el-button>
      <el-button
        v-if="competition?.bracket_generated"
        type="warning"
        @click="regenerateBracket"
      >
        <el-icon><Refresh /></el-icon>
        重新生成对战表
      </el-button>
      <el-button
        v-if="isAutoGrouping && selectedSubGroupId"
        type="danger"
        @click="clearBracket"
      >
        <el-icon><Delete /></el-icon>
        清空对战表
      </el-button>
    </div>

    <el-divider />

    <!-- 子组选择器（自动分组模式） -->
    <div v-if="isAutoGrouping" class="sub-group-selector">
      <el-select 
        v-model="selectedSubGroupId"
        placeholder="选择子组查看对战表"
        @change="loadBrackets"
        style="width: 350px"
        size="large"
      >
        <el-option
          v-for="group in subGroups"
          :key="group.sub_group_id"
          :label="group.sub_group_name"
          :value="group.sub_group_id"
        >
          <span style="float: left">{{ group.sub_group_name }}</span>
          <span style="float: right; color: #8492a6; font-size: 13px; margin-left: 15px">
            {{ group.participant_count }}人
          </span>
        </el-option>
      </el-select>
      
      <el-tag v-if="selectedSubGroup" type="info" class="ml-3" size="large">
        {{ selectedSubGroup.participant_count }}人参赛
      </el-tag>
    </div>

    <!-- 对战表展示 -->
    <div v-loading="loading" class="bracket-content">
      <div v-for="round in rounds" :key="round.round" class="round-section">
        <h3 class="round-title">{{ getRoundTitle(round.round, totalRounds) }}</h3>
        
        <div class="matches-grid">
          <div
            v-for="match in round.matches"
            :key="match._id"
            class="match-card"
          >
            <div class="match-header">
              <span class="match-no">场次 {{ match.match_no }}</span>
              <span class="match-position">{{ match.position }}</span>
              <el-button
                v-if="!match._editingParticipants && match.student1_id && match.student2_id"
                size="small"
                text
                @click="startEditParticipants(match)"
              >
                <el-icon><Edit /></el-icon>
              </el-button>
            </div>

            <!-- 编辑对战人员模式 -->
            <div v-if="match._editingParticipants" class="match-body">
              <div class="student-item">
                <div class="avatar-placeholder">
                  {{ getParticipantName(match._edit_student1_id) ? getParticipantName(match._edit_student1_id)[0] : '?' }}
                </div>
                <el-select
                  v-model="match._edit_student1_id"
                  placeholder="选择蓝方"
                  size="small"
                  filterable
                  style="width: 120px"
                >
                  <el-option
                    v-for="p in subGroupParticipants"
                    :key="p._id"
                    :label="p.student_name"
                    :value="p._id"
                  />
                </el-select>
              </div>
              <div class="vs-divider">VS</div>
              <div class="student-item">
                <div class="avatar-placeholder">
                  {{ getParticipantName(match._edit_student2_id) ? getParticipantName(match._edit_student2_id)[0] : '?' }}
                </div>
                <el-select
                  v-model="match._edit_student2_id"
                  placeholder="选择红方"
                  size="small"
                  filterable
                  style="width: 120px"
                >
                  <el-option
                    v-for="p in subGroupParticipants"
                    :key="p._id"
                    :label="p.student_name"
                    :value="p._id"
                  />
                </el-select>
              </div>
            </div>

            <!-- 正常显示模式 -->
            <div v-else class="match-body">
              <!-- 学员1 -->
              <div
                class="student-item"
                :class="{ winner: match.winner_id === match.student1_id }"
              >
                <img
                  v-if="match.student1_avatar"
                  :src="match.student1_avatar"
                  class="avatar"
                  alt=""
                />
                <div v-else class="avatar-placeholder">
                  {{ match.student1_name ? match.student1_name[0] : '?' }}
                </div>
                <span class="student-name">
                  {{ match.student1_name || '待定' }}
                </span>
                <el-icon v-if="match.winner_id === match.student1_id" class="winner-icon">
                  <Trophy />
                </el-icon>
              </div>

              <div class="vs-divider">VS</div>

              <!-- 学员2 -->
              <div
                class="student-item"
                :class="{ winner: match.winner_id === match.student2_id }"
              >
                <img
                  v-if="match.student2_avatar"
                  :src="match.student2_avatar"
                  class="avatar"
                  alt=""
                />
                <div v-else class="avatar-placeholder">
                  {{ match.student2_name ? match.student2_name[0] : '?' }}
                </div>
                <span class="student-name">
                  {{ match.student2_name || '轮空' }}
                </span>
                <el-icon v-if="match.winner_id === match.student2_id" class="winner-icon">
                  <Trophy />
                </el-icon>
              </div>
            </div>

            <!-- 编辑对战人员操作按钮 -->
            <div v-if="match._editingParticipants" class="match-footer">
              <el-button size="small" type="primary" @click="saveMatchParticipants(match)">
                保存人员
              </el-button>
              <el-button size="small" @click="cancelEditParticipants(match)">
                取消
              </el-button>
            </div>
            
            <!-- 比分和结果录入 -->
            <div v-if="canEditMatch(match)" class="match-footer">
              <el-input
                v-model="match.score"
                placeholder="输入比分 (如: 3:2)"
                size="small"
                class="score-input"
              />
              <el-select
                v-model="match.winner_id"
                placeholder="选择获胜者"
                size="small"
                class="winner-select"
              >
                <el-option
                  v-if="match.student1_id"
                  :label="match.student1_name"
                  :value="match.student1_id"
                />
                <el-option
                  v-if="match.student2_id"
                  :label="match.student2_name"
                  :value="match.student2_id"
                />
              </el-select>
              <el-button
                type="primary"
                size="small"
                @click="saveMatchResult(match)"
                :disabled="!match.winner_id"
              >
                保存结果
              </el-button>
            </div>
            
            <!-- 已有结果 -->
            <div v-else-if="match.winner_id" class="match-result">
              <el-tag type="success" class="mr-2">比分: {{ match.score || '未记录' }}</el-tag>
              <el-tag type="warning">获胜: {{ match.winner_name }}</el-tag>
            </div>
            
            <!-- 轮空 -->
            <div v-else-if="match.score === '轮空'" class="match-result">
              <el-tag type="info">{{ match.student1_name }} 轮空晋级</el-tag>
            </div>
          </div>
        </div>
      </div>
      
      <el-empty v-if="rounds.length === 0" description="暂无对战表数据" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowLeft, Refresh, Trophy, Delete, Download, Edit } from '@element-plus/icons-vue';
import { callFunction } from '../utils/cloudbase';
import * as XLSX from 'xlsx';

const route = useRoute();
const router = useRouter();

const competition = ref(null);
const brackets = ref([]);
const loading = ref(false);
const subGroups = ref([]);
const selectedSubGroupId = ref(route.query.sub_group_id || '');
const isAutoGrouping = ref(false);
const subGroupParticipants = ref([]);

const competitionId = route.params.id;

// 选中的子组
const selectedSubGroup = computed(() => {
  if (!selectedSubGroupId.value) return null;
  return subGroups.value.find(g => g.sub_group_id === selectedSubGroupId.value);
});

// 按轮次分组的对战
const rounds = computed(() => {
  if (brackets.value.length === 0) return [];
  
  const grouped = {};
  brackets.value.forEach(match => {
    if (!grouped[match.round]) {
      grouped[match.round] = {
        round: match.round,
        matches: []
      };
    }
    grouped[match.round].matches.push(match);
  });
  
  return Object.values(grouped).sort((a, b) => a.round - b.round);
});

// 总轮次数
const totalRounds = computed(() => {
  if (brackets.value.length === 0) return 0;
  return Math.max(...brackets.value.map(m => m.round));
});

// 加载比赛详情
const loadCompetitionDetail = async () => {
  loading.value = true;
  try {
    const result = await callFunction('competitionFunctions', {
      type: 'getCompetitionDetail',
      competition_id: competitionId
    });
    
    if (result.success) {
      competition.value = result.data.competition;
      isAutoGrouping.value = competition.value.enable_auto_grouping || false;
      
      // 如果是自动分组模式，加载子组列表
      if (isAutoGrouping.value) {
        await loadSubGroups();
        
        // 如果URL有子组ID，加载该子组的对战表
        if (selectedSubGroupId.value) {
          await loadBrackets();
        }
      } else {
        // 传统模式直接加载对战表
        brackets.value = result.data.brackets || [];
      }
    } else {
      ElMessage.error(result.message || '加载失败');
    }
  } catch (error) {
    console.error('加载比赛详情失败:', error);
    ElMessage.error('加载失败');
  } finally {
    loading.value = false;
  }
};

// 加载子组列表
const loadSubGroups = async () => {
  try {
    const result = await callFunction('competitionFunctions', {
      type: 'getSubGroups',
      competition_id: competitionId
    });
    
    if (result.success) {
      subGroups.value = result.data.flatMap(ag => ag.sub_groups || []);
      
      // 如果没有选中的子组但有子组数据，自动选中第一个
      if (!selectedSubGroupId.value && subGroups.value.length > 0) {
        selectedSubGroupId.value = subGroups.value[0].sub_group_id;
      }
    }
  } catch (error) {
    console.error('加载子组失败:', error);
  }
};

// 加载对战表（根据选中的子组）
const loadBrackets = async () => {
  if (!selectedSubGroupId.value) {
    brackets.value = [];
    return;
  }
  
  loading.value = true;
  try {
    const result = await callFunction('competitionFunctions', {
      type: 'getCompetitionDetail',
      competition_id: competitionId,
      sub_group_id: selectedSubGroupId.value
    });
    
    if (result.success) {
      brackets.value = result.data.brackets || [];
      loadSubGroupParticipants();
    }
  } catch (error) {
    console.error('加载对战表失败:', error);
    ElMessage.error('加载对战表失败');
  } finally {
    loading.value = false;
  }
};

// 判断对战是否可以编辑
const canEditMatch = (match) => {
  // 轮空不需要编辑
  if (match.score === '轮空') {
    console.log('对战已轮空，不可编辑:', match);
    return false;
  }
  
  // 已有结果可以修改（允许修改已录入的结果）
  // if (match.winner_id) return false;
  
  // 至少有一方确定才能编辑（处理"待定"的情况）
  const hasAtLeastOneStudent = match.student1_id || match.student2_id;
  
  // 如果是"待定 VS 待定"，不能编辑
  if (!hasAtLeastOneStudent) {
    console.log('双方都是待定，不可编辑:', match);
    return false;
  }
  
  // 如果双方都确定，可以编辑
  if (match.student1_id && match.student2_id) {
    console.log('双方都确定，可以编辑:', match);
    return true;
  }
  
  // 如果有一方是待定，也不能编辑（需要等待上一轮结果）
  console.log('有一方是待定，不可编辑:', match);
  return false;
};

// 加载子组参赛者列表（用于编辑对战人员下拉框）
const loadSubGroupParticipants = async () => {
  if (!selectedSubGroupId.value) return;
  try {
    const result = await callFunction('competitionFunctions', {
      type: 'getSubGroupDetail',
      competition_id: competitionId,
      sub_group_id: selectedSubGroupId.value
    });
    if (result.success) {
      subGroupParticipants.value = result.data.participants || [];
    }
  } catch (error) {
    console.error('加载参赛者列表失败:', error);
  }
};

// 获取参赛者姓名
const getParticipantName = (id) => {
  const p = subGroupParticipants.value.find(p => p._id === id);
  return p ? p.student_name : '';
};

// 开始编辑对战人员
const startEditParticipants = (match) => {
  if (subGroupParticipants.value.length === 0) {
    loadSubGroupParticipants();
  }
  match._editingParticipants = true;
  match._edit_student1_id = match.student1_id || '';
  match._edit_student2_id = match.student2_id || '';
};

// 取消编辑对战人员
const cancelEditParticipants = (match) => {
  match._editingParticipants = false;
  match._edit_student1_id = '';
  match._edit_student2_id = '';
};

// 保存对战人员变更
const saveMatchParticipants = async (match) => {
  const newStudent1Id = match._edit_student1_id || '';
  const newStudent2Id = match._edit_student2_id || '';

  if (!newStudent1Id || !newStudent2Id) {
    ElMessage.warning('请选择双方对战人员');
    return;
  }

  if (newStudent1Id === newStudent2Id) {
    ElMessage.warning('双方不能为同一人');
    return;
  }

  const student1 = subGroupParticipants.value.find(p => p._id === newStudent1Id);
  const student2 = subGroupParticipants.value.find(p => p._id === newStudent2Id);

  try {
    const result = await callFunction('competitionFunctions', {
      type: 'updateMatchParticipants',
      match_id: match._id,
      student1_id: newStudent1Id,
      student1_name: student1 ? student1.student_name : '',
      student2_id: newStudent2Id,
      student2_name: student2 ? student2.student_name : ''
    });

    if (result.success) {
      ElMessage.success('对战人员已更新');
      match.student1_id = newStudent1Id;
      match.student1_name = student1 ? student1.student_name : '';
      match.student2_id = newStudent2Id;
      match.student2_name = student2 ? student2.student_name : '';
      match._editingParticipants = false;
      // 如果之前有结果，清空（因为人员变了）
      if (match.winner_id) {
        match.winner_id = '';
        match.winner_name = '';
        match.score = '';
      }
    } else {
      ElMessage.error(result.message || '更新失败');
    }
  } catch (error) {
    console.error('保存对战人员失败:', error);
    ElMessage.error('保存失败');
  }
};

// 保存对战结果
const saveMatchResult = async (match) => {
  console.log('=== 开始保存对战结果 ===');
  console.log('对战信息:', {
    _id: match._id,
    round: match.round,
    match_no: match.match_no,
    student1: match.student1_name,
    student2: match.student2_name,
    winner_id: match.winner_id,
    score: match.score
  });
  
  if (!match._id) {
    console.error('对战ID不存在');
    ElMessage.error('对战信息错误，请刷新页面重试');
    return;
  }
  
  if (!match.winner_id) {
    console.warn('未选择获胜者');
    ElMessage.warning('请选择获胜者');
    return;
  }
  
  // 验证获胜者是否是参赛者之一
  if (match.winner_id !== match.student1_id && match.winner_id !== match.student2_id) {
    console.error('获胜者ID不匹配:', {
      winner_id: match.winner_id,
      student1_id: match.student1_id,
      student2_id: match.student2_id
    });
    ElMessage.error('获胜者选择错误');
    return;
  }
  
  loading.value = true;
  
  try {
    console.log('调用云函数 updateMatch...');
    const result = await callFunction('competitionFunctions', {
      type: 'updateMatch',
      match_id: match._id,
      winner_id: match.winner_id,
      score: match.score || ''
    });
    
    console.log('云函数返回结果:', result);
    
    if (result.success) {
      ElMessage.success('保存成功，下一轮对战已自动更新');
      console.log('重新加载对战表数据...');
      await loadCompetitionDetail();
      console.log('=== 保存完成 ===');
    } else {
      console.error('保存失败:', result.message);
      ElMessage.error(result.message || '保存失败');
    }
  } catch (error) {
    console.error('保存对战结果异常:', error);
    ElMessage.error('保存失败: ' + (error.message || '网络错误'));
  } finally {
    loading.value = false;
  }
};

// 重新生成对战表
const regenerateBracket = async () => {
  try {
    await ElMessageBox.confirm(
      '重新生成对战表将清空所有已录入的结果，确定要继续吗？',
      '警告',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    
    loading.value = true;
    const result = await callFunction('competitionFunctions', {
      type: 'generateBracket',
      competition_id: competitionId,
      regenerate: true
    });
    
    if (result.success) {
      ElMessage.success('重新生成成功');
      loadCompetitionDetail();
    } else {
      ElMessage.error(result.message || '生成失败');
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('重新生成对战表失败:', error);
      ElMessage.error('生成失败');
    }
  } finally {
    loading.value = false;
  }
};

// 清空当前子组对战表
const clearBracket = async () => {
  if (!selectedSubGroupId.value) {
    ElMessage.warning('请先选择子组');
    return;
  }

  const group = subGroups.value.find(g => g.sub_group_id === selectedSubGroupId.value);
  const groupName = group ? group.sub_group_name : selectedSubGroupId.value;

  try {
    await ElMessageBox.confirm(
      `确定清空"${groupName}"的对战表及所有结果吗？此操作不可恢复。`,
      '确认清空',
      {
        confirmButtonText: '确定清空',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );

    const result = await callFunction('competitionFunctions', {
      type: 'clearSubGroupBracket',
      competition_id: competitionId,
      sub_group_id: selectedSubGroupId.value
    });

    if (result.success) {
      ElMessage.success('对战表已清空');
      brackets.value = [];
      loadCompetitionDetail();
    } else {
      ElMessage.error(result.message || '清空失败');
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('清空对战表失败:', error);
      ElMessage.error('清空失败');
    }
  }
};

// 导出对战表（导出所有已生成对战表的分组）
const exportBracket = async () => {
  const groupsToExport = subGroups.value.filter(g => g.bracket_generated);
  if (groupsToExport.length === 0) {
    ElMessage.warning('暂无已生成对战表的分组');
    return;
  }

  loading.value = true;
  try {
    // 先获取所有报名记录，建立学生→所属单位的映射
    const regResult = await callFunction('competitionFunctions', {
      type: 'getRegistrations',
      competition_id: competitionId
    });
    const orgMap = {};
    if (regResult.success) {
      (regResult.data || []).forEach(reg => {
        if (reg._id && reg.organization) {
          orgMap[reg._id] = reg.organization;
        }
      });
    }

    const exportData = [];

    for (const group of groupsToExport) {
      const result = await callFunction('competitionFunctions', {
        type: 'getCompetitionDetail',
        competition_id: competitionId,
        sub_group_id: group.sub_group_id
      });

      if (result.success) {
        const groupBrackets = result.data.brackets || [];
        const groupTotalRounds = groupBrackets.length > 0
          ? Math.max(...groupBrackets.map(m => m.round))
          : 0;

        groupBrackets.forEach(match => {
          exportData.push({
            '场次': match.match_no,
            '轮次': getRoundTitle(match.round, groupTotalRounds),
            '组别': group.sub_group_name,
            '蓝方': match.student1_name || '待定',
            '蓝方所属单位': orgMap[match.student1_id] || '',
            '红方': match.student2_name || '轮空',
            '红方所属单位': orgMap[match.student2_id] || '',
            '比分': match.score || '',
            '获胜者': match.winner_name || ''
          });
        });
      }
    }

    if (exportData.length === 0) {
      ElMessage.warning('暂无对战表数据');
      return;
    }

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '对战表');
    XLSX.writeFile(wb, `${competition.value?.name || '比赛'}_对战表.xlsx`);
    ElMessage.success(`导出成功，共 ${groupsToExport.length} 个分组、${exportData.length} 场比赛`);
  } catch (error) {
    console.error('导出对战表失败:', error);
    ElMessage.error('导出失败');
  } finally {
    loading.value = false;
  }
};

// 返回
const goBack = () => {
  router.push('/dashboard/competition');
};

// 获取轮次标题
const getRoundTitle = (round, total) => {
  if (round === total && total === 1) return '决赛';
  if (round === total) return '决赛';
  if (round === total - 1) return '半决赛';
  if (round === total - 2) return '四分之一决赛';
  return `第 ${round} 轮`;
};

// 获取状态类型
const getStatusType = (status) => {
  const types = {
    pending: 'info',
    ongoing: 'primary',
    finished: 'success'
  };
  return types[status] || 'info';
};

// 获取状态文本
const getStatusText = (status) => {
  const texts = {
    pending: '未开始',
    ongoing: '进行中',
    finished: '已完成'
  };
  return texts[status] || '未知';
};

// 格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

onMounted(() => {
  loadCompetitionDetail();
});
</script>

<style scoped>
.bracket-container {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.info-bar {
  margin-top: 12px;
  display: flex;
  align-items: center;
}

.sub-group-selector {
  margin: 20px 0;
  display: flex;
  align-items: center;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

.bracket-content {
  min-height: 400px;
}

.round-section {
  margin-bottom: 40px;
}

.round-title {
  font-size: 20px;
  font-weight: bold;
  color: #409EFF;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 2px solid #409EFF;
}

.matches-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.match-card {
  border: 1px solid #DCDFE6;
  border-radius: 8px;
  padding: 16px;
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.3s;
}

.match-card:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.match-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px dashed #E4E7ED;
}

.match-no {
  font-weight: bold;
  color: #303133;
}

.match-position {
  color: #909399;
  font-size: 12px;
}

.match-body {
  margin-bottom: 16px;
}

.student-item {
  display: flex;
  align-items: center;
  padding: 12px;
  margin-bottom: 8px;
  border-radius: 6px;
  background: #F5F7FA;
  transition: all 0.3s;
}

.student-item.winner {
  background: #E1F3D8;
  border: 2px solid #67C23A;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  margin-right: 12px;
}

.avatar-placeholder {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #C0C4CC;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  margin-right: 12px;
}

.student-name {
  flex: 1;
  font-size: 16px;
  font-weight: 500;
}

.winner-icon {
  color: #F56C6C;
  font-size: 20px;
}

.vs-divider {
  text-align: center;
  color: #909399;
  font-weight: bold;
  margin: 8px 0;
}

.match-footer {
  display: flex;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px dashed #E4E7ED;
}

.score-input {
  width: 120px;
}

.winner-select {
  flex: 1;
}

.match-result {
  padding-top: 12px;
  border-top: 1px dashed #E4E7ED;
  text-align: center;
}
</style>

