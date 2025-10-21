<template>
  <div>
    <div class="mb-6">
      <h2 class="text-2xl font-bold">注册管理</h2>
      <p class="text-gray-500 mt-2">管理来自小程序的学员注册申请</p>
    </div>

    <!-- 筛选选项 -->
    <div class="mb-6 flex items-center gap-4">
      <el-radio-group v-model="filterStatus" @change="handleFilterChange" class="flex-shrink-0">
        <el-radio-button label="all">全部</el-radio-button>
        <el-radio-button label="pending">待审核</el-radio-button>
        <el-radio-button label="processed">已处理</el-radio-button>
        <el-radio-button label="rejected">已拒绝</el-radio-button>
        <el-radio-button label="created">已创建学生</el-radio-button>
      </el-radio-group>

      <div class="flex-grow"></div>

      <el-input
        v-model="searchKeyword"
        placeholder="搜索手机号"
        clearable
        class="w-72"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
    </div>

    <!-- 注册列表 -->
    <el-card shadow="hover">
      <el-table
        :data="filteredRegistrations"
        style="width: 100%"
        v-loading="loading"
        :empty-text="loading ? '加载中...' : '暂无数据'"
      >
        <el-table-column type="expand">
          <template #default="props">
            <div class="p-4 bg-gray-50">
              <h4 class="text-lg font-medium mb-2">申请详情</h4>
              <el-descriptions :column="2" border>
                <el-descriptions-item label="OpenID">
                  {{ props.row.openid }}
                </el-descriptions-item>
                <el-descriptions-item label="手机号">
                  {{ props.row.phoneNumber }}
                </el-descriptions-item>
                <el-descriptions-item label="状态">
                  <el-tag :type="getStatusType(props.row.status)">
                    {{ props.row.status }}
                  </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="申请时间">
                  {{ formatDate(props.row.createTime) }}
                </el-descriptions-item>
                <el-descriptions-item label="更新时间">
                  {{ formatDate(props.row.updateTime) }}
                </el-descriptions-item>
              </el-descriptions>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="phoneNumber" label="手机号" min-width="150" />

        <el-table-column label="状态" width="120">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)">
              {{ scope.row.status }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="申请时间" min-width="180">
          <template #default="scope">
            {{ formatDate(scope.row.createTime) }}
          </template>
        </el-table-column>

        <el-table-column label="操作" width="200">
          <template #default="scope">
            <el-button
              type="primary"
              size="small"
              @click="handleProcess(scope.row, '已处理')"
              :disabled="scope.row.status !== '待审核' || scope.row.hasCreatedStudent"
            >
              处理
            </el-button>

            <el-button
              type="danger"
              size="small"
              @click="handleProcess(scope.row, '已拒绝')"
              :disabled="scope.row.status !== '待审核' || scope.row.hasCreatedStudent"
            >
              拒绝
            </el-button>

            <el-button
              type="success"
              size="small"
              @click="handleCreateStudent(scope.row)"
              :disabled="scope.row.status !== '已处理' || scope.row.hasCreatedStudent"
            >
              创建学生
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 创建学生对话框 -->
    <el-dialog
      v-model="dialogVisible"
      title="创建学生"
      width="500px"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="studentForm"
        :rules="formRules"
        label-width="100px"
      >
        <el-form-item label="手机号" prop="phoneNumber">
          <el-input v-model="studentForm.phoneNumber" disabled />
        </el-form-item>

        <el-form-item label="OpenID" prop="openid">
          <el-input v-model="studentForm.openid" disabled />
        </el-form-item>

        <el-form-item label="姓名" prop="name">
          <el-input v-model="studentForm.name" placeholder="请输入学生姓名" />
        </el-form-item>

        <el-form-item label="身份证号" prop="idCard">
          <el-input v-model="studentForm.idCard" placeholder="请输入身份证号" />
        </el-form-item>

        <el-form-item label="等级" prop="grade">
          <el-select v-model="studentForm.grade" placeholder="请选择等级" class="w-full">
            <el-option 
              v-for="grade in gradeList" 
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
              v-for="card in vipTypes"
              :key="card.value"
              :label="card.label"
              :value="card.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="剩余次数" v-if="studentForm.membership_type === '按次'">
          <el-input-number 
            v-model="studentForm.remaining_count" 
            :min="10" 
            :max="999" 
            @change="handleCountChange"
            class="w-full"
          />
        </el-form-item>

        <el-form-item label="会员价格">
          <el-input-number v-model="studentForm.membership_price" :disabled="true" class="w-full" />
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
import { getRegistrations, handleRegistration, addStudent } from '../utils/cloudbase'

// 状态变量
const registrations = ref([])
const searchKeyword = ref('')
const filterStatus = ref('all')
const loading = ref(false)
const dialogVisible = ref(false)
const submitting = ref(false)
const formRef = ref(null)
const vipTypes = ref([]) // 会员卡类型
const vipClassPrice = ref(0) // 单次课价格
const loadingConfigs = ref(false) // 加载配置状态
const currentRegistrationId = ref('') // 当前操作的注册记录ID
const gradeList = ref([]) // 添加等级列表变量

// 学生表单
const studentForm = ref({
  name: '',
  phoneNumber: '',
  openid: '',
  age: '',
  grade: '',
  avatar: 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png',
  status: '正常',
  isActive: true,
  // 会员相关字段
  membership_type: '', // 会员类型：'按次' 或 '年卡'
  membership_name: '', // 会员卡名称
  membership_price: 0, // 会员价格
  remaining_count: 0, // 剩余次数
  membership_start_date: new Date().toISOString().split('T')[0], // 会员开始日期
  membership_end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0], // 会员结束日期
})

