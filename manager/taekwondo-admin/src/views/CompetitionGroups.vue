<template>
  <div class="competition-groups-container">
    <div class="header">
      <div>
        <h2 class="text-2xl font-bold text-gray-800">📊 分组管理</h2>
        <p class="text-gray-600 mt-2">{{ competition.name }}</p>
      </div>
      <div class="flex gap-3">
        <el-button @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          返回比赛列表
        </el-button>
        <el-button 
          type="success" 
          @click="generateAllBrackets"
          :loading="generating"
          :disabled="notGeneratedCount === 0"
        >
          <el-icon><Document /></el-icon>
          一键生成所有对战表
        </el-button>
      </div>
    </div>

    <!-- 统计信息 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-item">
            <div class="stat-value">{{ subGroups.length }}</div>
            <div class="stat-label">子组数量</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-item">
            <div class="stat-value">{{ competition.participant_count || 0 }}</div>
            <div class="stat-label">总参赛人数</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-item">
            <div class="stat-value text-success">{{ generatedCount }}</div>
            <div class="stat-label">已生成对战表</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-item">
            <div class="stat-value text-warning">{{ notGeneratedCount }}</div>
            <div class="stat-label">未生成对战表</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 子组列表（按年龄组分组） -->
    <div v-loading="loading" class="groups-content">
      <div 
        v-for="ageGroup in groupedSubGroups" 
        :key="ageGroup.age_group_code"
        class="age-group-section"
      >
        <h3 class="age-group-title">{{ ageGroup.age_group_name }}</h3>
        
        <el-table :data="ageGroup.sub_groups" stripe>
          <el-table-column prop="sub_group_name" label="子组名称" min-width="200" />
          
          <el-table-column label="参赛人数" width="120" align="center">
            <template #default="{ row }">
              <el-tag>{{ row.participant_count }}人</el-tag>
            </template>
          </el-table-column>
          
          <el-table-column label="对战表状态" width="120" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.bracket_generated" type="success">已生成</el-tag>
              <el-tag v-else type="info">未生成</el-tag>
            </template>
          </el-table-column>
          
          <el-table-column label="操作" width="550" fixed="right">
            <template #default="{ row }">
              <el-button size="small" @click="viewParticipants(row)">
                <el-icon><User /></el-icon>
                查看报名名单
              </el-button>
              
              <el-button
                v-if="!row.bracket_generated && row.participant_count >= 2"
                size="small"
                type="success"
                @click="generateSubGroupBracket(row)"
              >
                <el-icon><Plus /></el-icon>
                生成对战表
              </el-button>
              
              <el-button
                v-if="row.bracket_generated"
                size="small"
                type="primary"
                @click="viewBracket(row)"
              >
                <el-icon><View /></el-icon>
                对战表管理
              </el-button>
              
              <el-button
                v-if="row.bracket_generated"
                size="small"
                type="warning"
                @click="viewResult(row)"
              >
                <el-icon><Trophy /></el-icon>
                结果管理
              </el-button>

              <el-button
                v-if="row.bracket_generated"
                size="small"
                type="danger"
                @click="clearSubGroupBracket(row)"
              >
                <el-icon><Delete /></el-icon>
                清空对战表
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
      
      <el-empty v-if="groupedSubGroups.length === 0" description="暂无分组数据" />
    </div>

    <!-- 查看参赛者对话框 -->
    <el-dialog
      v-model="participantsDialogVisible"
      title="参赛者名单"
      width="80%"
    >
      <div v-if="currentSubGroup" class="mb-4">
        <el-tag type="primary" size="large">{{ currentSubGroup.sub_group_name }}</el-tag>
        <span class="ml-3 text-gray-600">共 {{ currentParticipants.length }} 人</span>
      </div>
      
      <el-table :data="currentParticipants" stripe>
        <el-table-column type="index" label="序号" width="60" />
        <el-table-column prop="student_name" label="姓名" width="120" />
        <el-table-column prop="age" label="年龄" width="80" align="center" />
        <el-table-column label="性别" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.gender === 'male' ? 'primary' : 'danger'" size="small">
              {{ row.gender === 'male' ? '男' : '女' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="weight" label="体重(kg)" width="100" align="center" />
        <el-table-column prop="contact" label="联系方式" width="150" />
        <el-table-column label="报名时间" min-width="180">
          <template #default="{ row }">
            {{ formatDate(row.registration_time) }}
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Document, User, Plus, View, Trophy, Delete } from '@element-plus/icons-vue'
import { callFunction } from '../utils/cloudbase'

const route = useRoute()
const router = useRouter()

const competitionId = ref(route.params.id)
const competition = ref({})
const subGroups = ref([])
const loading = ref(false)
const generating = ref(false)
const participantsDialogVisible = ref(false)
const currentParticipants = ref([])
const currentSubGroup = ref(null)

// 按年龄组分组
const groupedSubGroups = computed(() => {
  const grouped = {}
  
  subGroups.value.forEach(subGroup => {
    const key = subGroup.age_group_name
    if (!grouped[key]) {
      grouped[key] = {
        age_group_name: key,
        age_group_code: subGroup.age_group_code,
        sub_groups: []
      }
    }
    grouped[key].sub_groups.push(subGroup)
  })
  
  return Object.values(grouped)
})

// 已生成对战表的数量
const generatedCount = computed(() => {
  return subGroups.value.filter(g => g.bracket_generated).length
})

// 未生成对战表的数量
const notGeneratedCount = computed(() => {
  return subGroups.value.filter(g => !g.bracket_generated && g.participant_count >= 2).length
})

// 加载比赛和子组信息
const loadData = async () => {
  loading.value = true
  try {
    // 加载比赛信息
    const compResult = await callFunction('competitionFunctions', {
      type: 'getCompetitionDetail',
      competition_id: competitionId.value
    })
    
    if (compResult.success) {
      competition.value = compResult.data.competition
    }
    
    // 加载子组列表
    const groupsResult = await callFunction('competitionFunctions', {
      type: 'getSubGroups',
      competition_id: competitionId.value
    })
    
    if (groupsResult.success) {
      subGroups.value = groupsResult.data.flatMap(ag => ag.sub_groups || [])
    }
  } catch (error) {
    console.error('加载数据失败:', error)
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

// 查看参赛者名单
const viewParticipants = async (subGroup) => {
  currentSubGroup.value = subGroup
  
  try {
    const result = await callFunction('competitionFunctions', {
      type: 'getSubGroupDetail',
      competition_id: competitionId.value,
      sub_group_id: subGroup.sub_group_id
    })
    
    if (result.success) {
      currentParticipants.value = result.data.participants || []
      participantsDialogVisible.value = true
    } else {
      ElMessage.error('加载失败：' + (result.message || ''))
    }
  } catch (error) {
    console.error('加载参赛者失败:', error)
    ElMessage.error('加载失败')
  }
}

// 为单个子组生成对战表
const generateSubGroupBracket = async (subGroup) => {
  try {
    await ElMessageBox.confirm(
      `确定为"${subGroup.sub_group_name}"生成对战表吗？`,
      '确认生成',
      { 
        type: 'warning',
        confirmButtonText: '确定生成',
        cancelButtonText: '取消'
      }
    )
    
    const result = await callFunction('competitionFunctions', {
      type: 'generateSubGroupBracket',
      competition_id: competitionId.value,
      sub_group_id: subGroup.sub_group_id,
      sub_group_name: subGroup.sub_group_name
    })
    
    if (result.success) {
      ElMessage.success('对战表生成成功')
      loadData()
    } else {
      ElMessage.error(result.message || '生成失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('生成对战表失败:', error)
      ElMessage.error('生成失败')
    }
  }
}

// 一键生成所有对战表
const generateAllBrackets = async () => {
  if (notGeneratedCount.value === 0) {
    ElMessage.info('所有子组的对战表已生成')
    return
  }
  
  try {
    await ElMessageBox.confirm(
      `将为 ${notGeneratedCount.value} 个子组生成对战表，确定继续吗？`,
      '批量生成',
      { 
        type: 'warning',
        confirmButtonText: '确定生成',
        cancelButtonText: '取消'
      }
    )
    
    generating.value = true
    
    const result = await callFunction('competitionFunctions', {
      type: 'generateAllBrackets',
      competition_id: competitionId.value
    })
    
    if (result.success) {
      const { success_count, error_count, errors } = result.data
      
      if (error_count > 0) {
        const errorMsg = errors.map(e => `${e.sub_group_name}: ${e.error}`).join('\n')
        ElMessageBox.alert(
          `成功生成 ${success_count} 个，失败 ${error_count} 个\n\n失败原因：\n${errorMsg}`,
          '生成结果',
          { type: 'warning' }
        )
      } else {
        ElMessage.success(`成功为 ${success_count} 个子组生成对战表`)
      }
      
      loadData()
    } else {
      ElMessage.error(result.message || '生成失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量生成失败:', error)
      ElMessage.error('生成失败')
    }
  } finally {
    generating.value = false
  }
}

// 查看对战表
const viewBracket = (subGroup) => {
  router.push({
    name: 'CompetitionBracket',
    params: { id: competitionId.value },
    query: { sub_group_id: subGroup.sub_group_id }
  })
}

// 查看结果
const viewResult = (subGroup) => {
  router.push({
    name: 'CompetitionResult',
    params: { id: competitionId.value },
    query: { sub_group_id: subGroup.sub_group_id }
  })
}

// 清空子组对战表
const clearSubGroupBracket = async (subGroup) => {
  try {
    await ElMessageBox.confirm(
      `确定清空"${subGroup.sub_group_name}"的对战表及所有结果吗？此操作不可恢复，清空后可重新生成对战表或移入学生。`,
      '确认清空',
      {
        confirmButtonText: '确定清空',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );

    const result = await callFunction('competitionFunctions', {
      type: 'clearSubGroupBracket',
      competition_id: competitionId.value,
      sub_group_id: subGroup.sub_group_id
    });

    if (result.success) {
      ElMessage.success(`对战表已清空（删除 ${result.data.deleted_brackets} 场比赛，${result.data.deleted_results} 条结果）`);
      loadData();
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

// 返回
const goBack = () => {
  router.push({ name: 'Competition' })
}

// 格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN')
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.competition-groups-container {
  padding: 24px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.stats-row {
  margin-bottom: 24px;
}

.stat-item {
  text-align: center;
  padding: 10px 0;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: #409eff;
}

.stat-value.text-success {
  color: #67c23a;
}

.stat-value.text-warning {
  color: #e6a23c;
}

.stat-label {
  margin-top: 8px;
  color: #666;
  font-size: 14px;
}

.groups-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.age-group-section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.age-group-title {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 16px;
  color: #333;
  border-left: 4px solid #409eff;
  padding-left: 12px;
}
</style>

