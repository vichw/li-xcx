<template>
  <div class="result-container">
    <div class="header">
      <div>
        <el-button @click="goBack" class="mb-2">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
        <h2 class="text-2xl font-bold text-gray-800">
          🏆 {{ competition?.name }} - 结果管理
        </h2>
        <div class="info-bar">
          <el-tag :type="getStatusType(competition?.status)">
            {{ getStatusText(competition?.status) }}
          </el-tag>
          <span class="ml-4 text-gray-600">
            展示前{{ competition?.top_display_count }}名
          </span>
        </div>
      </div>
    </div>

    <el-divider />

    <!-- 子组选择器（自动分组模式） -->
    <div v-if="isAutoGrouping" class="sub-group-selector">
      <el-select 
        v-model="selectedSubGroupId"
        placeholder="选择子组查看结果"
        @change="loadResults"
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
        {{ selectedSubGroup.sub_group_name }}
      </el-tag>
    </div>

    <div v-loading="loading" class="result-content">
      <!-- 参赛学员列表 -->
      <div class="participants-section">
        <h3 class="section-title">参赛学员列表</h3>
        <el-table
          :data="participants"
          class="participants-table"
          height="400"
          stripe
        >
          <el-table-column label="头像" width="80">
            <template #default="{ row }">
              <img
                v-if="row.avatar"
                :src="row.avatar"
                class="avatar"
                alt=""
              />
              <div v-else class="avatar-placeholder">
                {{ row.name[0] }}
              </div>
            </template>
          </el-table-column>
          
          <el-table-column prop="name" label="姓名" />
          
          <el-table-column label="操作" width="400">
            <template #default="{ row }">
              <el-button-group>
                <el-button
                  v-for="rank in (competition?.top_display_count || 3)"
                  :key="rank"
                  size="small"
                  :type="isSelected(row._id, rank) ? 'primary' : 'default'"
                  @click="selectRank(row, rank)"
                >
                  {{ getRankText(rank) }}
                </el-button>
              </el-button-group>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 已选择的结果 -->
      <div class="results-section">
        <h3 class="section-title">比赛结果</h3>
        
        <div class="results-grid">
          <div
            v-for="rank in (competition?.top_display_count || 3)"
            :key="rank"
            class="result-card"
            :class="`rank-${rank}`"
          >
            <div class="result-header">
              <span class="rank-icon">{{ getRankIcon(rank) }}</span>
              <span class="rank-title">{{ getRankText(rank) }}</span>
            </div>
            
            <div v-if="selectedResults[rank]" class="result-body">
              <img
                v-if="selectedResults[rank].avatar"
                :src="selectedResults[rank].avatar"
                class="result-avatar"
                alt=""
              />
              <div v-else class="result-avatar-placeholder">
                {{ selectedResults[rank].name[0] }}
              </div>
              <div class="result-name">{{ selectedResults[rank].name }}</div>
              <el-button
                type="danger"
                size="small"
                text
                @click="clearRank(rank)"
                class="clear-btn"
              >
                清除
              </el-button>
            </div>
            
            <div v-else class="result-empty">
              <el-icon class="empty-icon"><QuestionFilled /></el-icon>
              <span>未设置</span>
            </div>
          </div>
        </div>
        
        <el-button
          type="primary"
          size="large"
          class="save-btn"
          :disabled="!canSave"
          @click="saveResults"
        >
          保存比赛结果
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { ArrowLeft, QuestionFilled } from '@element-plus/icons-vue';
import { callFunction } from '../utils/cloudbase';

const route = useRoute();
const router = useRouter();

const competition = ref(null);
const participants = ref([]);
const selectedResults = ref({});
const loading = ref(false);
const subGroups = ref([]);
const selectedSubGroupId = ref(route.query.sub_group_id || '');
const isAutoGrouping = ref(false);

const competitionId = route.params.id;

// 选中的子组
const selectedSubGroup = computed(() => {
  if (!selectedSubGroupId.value) return null;
  return subGroups.value.find(g => g.sub_group_id === selectedSubGroupId.value);
});

