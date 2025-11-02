<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold">学生管理</h2>

      <!-- 搜索框 -->
      <div class="flex items-center">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索学生姓名/手机号"
          clearable
          class="w-72 mr-4"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>

        <el-button type="primary" @click="handleAdd">
          <el-icon class="mr-2"><Plus /></el-icon>
          添加学生
        </el-button>
      </div>
    </div>

    <!-- 学生列表 -->
    <el-card shadow="hover">
      <el-table
        :data="filteredStudents"
        style="width: 100%"
        v-loading="loading"
        :empty-text="loading ? '加载中...' : '暂无数据'"
        size="small"
      >
        <el-table-column label="头像" width="100">
          <template #default="scope">
            <el-avatar :size="50" :src="scope.row.avatar" :fit="'cover'">
              <el-icon><User /></el-icon>
            </el-avatar>
          </template>
        </el-table-column>

        <el-table-column prop="name" label="姓名" />
        <el-table-column prop="phoneNumber" label="手机号" />
        <el-table-column label="年龄" width="80">
          <template #default="scope">
            {{ getAgeFromIdCard(scope.row.idCard) }}
          </template>
        </el-table-column>
        <el-table-column prop="grade" label="等级" width="100" />
        <el-table-column label="会员类型" width="120">
          <template #default="scope">
            <el-tag :type="scope.row.membership_type === '年卡' ? 'success' : 'warning'">
              {{ scope.row.membership_type || '未设置' }}
            </el-tag>
            <div v-if="scope.row.membership_name" class="text-xs text-gray-500 mt-1">
              {{ scope.row.membership_name }}
            </div>
          </template>
        </el-table-column>
        <el-table-column label="剩余次数" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.remaining_count > 0 ? 'success' : 'warning'">
              {{ scope.row.remaining_count || 0 }} 次
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="scope">
            <el-tag :type="getStatus(scope.row) === '正常' ? 'success' : (getStatus(scope.row) === '已过期' ? 'danger' : 'info')">
              {{ getStatus(scope.row) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="有效期" :sortable="true" :sort-method="sortByMembershipDate">
          <template #default="scope"> 
            {{ formatDate(scope.row.membership_start_date) }} - {{ formatDate(scope.row.membership_end_date) }}
          </template>
        </el-table-column>

        <el-table-column label="会员费状态" width="120">
          <template #default="scope">
            <el-tag :type="scope.row.isVipPaid === true ? 'success' : 'danger'">
              {{ scope.row.isVipPaid ? '已支付' : '未支付' }}
              
            </el-tag>
            <div v-if="scope.row.vipPayTime" class="text-xs text-gray-500">
              {{ formatDateTime(scope.row.vipPayTime.$date) }}
            </div>
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

    <!-- 学生表单对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑学生' : '添加学生'"
      width="500px"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="studentForm"
        :rules="formRules"
        label-width="100px"
      >
        <el-form-item label="姓名" prop="name">
          <el-input v-model="studentForm.name" placeholder="请输入学生姓名" />
        </el-form-item>

        <el-form-item label="手机号" prop="phoneNumber">
          <el-input v-model="studentForm.phoneNumber" placeholder="请输入手机号" />
        </el-form-item>

        <el-form-item label="身份证号" prop="idCard">
          <el-input v-model="studentForm.idCard" placeholder="请输入身份证号" />
        </el-form-item>

        <el-form-item label="等级" prop="grade">
          <el-select v-model="studentForm.grade" placeholder="请选择等级" class="w-full">
            <el-option label="请选择等级" value="" disabled />
            <el-option
              v-for="(grade, index) in gradeList"
              :key="grade._id"
              :label="grade.name"
              :value="grade.name"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="会员类型" prop="membership_type">
          <el-radio-group v-model="studentForm.membership_type" @change="handleMembershipTypeChange">
            <el-radio label="按次">按次</el-radio>
            <el-radio label="年卡">年卡</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="会员卡" v-if="studentForm.membership_type === '年卡'">
          <el-select v-model="studentForm.membership_name" @change="handleYearCardChange" class="w-full">
            <el-option
              v-for="card in gradeYearCardOptions"
              :key="card.value"
              :label="card.label"
              :value="card.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="剩余次数" prop="remaining_count" v-if="studentForm.membership_type === '按次'">
          <el-input-number
            v-model="studentForm.remaining_count"
            :min="10"
            :max="999"
            placeholder="请输入剩余次数"
            class="w-full"
            @change="handleCountChange"
          />
        </el-form-item>

        <el-form-item label="会员价格" prop="membership_price">
          <el-input-number 
            v-model="studentForm.membership_price" 
            :disabled="true"
            class="w-full" 
          />
        </el-form-item>

        <el-form-item label="头像" prop="avatar">
          <el-avatar v-if="studentForm.avatar" :src="studentForm.avatar" :size="50" :fit="'cover'"></el-avatar>
          <el-upload
            :action="studentForm.avatar"
            :on-success="handleUploadSuccess"
            :before-upload="beforeUpload"
            :show-file-list="false"
            :http-request="uploadFile"
          >
            <el-button type="primary">上传头像</el-button>
          </el-upload>
        </el-form-item>

        <el-form-item label="会员开始日期" prop="membership_start_date">
          <el-date-picker
            v-model="studentForm.membership_start_date"
            type="date"
            placeholder="选择会员开始日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            class="w-full"
          />
        </el-form-item>

        <el-form-item label="会员结束日期" prop="membership_end_date">
          <el-date-picker
            v-model="studentForm.membership_end_date"
            type="date"
            placeholder="选择会员结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            class="w-full"
          />
        </el-form-item>

        <el-form-item label="状态">
          <span>{{ getStatus(studentForm) }}</span>
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
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {uploadFile,generateSignedUrl, getConfig,getStudents, addStudent, updateStudent, deleteStudent } from '../utils/cloudbase'
import dayjs from 'dayjs'

// 状态变量
const students = ref([])
const searchKeyword = ref('')
const loading = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const formRef = ref(null)
const vipTypes = ref([]) // 会员卡类型
const vipClassPrice = ref(0) // 单次课价格
const loadingConfigs = ref(false) // 加载配置状态

// 等级列表全局变量
const gradeList = ref([])

// 学生表单
const studentForm = ref({
  name: '',
  phoneNumber: '',
  idCard: '',
  grade: '',
  avatar: '',
  status: '正常',
  isActive: true,
  // 会员相关字段
  membership_type: '', // 会员类型：'按次' 或 '年卡'
  membership_name: '', // 会员卡名称
  membership_price: 0, // 会员价格
  remaining_count: 0, // 剩余次数
  membership_start_date: '', // 会员开始日期
  membership_end_date: '', // 会员结束日期
})

// 表单验证规则
const formRules = {
  name: [
    { required: true, message: '请输入学生姓名', trigger: 'blur' }
  ],
  phoneNumber: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号', trigger: 'blur' }
  ],
  idCard: [
    { required: true, message: '请输入身份证号', trigger: 'blur' },
    { pattern: /^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/, message: '请输入有效的身份证号', trigger: 'blur' }
  ],
  grade: [
    { required: true, message: '请选择等级', trigger: 'change' }
  ],
  membership_type: [
    { required: true, message: '请选择会员类型', trigger: 'change' }
  ],
  membership_start_date: [
    { required: true, message: '请选择会员开始日期', trigger: 'change' }
  ],
  membership_end_date: [
    { required: true, message: '请选择会员结束日期', trigger: 'change' }
  ],
  remaining_count: [
    { required: true, message: '请输入剩余次数', trigger: 'blur' }
  ],
  status: [
    { required: true, message: '请选择状态', trigger: 'change' }
  ],
  avatar: [
    { required: false, message: '请上传头像', trigger: 'blur' }
  ]
}

// 过滤后的学生列表
const filteredStudents = computed(() => {
  if (!searchKeyword.value) return students.value

  const keyword = searchKeyword.value.toLowerCase()
  return students.value.filter(student =>
    student.name.toLowerCase().includes(keyword) ||
    student.phoneNumber.includes(keyword)
  )
})

// 根据选择的等级生成会员卡选项
const gradeYearCardOptions = computed(() => {
  if (!studentForm.value.grade || !gradeList.value.length) return []
  
  const selectedGrade = gradeList.value.find(grade => grade.name === studentForm.value.grade)
  if (!selectedGrade || !selectedGrade.yearprice) return []
  
  return [{
    label: `${selectedGrade.name}-${selectedGrade.yearprice}`,
    value: selectedGrade.yearprice,
    price: selectedGrade.yearprice
  }]
})

// 加载学生数据
const loadStudents = async () => {
  loading.value = true
  try {
    const response = await getStudents();
    console.log('原始学生数据:', response);

    // 处理新的数据结构
    let studentList = [];
    if (response && response.data && response.data.list) {
      studentList = response.data.list;
    } else if (Array.isArray(response)) {
      // 兼容旧的数据格式
      studentList = response;
    } else {
      console.warn('学生数据格式异常:', response);
      studentList = [];
    }

    // 使用 Promise.all 并行处理头像 URL
    students.value = await Promise.all(studentList.map(async (student) => {
      const avatarUrl = await handleCloudImage(student.avatar);
      console.log('student avatar:', avatarUrl);
      return { ...student, avatar: avatarUrl };
    }));

    console.log('处理后的学生数据:', students.value)

  } catch (error) {
    console.error('Load students error:', error)
    ElMessage.error('加载学生数据失败')
  } finally {
    loading.value = false
  }
}

// 处理添加学生
const handleAdd = () => {
  isEdit.value = false
  resetForm()
  dialogVisible.value = true
}

// 处理编辑学生
const handleEdit = async (student) => {
  isEdit.value = true
  resetForm()
  
  // 处理头像URL转换
  let avatarUrl = student.avatar;
  if (avatarUrl && avatarUrl.startsWith('cloud://')) {
    try {
      avatarUrl = await generateSignedUrl(avatarUrl);
    } catch (error) {
      console.error('转换编辑头像URL失败:', error);
    }
  }
  
  Object.keys(studentForm.value).forEach(key => {
    if (key in student) {
      studentForm.value[key] = student[key]
    }
  })
  studentForm.value.grade = student.grade
  studentForm.value.avatar = avatarUrl; // 使用转换后的头像URL
  studentForm.value._id = student._id
  dialogVisible.value = true
}

// 处理删除学生
const handleDelete = (student) => {
  ElMessageBox.confirm(
    `确定要删除学生"${student.name}"吗？此操作不可撤销。`,
    '删除确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      const result = await deleteStudent(student._id)
      if (result.success) {
        ElMessage.success('删除成功')
        loadStudents()
      } else {
        ElMessage.error(result.message || '删除失败')
      }
    } catch (error) {
      console.error('Delete student error:', error)
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
    const studentData = {...studentForm.value}
    
    // 数据预处理
    console.log('提交前的表单数据:', studentData);
    
    // 确保数值字段类型正确
    if (studentData.remaining_count !== undefined) {
      studentData.remaining_count = Number(studentData.remaining_count);
    }
    
    // 确保布尔字段类型正确
    if (studentData.isActive !== undefined) {
      studentData.isActive = Boolean(studentData.isActive);
    }
    
    console.log('处理后的提交数据:', studentData);
    
    // 根据当前是否为编辑模式调用相应的API
    const result = isEdit.value
      ? await updateStudent(studentData._id, studentData)
      : await addStudent(studentData)

    if (result.success) {
      ElMessage.success(isEdit.value ? '更新成功' : '添加成功')
      dialogVisible.value = false
      loadStudents()
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
  studentForm.value = {
    name: '',
    phoneNumber: '',
    idCard: '',
    grade: '',
    avatar: '',
    status: '正常',
    isActive: true,
    // 会员相关字段
    membership_type: '', // 会员类型：'按次' 或 '年卡'
    membership_name: '', // 会员卡名称
    membership_price: 0, // 会员价格
    remaining_count: 0, // 剩余次数
    membership_start_date: '', // 会员开始日期
    membership_end_date: '', // 会员结束日期
  }
  if (formRef.value) {
    formRef.value.resetFields()
  }
}

// 格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return dateStr
}

const getAgeFromIdCard = (idCard) => {
  if (!idCard) return ''
  const birthYear = idCard.substring(6, 10)
  const currentYear = new Date().getFullYear()
  return currentYear - birthYear
}

const loadGradeList = async () => {
  try {
    debugger
    const res = await getConfig()
    gradeList.value = res || []
  } catch (error) {
    console.error('Load grade list error:', error)
    ElMessage.error('加载等级列表失败')
  }
}

const handleCloudImage = async (cloudPath) => {
  if (!cloudPath) return '';
  if (cloudPath.startsWith('http')) return cloudPath;
  if (!cloudPath.startsWith('cloud://')) return cloudPath;

  try {
    console.log('开始处理头像URL:', cloudPath);
    const url = await generateSignedUrl(cloudPath);
    console.log('转换头像URL成功:', cloudPath, '->', url);
    
    // 检查转换结果
    if (!url || url === cloudPath) {
      console.warn('头像URL转换失败或返回原始路径:', cloudPath);
      return cloudPath;
    }
    
    return url;
  } catch (error) {
    console.error('转换头像URL失败:', cloudPath, error);
    console.error('错误详情:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    return cloudPath; // 转换失败时返回原始路径
  }
}

const beforeUpload = (file) => {
  const fileType = file.type;
  const fileSize = file.size / 1024 / 1024; // MB

  if (!['image/jpeg', 'image/png', 'image/gif'].includes(fileType)) {
    ElMessage.error('只能上传 JPG、PNG、GIF 格式的图片!');
    return false;
  }

  if (fileSize > 2) {
    ElMessage.error('上传图片大小不能超过 2MB!');
    return false;
  }

  return true;
};

const handleUploadSuccess = (response) => {
  console.log('上传成功:', response);
  if (response.success) {
    studentForm.value.avatar = response.url; //  设置头像URL
    ElMessage.success('上传成功');
  } else {
    ElMessage.error(response.message || '上传失败');
  }
};

const sortByMembershipDate = (a, b) => {
  // 使用membership_end_date进行排序
  if (!a.membership_end_date && !b.membership_end_date) return 0
  if (!a.membership_end_date) return -1
  if (!b.membership_end_date) return 1
  return new Date(a.membership_end_date) - new Date(b.membership_end_date)
}

const getStatus = (row) => {
  // 如果已经有status字段，直接使用
  if (row.status) {
    return row.status;
  }

  // 否则根据会员日期和剩余次数计算状态
  const now = new Date()
  const start = row.membership_start_date ? new Date(row.membership_start_date) : null
  const end = row.membership_end_date ? new Date(row.membership_end_date) : null
  const remainingCount = row.remaining_count || 0

  if (start && end) {
    if (now < start) return '未开始'
    if (now > end) return '已过期'
    if (remainingCount <= 0) return '次数用完'
    return '正常'
  }
  if (end && now > end) return '已过期'
  if (remainingCount <= 0) return '次数用完'
  return '正常'
}

const formatDateTime = (val) => {
  if (!val) return ''
  return dayjs(val).format('YYYY-MM-DD HH:mm:ss')
}

// 加载配置数据
const loadConfigs = async () => {
  loadingConfigs.value = true
  try {
    // 获取会员类型和单次课价格
    const configs = await getConfig(['vip_type', 'vip_class_price'])
    
    // 处理会员卡类型
    vipTypes.value = configs.filter(item => item.type === 'vip_type').map(item => ({
      label: item.name,
      value: item.name,
      price: item.value
    }))
    
    // 处理单次课价格
    const classPriceConfig = configs.find(item => item.type === 'vip_class_price')
    if (classPriceConfig) {
      vipClassPrice.value = classPriceConfig.value
    }
    
    console.log('加载的配置:', { vipTypes: vipTypes.value, vipClassPrice: vipClassPrice.value })
  } catch (error) {
    console.error('加载配置数据失败:', error)
    ElMessage.error('加载配置数据失败')
  } finally {
    loadingConfigs.value = false
  }
}

// 处理会员类型变更
const handleMembershipTypeChange = (type) => {
  studentForm.value.membership_type = type
  
  if (type === '按次') {
    // 默认设置为10次
    studentForm.value.remaining_count = 10
    studentForm.value.membership_price = vipClassPrice.value * 10
    studentForm.value.membership_name = '按次卡'
  } else if (type === '年卡') {
    studentForm.value.remaining_count = 0 // 年卡不计次数
    // 如果已选择等级且有对应的年卡价格
    if (studentForm.value.grade && gradeYearCardOptions.value.length > 0) {
      const yearCardOption = gradeYearCardOptions.value[0];
      studentForm.value.membership_name = yearCardOption.value;
      studentForm.value.membership_price = Number(yearCardOption.price);
    }
  }
}

// 处理年卡选择
const handleYearCardChange = (yearPrice) => {
  studentForm.value.membership_name = yearPrice
  studentForm.value.membership_price = Number(yearPrice)
}

// 处理按次数量变更
const handleCountChange = (count) => {
  if (count < 10) {
    ElMessage.warning('最少购买10次课')
    studentForm.value.remaining_count = 10
  }
  // 更新价格
  studentForm.value.membership_price = studentForm.value.remaining_count * vipClassPrice.value
}

// 监听等级变化
watch(() => studentForm.value.grade, (newGrade) => {
  if (studentForm.value.membership_type === '年卡' && gradeYearCardOptions.value.length > 0) {
    const yearCardOption = gradeYearCardOptions.value[0];
    studentForm.value.membership_name = yearCardOption.value;
    studentForm.value.membership_price = Number(yearCardOption.price);
  }
})

onMounted(() => {
  loadStudents()
  loadGradeList()
  loadConfigs() // 加载配置数据
})
</script>

<style scoped>
.el-table th, .el-table td {
  padding: 6px 8px !important;
  font-size: 13px;
}
.el-button--small {
  padding: 3px 10px;
  font-size: 13px;
}
</style>