// 表单验证规则
const formRules = {
  name: [
    { required: true, message: '请输入学生姓名', trigger: 'blur' }
  ],
  age: [
    { required: true, message: '请输入年龄', trigger: 'blur' }
  ],
  grade: [
    { required: true, message: '请选择等级', trigger: 'change' }
  ],
  // 会员相关字段验证
  membership_type: [
    { required: true, message: '请选择会员类型', trigger: 'change' }
  ],
  membership_start_date: [
    { required: true, message: '请选择会员开始日期', trigger: 'change' }
  ],
  membership_end_date: [
    { required: true, message: '请选择会员结束日期', trigger: 'change' }
  ]
}

// 过滤后的注册列表
const filteredRegistrations = computed(() => {
  let result = registrations.value
  
  // 根据状态筛选
  if (filterStatus.value !== 'all') {
    const statusMap = {
      'pending': '待审核',
      'processed': '已处理',
      'rejected': '已拒绝',
      'created': '已创建学生'
    }
    result = result.filter(item => item.status === statusMap[filterStatus.value])
  }
  
  // 根据关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(item =>
      item.phoneNumber.includes(keyword)
    )
  }
  
  return result
})

// 加载注册数据
const loadRegistrations = async () => {
  loading.value = true
  try {
    registrations.value = await getRegistrations()
    // 打印状态值，用于调试
    console.log('加载的注册数据:', registrations.value.map(r => ({id: r._id, status: r.status, statusType: typeof r.status})))
    
    // 修复可能的状态值问题
    registrations.value = registrations.value.map(reg => {
      // 确保状态是字符串类型
      if (reg.status && typeof reg.status === 'object' && reg.status.$date) {
        reg.status = '待处理' // 如果状态是日期对象，设为默认值
      }
      // 去除可能的空格
      if (typeof reg.status === 'string') {
        reg.status = reg.status.trim()
      }
      
      // 检查是否已创建学生
      reg.hasCreatedStudent = reg.status === '已创建学生'
      
      return reg
    })
    
    // 加载学生数据，检查每条注册记录是否已创建过学生
    try {
      const { getStudents } = await import('../utils/cloudbase')
      const students = await getStudents()
      
      // 为每条注册记录添加hasCreatedStudent标记
      registrations.value = registrations.value.map(reg => {
        // 检查是否有对应的学生记录（通过手机号匹配）
        const hasStudent = students.some(student => student.phoneNumber === reg.phoneNumber)
        if (hasStudent) {
          reg.hasCreatedStudent = true
          // 如果状态不是"已创建学生"但实际已创建，则更新状态
          if (reg.status !== '已创建学生') {
            // 异步更新状态，不阻塞主流程
            handleRegistration(reg._id, '已创建学生').then(() => {
              console.log(`已更新注册记录 ${reg._id} 状态为"已创建学生"`)
            }).catch(err => {
              console.error(`更新注册记录状态失败:`, err)
            })
          }
        }
        return reg
      })
    } catch (error) {
      console.error('加载学生数据失败:', error)
    }
  } catch (error) {
    console.error('Load registrations error:', error)
    ElMessage.error('加载注册数据失败')
  } finally {
    loading.value = false
  }
}

