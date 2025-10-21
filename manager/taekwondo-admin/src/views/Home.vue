<template>
  <div>
    <h2 class="text-2xl font-bold mb-6">数据概览</h2>
    
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      <!-- 学生总数卡片 -->
      <el-card shadow="hover" class="bg-gradient-to-r from-blue-500 to-blue-700 text-white">
        <div class="flex items-center">
          <el-icon class="text-4xl mr-4"><User /></el-icon>
          <div>
            <div class="text-sm opacity-80">学生总数</div>
            <div class="text-2xl font-bold">{{ statistics.studentCount || 0 }}</div>
          </div>
        </div>
      </el-card>
      
      <!-- 待处理注册卡片 -->
      <el-card shadow="hover" class="bg-gradient-to-r from-yellow-500 to-yellow-700 text-white">
        <div class="flex items-center">
          <el-icon class="text-4xl mr-4"><Document /></el-icon>
          <div>
            <div class="text-sm opacity-80">待处理注册</div>
            <div class="text-2xl font-bold">{{ statistics.pendingRegistrations || 0 }}</div>
          </div>
        </div>
      </el-card>
      
      <!-- 荣誉总数卡片 -->
      <el-card shadow="hover" class="bg-gradient-to-r from-green-500 to-green-700 text-white">
        <div class="flex items-center">
          <el-icon class="text-4xl mr-4"><Trophy /></el-icon>
          <div>
            <div class="text-sm opacity-80">荣誉总数</div>
            <div class="text-2xl font-bold">{{ statistics.honorCount || 0 }}</div>
          </div>
        </div>
      </el-card>
    </div>
    
    <!-- 最近荣誉记录 -->
    <el-card shadow="hover" class="mb-6">
      <template #header>
        <div class="flex justify-between items-center">
          <h3 class="font-bold">最近荣誉记录</h3>
          <el-button type="primary" text @click="goToHonor">查看全部</el-button>
        </div>
      </template>
      
      <el-table :data="latestHonors" style="width: 100%">
        <el-table-column prop="studentName" label="学生姓名" />
        <el-table-column prop="competitionName" label="比赛名称" />
        <el-table-column prop="awardName" label="获奖名称" />
        <el-table-column prop="competitionDate" label="比赛日期" />
        <el-table-column label="级别">
          <template #default="scope">
            <el-tag :type="getRankType(scope.row.rank)">{{ getRankText(scope.row.rank) }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    
    <!-- 最近注册申请 -->
    <el-card shadow="hover">
      <template #header>
        <div class="flex justify-between items-center">
          <h3 class="font-bold">最近注册申请</h3>
          <el-button type="primary" text @click="goToRegistration">查看全部</el-button>
        </div>
      </template>
      
      <el-table :data="latestRegistrations" style="width: 100%">
        <el-table-column prop="phoneNumber" label="手机号" />
        <el-table-column label="状态">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)">{{ scope.row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间">
          <template #default="scope">
            {{ formatDate(scope.row.createTime) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180">
          <template #default="scope">
            <el-button 
              type="primary" 
              size="small" 
              @click="handleRegistration(scope.row._id, '已处理')"
              :disabled="scope.row.status !== '待处理'"
            >
              处理
            </el-button>
            <el-button 
              type="danger" 
              size="small" 
              @click="handleRegistration(scope.row._id, '已拒绝')"
              :disabled="scope.row.status !== '待处理'"
            >
              拒绝
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getStudents, getHonors, getRegistrations, handleRegistration as processRegistration } from '../utils/cloudbase'

const router = useRouter()
const statistics = ref({
  studentCount: 0,
  pendingRegistrations: 0,
  honorCount: 0
})
const latestHonors = ref([])
const latestRegistrations = ref([])

// 加载数据
const loadData = async () => {
  try {
    // 获取学生列表
    const students = await getStudents()
    statistics.value.studentCount = students.length
    
    // 获取荣誉列表
    const honors = await getHonors()
    statistics.value.honorCount = honors.length
    latestHonors.value = honors.slice(0, 5) // 最近5条
    
    // 获取注册列表
    const registrations = await getRegistrations()
    statistics.value.pendingRegistrations = registrations.filter(r => r.status === '待处理').length
    latestRegistrations.value = registrations.slice(0, 5) // 最近5条
  } catch (error) {
    console.error('Load data error:', error)
    ElMessage.error('加载数据失败')
  }
}

// 处理注册申请
const handleRegistration = async (id, status) => {
  try {
    const result = await processRegistration(id, status)
    if (result.success) {
      ElMessage.success(`申请${status}成功`)
      loadData() // 重新加载数据
    } else {
      ElMessage.error(result.message || '操作失败')
    }
  } catch (error) {
    console.error('Handle registration error:', error)
    ElMessage.error('操作失败')
  }
}

// 格式化日期
const formatDate = (dateObj) => {
  if (!dateObj) return '-'
  const date = new Date(dateObj.$date || dateObj)
  return date.toLocaleDateString('zh-CN')
}

// 获取级别对应的标签类型
const getRankType = (rank) => {
  const types = {
    'gold': 'danger',
    'silver': 'warning',
    'bronze': 'success',
    'default': 'info'
  }
  return types[rank] || types.default
}

// 获取级别对应的文本
const getRankText = (rank) => {
  const texts = {
    'gold': '金牌',
    'silver': '银牌',
    'bronze': '铜牌',
    'default': '其他'
  }
  return texts[rank] || texts.default
}

// 获取状态对应的标签类型
const getStatusType = (status) => {
  const types = {
    '待处理': 'warning',
    '已处理': 'success',
    '已拒绝': 'danger',
    'default': 'info'
  }
  return types[status] || types.default
}

// 导航到荣誉页面
const goToHonor = () => {
  router.push('/dashboard/honor')
}

// 导航到注册页面
const goToRegistration = () => {
  router.push('/dashboard/registration')
}

onMounted(() => {
  loadData()
})
</script> 