// 是否可以保存（至少选择了冠军）
const canSave = computed(() => {
  return selectedResults.value[1] !== undefined;
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
        
        // 如果URL有子组ID，加载该子组的结果
        if (selectedSubGroupId.value) {
          await loadResults();
        }
      } else {
        // 传统模式直接加载结果
        loadParticipantsFromBrackets(result.data.brackets);
        loadExistingResults(result.data.results);
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

// 加载结果（根据选中的子组）
const loadResults = async () => {
  if (!selectedSubGroupId.value) {
    participants.value = [];
    selectedResults.value = {};
    return;
  }
  
  loading.value = true;
  try {
    // 加载对战表和结果
    const result = await callFunction('competitionFunctions', {
      type: 'getCompetitionDetail',
      competition_id: competitionId,
      sub_group_id: selectedSubGroupId.value
    });
    
    if (result.success) {
      loadParticipantsFromBrackets(result.data.brackets);
      
      // 加载结果
      const resultsData = await callFunction('competitionFunctions', {
        type: 'getResults',
        competition_id: competitionId,
        sub_group_id: selectedSubGroupId.value
      });
      
      if (resultsData.success) {
        loadExistingResults(resultsData.data);
      }
    }
  } catch (error) {
    console.error('加载结果失败:', error);
    ElMessage.error('加载结果失败');
  } finally {
    loading.value = false;
  }
};

// 从对战表提取参赛学员
const loadParticipantsFromBrackets = (brackets) => {
  const studentsMap = new Map();
  brackets.forEach(match => {
    if (match.student1_id && match.student1_name && match.student1_name !== '待定') {
      studentsMap.set(match.student1_id, {
        _id: match.student1_id,
        name: match.student1_name,
        avatar: match.student1_avatar
      });
    }
    if (match.student2_id && match.student2_name) {
      studentsMap.set(match.student2_id, {
        _id: match.student2_id,
        name: match.student2_name,
        avatar: match.student2_avatar
      });
    }
  });
  participants.value = Array.from(studentsMap.values());
};

// 加载已有结果
const loadExistingResults = (results) => {
  selectedResults.value = {};
  if (results && results.length > 0) {
    results.forEach(r => {
      selectedResults.value[r.rank] = {
        _id: r.student_id,
        name: r.student_name,
        avatar: r.student_avatar
      };
    });
  }
};

// 判断学员是否被选中为某个名次
const isSelected = (studentId, rank) => {
  return selectedResults.value[rank]?._id === studentId;
};

// 选择名次
const selectRank = (student, rank) => {
  // 检查该学员是否已被选择为其他名次
  const existingRank = Object.entries(selectedResults.value).find(
    ([r, s]) => s._id === student._id
  );
  
  if (existingRank) {
    // 如果点击的是已选择的名次，则取消选择
    if (parseInt(existingRank[0]) === rank) {
      delete selectedResults.value[rank];
      return;
    }
    
    // 清除原有名次，设置新名次
    delete selectedResults.value[existingRank[0]];
  }
  
  // 如果该名次已有人，则替换
  selectedResults.value[rank] = {
    _id: student._id,
    name: student.name,
    avatar: student.avatar
  };
};

// 清除名次
const clearRank = (rank) => {
  delete selectedResults.value[rank];
};

// 保存结果
const saveResults = async () => {
  if (!selectedResults.value[1]) {
    ElMessage.warning('请至少设置冠军');
    return;
  }
  
  // 验证名次连续性
  const ranks = Object.keys(selectedResults.value).map(Number).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) {
    if (ranks[i] !== i + 1) {
      ElMessage.warning('名次必须从冠军开始连续设置');
      return;
    }
  }
  
  loading.value = true;
  try {
    const results = Object.entries(selectedResults.value).map(([rank, student]) => ({
      student_id: student._id,
      rank: parseInt(rank)
    }));
    
    const params = {
      type: 'saveResults',
      competition_id: competitionId,
      results
    };
    
    // 如果是自动分组模式，添加子组ID
    if (isAutoGrouping.value && selectedSubGroupId.value) {
      params.sub_group_id = selectedSubGroupId.value;
    }
    
    const result = await callFunction('competitionFunctions', params);
    
    if (result.success) {
      ElMessage.success('保存成功');
      goBack();
    } else {
      ElMessage.error(result.message || '保存失败');
    }
  } catch (error) {
    console.error('保存结果失败:', error);
    ElMessage.error('保存失败');
  } finally {
    loading.value = false;
  }
};

// 返回
const goBack = () => {
  router.push('/dashboard/competition');
};

// 获取名次文本
const getRankText = (rank) => {
  const texts = {
    1: '冠军',
    2: '亚军',
    3: '季军'
  };
  return texts[rank] || `第${rank}名`;
};

// 获取名次图标
const getRankIcon = (rank) => {
  const icons = {
    1: '🥇',
    2: '🥈',
    3: '🥉'
  };
  return icons[rank] || '🏅';
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

onMounted(() => {
  loadCompetitionDetail();
});
</script>

<style scoped>
.result-container {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.header {
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

.result-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
  min-height: 400px;
}

.section-title {
  font-size: 18px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 16px;
  padding-bottom: 10px;
  border-bottom: 2px solid #409EFF;
}

.participants-section {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.participants-table {
  margin-bottom: 16px;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
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
}

.results-section {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.results-grid {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 30px;
}

.result-card {
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s;
}

.result-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.result-card.rank-1 {
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
}

.result-card.rank-2 {
  background: linear-gradient(135deg, #C0C0C0 0%, #808080 100%);
}

.result-card.rank-3 {
  background: linear-gradient(135deg, #CD7F32 0%, #8B4513 100%);
}

.result-card:not(.rank-1):not(.rank-2):not(.rank-3) {
  background: linear-gradient(135deg, #E0E0E0 0%, #BDBDBD 100%);
}

.result-header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.rank-icon {
  font-size: 32px;
  margin-right: 12px;
}

.rank-title {
  font-size: 20px;
  font-weight: bold;
  color: white;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.result-body {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.9);
  padding: 16px;
  border-radius: 8px;
}

.result-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  object-fit: cover;
  margin-right: 16px;
  border: 3px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.result-avatar-placeholder {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: #409EFF;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 24px;
  margin-right: 16px;
  border: 3px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.result-name {
  flex: 1;
  font-size: 18px;
  font-weight: bold;
  color: #303133;
}

.clear-btn {
  margin-left: 12px;
}

.result-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 30px;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 8px;
  color: white;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 8px;
  opacity: 0.7;
}

.save-btn {
  width: 100%;
  height: 48px;
  font-size: 16px;
  font-weight: bold;
}
</style>