// 加载配置数据
const loadConfigs = async () => {
  loadingConfigs.value = true
  try {
    const { getConfig } = await import('../utils/cloudbase')
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

// 加载等级列表
const loadGradeList = async () => {
  try {
    const { getConfig } = await import('../utils/cloudbase')
    const res = await getConfig('belt_level')
    gradeList.value = res || []
    console.log('加载的等级列表:', gradeList.value)
  } catch (error) {
    console.error('加载等级列表失败:', error)
    ElMessage.error('加载等级列表失败')
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
    // 如果有会员卡类型，默认选择第一个
    if (vipTypes.value && vipTypes.value.length > 0) {
      studentForm.value.membership_name = vipTypes.value[0].value
      studentForm.value.membership_price = vipTypes.value[0].price
    }
  }
}

// 处理年卡选择
const handleYearCardChange = (cardName) => {
  studentForm.value.membership_name = cardName
  const selectedCard = vipTypes.value.find(card => card.value === cardName)
  if (selectedCard) {
    studentForm.value.membership_price = selectedCard.price
  }
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

// 处理注册申请状态变更
const handleProcess = async (registration, status) => {
  console.log('处理申请:', registration._id, '当前状态:', registration.status, '目标状态:', status)
  try {
    const result = await handleRegistration(registration._id, status)
    if (result.success) {
      ElMessage.success(`申请已${status}`)
      loadRegistrations()
    } else {
      ElMessage.error(result.message || '操作失败')
    }
  } catch (error) {
    console.error('Process registration error:', error)
    ElMessage.error('操作失败')
  }
}

// 处理筛选变更
const handleFilterChange = () => {
  // 筛选变更时不需要额外操作，computed会自动处理
}

// 处理创建学生
const handleCreateStudent = (registration) => {
  // 记录当前操作的注册记录ID
  currentRegistrationId.value = registration._id
  
  // 重置表单
  studentForm.value = {
    name: '',
    phoneNumber: registration.phoneNumber,
    openid: registration.openid,
    age: '',
    grade: '',
    avatar: 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png',
    status: '正常',
    isActive: true,
    // 会员相关字段
    membership_type: '', // 会员类型：'按次' 或 '年卡'
    membership_name: '', // 会员卡名称
    membership_price: 0, // 会员价格
    remaining_count: 0, // 剩余次数
    membership_start_date: new Date().toISOString().split('T')[0], // 会员开始日期
    membership_end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0], // 会员结束日期
  }
  
  // 加载配置数据
  loadConfigs()
  
  dialogVisible.value = true
}

// 提交创建学生表单
const submitForm = async () => {
  await formRef.value.validate()

  submitting.value = true
  try {
    // 创建学生
    const result = await addStudent(studentForm.value)
    if (result.success) {
      // 更新注册记录状态为"已创建学生"
      if (currentRegistrationId.value) {
        try {
          const updateResult = await handleRegistration(currentRegistrationId.value, '已创建学生')
          if (updateResult.success) {
            console.log('注册记录状态已更新为"已创建学生"')
          } else {
            console.error('更新注册记录状态失败:', updateResult.message)
          }
        } catch (updateError) {
          console.error('更新注册记录状态出错:', updateError)
        }
      }
      
      ElMessage.success('学生创建成功')
      dialogVisible.value = false
      loadRegistrations() // 重新加载注册列表
    } else {
      ElMessage.error(result.message || '创建学生失败')
    }
  } catch (error) {
    console.error('Create student error:', error)
    ElMessage.error('创建学生失败')
  } finally {
    submitting.value = false
  }
}

// 获取状态对应的标签类型
const getStatusType = (status) => {
  const types = {
    '待审核': 'warning',
    '已处理': 'success',
    '已拒绝': 'danger',
    '已创建学生': 'info',
    'default': 'info'
  }
  return types[status] || types.default
}

// 格式化日期
const formatDate = (dateObj) => {
  if (!dateObj) return '-'
  const date = new Date(dateObj.$date || dateObj)
  return date.toLocaleString('zh-CN')
}

onMounted(() => {
  loadRegistrations()
  // 加载配置数据
  loadConfigs()
  // 加载等级列表
  loadGradeList()
})
</script>
