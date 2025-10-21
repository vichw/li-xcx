<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold">荣誉管理</h2>

      <!-- 搜索框 -->
      <div class="flex items-center">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索学生姓名/比赛名称"
          clearable
          class="w-72 mr-4"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>

        <el-button type="primary" @click="handleAdd">
          <el-icon class="mr-2"><Plus /></el-icon>
          添加荣誉
        </el-button>
      </div>
    </div>

    <!-- 荣誉列表 -->
    <el-card shadow="hover">
      <el-table
        :data="filteredHonors"
        style="width: 100%"
        v-loading="loading"
        :empty-text="loading ? '加载中...' : '暂无数据'"
      >
        <el-table-column label="学生信息" min-width="180">
          <template #default="scope">
            <div class="flex items-center">
              <el-avatar :size="40" :src="scope.row.studentAvatar" class="mr-3">
                <el-icon><User /></el-icon>
              </el-avatar>
              <div>
                <div class="font-medium">{{ scope.row.studentName }}</div>
                <div class="text-gray-500 text-sm">{{ scope.row.studentGrade }}</div>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="competitionName" label="比赛名称" min-width="200" />
        <el-table-column prop="awardName" label="奖项名称" min-width="150" />
        <el-table-column prop="competitionDate" label="比赛日期" width="120" />

        <el-table-column label="级别" width="100">
          <template #default="scope">
            <el-tag :type="getRankType(scope.row.rank)">
              {{ getRankText(scope.row.rank) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="180">
          <template #default="scope">
            <el-button type="primary" size="small" @click="handleEdit(scope.row)">
              编辑
            </el-button>
            <el-button type="danger" size="small" @click="handleDelete(scope.row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 荣誉表单对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑荣誉' : '添加荣誉'"
      width="600px"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="honorForm"
        :rules="formRules"
        label-width="100px"
      >
        <el-form-item label="学生" prop="studentId">
          <el-select
            v-model="honorForm.studentId"
            filterable
            placeholder="请选择学生"
            class="w-full"
            @change="handleStudentChange"
          >
            <el-option
              v-for="student in students"
              :key="student._id"
              :label="student.name"
              :value="student._id"
            >
              <div class="flex items-center">
                <el-avatar :size="24" :src="student.avatar" class="mr-2">
                  <el-icon><User /></el-icon>
                </el-avatar>
                <span>{{ student.name }} ({{ student.grade }})</span>
              </div>
            </el-option>
          </el-select>
        </el-form-item>

        <el-form-item label="比赛名称" prop="competitionName">
          <el-input v-model="honorForm.competitionName" placeholder="请输入比赛名称" />
        </el-form-item>

        <el-form-item label="奖项名称" prop="awardName">
          <el-input v-model="honorForm.awardName" placeholder="请输入奖项名称" />
        </el-form-item>

        <el-form-item label="比赛日期" prop="competitionDate">
          <el-date-picker
            v-model="honorForm.competitionDate"
            type="date"
            placeholder="选择比赛日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            class="w-full"
          />
        </el-form-item>

        <el-form-item label="级别" prop="rank">
          <el-select v-model="honorForm.rank" placeholder="请选择级别" class="w-full">
            <el-option label="金牌" value="gold" />
            <el-option label="银牌" value="silver" />
            <el-option label="铜牌" value="bronze" />
            <el-option label="其他" value="default" />
          </el-select>
        </el-form-item>

        <el-form-item label="热度值" prop="heatValue">
          <el-input-number v-model="honorForm.heatValue" :min="0" :max="100" class="w-full" />
        </el-form-item>

        <el-form-item label="描述" prop="description">
          <el-input
            v-model="honorForm.description"
            type="textarea"
            rows="3"
            placeholder="请输入荣誉描述"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitForm" :loading="submitting">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { generateSignedUrl, getHonors, addHonor, updateHonor, deleteHonor, getStudents } from '../utils/cloudbase'

// 状态变量
const honors = ref([])
const students = ref([])
const searchKeyword = ref('')
const loading = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const formRef = ref(null)

// 荣誉表单
const honorForm = ref({
  studentId: '',
  studentName: '',
  studentAvatar: '',
  studentGrade: '',
  competitionName: '',
  competitionDate: '',
  awardName: '',
  rank: '',
  heatValue: 0,
  description: ''
})

// 表单验证规则
const formRules = {
  studentId: [
    { required: true, message: '请选择学生', trigger: 'change' }
  ],
  competitionName: [
    { required: true, message: '请输入比赛名称', trigger: 'blur' }
  ],
  awardName: [
    { required: true, message: '请输入奖项名称', trigger: 'blur' }
  ],
  competitionDate: [
    { required: true, message: '请选择比赛日期', trigger: 'change' }
  ],
  rank: [
    { required: true, message: '请选择级别', trigger: 'change' }
  ]
}

// 过滤后的荣誉列表
const filteredHonors = computed(() => {
  if (!searchKeyword.value) return honors.value

  const keyword = searchKeyword.value.toLowerCase()
  return honors.value.filter(honor =>
    honor.studentName.toLowerCase().includes(keyword) ||
    honor.competitionName.toLowerCase().includes(keyword)
  )
})

const handleCloudImage = async (cloudPath) => {
  if (!cloudPath) return '';
  if (cloudPath.startsWith('http')) return cloudPath;
  if (!cloudPath.startsWith('cloud://')) return cloudPath;

  const url = await generateSignedUrl(cloudPath)  

  return url;
}

// 加载荣誉和学生数据
const loadData = async () => {
  loading.value = true
  try {
    // 获取荣誉列表
    honors.value = await getHonors()

     // 使用 Promise.all 并行处理头像 URL
     honors.value = await Promise.all(honors.value.map(async (hornor) => {
      const studentAvatar = await handleCloudImage(hornor.studentAvatar);
      return { ...hornor, studentAvatar: studentAvatar };
    }));

    console.log('===honor list======>', honors.value)

    // 获取学生列表
    students.value = await getStudents()
  } catch (error) {
    console.error('Load data error:', error)
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

// 处理学生选择变化
const handleStudentChange = (studentId) => {
  const selectedStudent = students.value.find(s => s._id === studentId)
  if (selectedStudent) {
    honorForm.value.studentName = selectedStudent.name
    honorForm.value.studentAvatar = selectedStudent.avatar
    honorForm.value.studentGrade = selectedStudent.grade
  }
}

// 处理添加荣誉
const handleAdd = () => {
  isEdit.value = false
  resetForm()
  dialogVisible.value = true
}

// 处理编辑荣誉
const handleEdit = (honor) => {
  isEdit.value = true
  resetForm()
  Object.keys(honorForm.value).forEach(key => {
    if (key in honor) {
      honorForm.value[key] = honor[key]
    }
  })
  honorForm.value._id = honor._id
  dialogVisible.value = true
}

// 处理删除荣誉
const handleDelete = (honor) => {
  ElMessageBox.confirm(
    `确定要删除"${honor.studentName}"的"${honor.awardName}"荣誉记录吗？此操作不可撤销。`,
    '删除确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      const result = await deleteHonor(honor._id)
      if (result.success) {
        ElMessage.success('删除成功')
        loadData()
      } else {
        ElMessage.error(result.message || '删除失败')
      }
    } catch (error) {
      console.error('Delete honor error:', error)
      ElMessage.error('删除失败')
    }
  }).catch(() => {})
}

// 提交表单
const submitForm = async () => {
  // 表单验证
  await formRef.value.validate()

  submitting.value = true
  try {
    const honorData = {...honorForm.value}
    // 根据当前是否为编辑模式调用相应的API
    const result = isEdit.value
      ? await updateHonor(honorData._id, honorData)
      : await addHonor(honorData)

    if (result.success) {
      ElMessage.success(isEdit.value ? '更新成功' : '添加成功')
      dialogVisible.value = false
      loadData()
    } else {
      ElMessage.error(result.message || (isEdit.value ? '更新失败' : '添加失败'))
    }
  } catch (error) {
    console.error('Submit form error:', error)
    ElMessage.error(isEdit.value ? '更新失败' : '添加失败')
  } finally {
    submitting.value = false
  }
}

// 重置表单
const resetForm = () => {
  honorForm.value = {
    studentId: '',
    studentName: '',
    studentAvatar: '',
    studentGrade: '',
    competitionName: '',
    competitionDate: '',
    awardName: '',
    rank: '',
    heatValue: 0,
    description: ''
  }
  if (formRef.value) {
    formRef.value.resetFields()
  }
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

onMounted(() => {
  loadData()
})
</script>
