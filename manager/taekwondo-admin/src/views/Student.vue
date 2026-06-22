<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold">学生管理</h2>

      <!-- 搜索和筛选区域 -->
      <div class="flex items-center gap-3">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索学生姓名/手机号"
          clearable
          class="w-60"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>

        <el-select
          v-model="filterMembershipType"
          placeholder="会员类型"
          clearable
          class="w-32"
        >
          <el-option label="全部" value="" />
          <el-option label="按次" value="按次" />
          <el-option label="年卡" value="年卡" />
          <el-option label="自由" value="自由" />
        </el-select>

        <el-select
          v-model="filterStatus"
          placeholder="状态筛选"
          clearable
          class="w-32"
        >
          <el-option label="全部" value="" />
          <el-option label="正常" value="正常" />
          <el-option label="已过期" value="已过期" />
          <el-option label="即将到期" value="即将到期" />
          <el-option label="次数用完" value="次数用完" />
        </el-select>

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
        <el-table-column label="头像" width="65">
          <template #default="scope">
            <el-avatar :size="50" :src="scope.row.avatar" :fit="'cover'">
              <el-icon><User /></el-icon>
            </el-avatar>
          </template>
        </el-table-column>

        <el-table-column prop="name" label="姓名"  width="60"/>
        <el-table-column prop="phoneNumber" label="手机号"  width="60"/>
        <el-table-column label="年龄" width="40">
          <template #default="scope">
            {{ getAgeFromIdCard(scope.row.idCard) }}
          </template>
        </el-table-column>
        <el-table-column prop="grade" label="等级" width="70" />
        <el-table-column label="会员类型" width="70">
          <template #default="scope">
            <el-tag :type="getMembershipTagType(scope.row.membership_type)">
              {{ scope.row.membership_type || '未设置' }}
            </el-tag>
            <div v-if="scope.row.membership_name" class="text-xs text-gray-500 mt-1">
              {{ scope.row.membership_name }}
            </div>
          </template>
        </el-table-column>
        <el-table-column label="剩余次数" width="65">
          <template #default="scope">
            <el-tag :type="scope.row.remaining_count > 0 ? 'success' : 'warning'">
              {{ scope.row.remaining_count || 0 }} 次
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="课时进度" width="140">
          <template #default="scope">
            <div class="course-progress">
              <span class="progress-text">
                {{ (scope.row.completed_courses !== undefined && scope.row.completed_courses !== null) ? scope.row.completed_courses : 0 }}/{{ getRequiredCourses(scope.row.grade) }}
              </span>
              <el-progress 
                :percentage="getCourseProgressPercent(scope.row)" 
                :stroke-width="6"
                :show-text="false"
                :status="getCourseProgressPercent(scope.row) >= 100 ? 'success' : ''"
              />
            </div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="scope">
            <el-tag :type="getStatusTagType(scope.row)">
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

        <el-table-column label="操作" width="280">
          <template #default="scope">
            <el-button type="success" size="small" @click="handleConsumeCourse(scope.row)">
              消课
            </el-button>
            <el-button type="info" size="small" @click="handleViewCourseRecords(scope.row)">
              课时记录
            </el-button>
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
            <el-radio label="自由">自由</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="会员卡" v-if="studentForm.membership_type === '年卡' || studentForm.membership_type === '自由'">
          <el-select v-model="studentForm.membership_name" @change="handleYearCardChange" class="w-full">
            <el-option
              v-if="studentForm.membership_type === '年卡'"
              v-for="card in gradeYearCardOptions"
              :key="card.value"
              :label="card.label"
              :value="card.value"
            />
            <el-option
              v-if="studentForm.membership_type === '自由'"
              v-for="card in freeCardOptions"
              :key="card.value"
              :label="card.label"
              :value="card.value"
            />
          </el-select>
        </el-form-item>

        <!-- 按次会员的课时相关字段 -->
        <template v-if="studentForm.membership_type === '按次'">
          <el-form-item label="单次价格" prop="class_price">
            <div class="flex items-center gap-2">
              <el-input-number
                v-model="studentForm.class_price"
                :min="0"
                :max="9999"
                :precision="2"
                placeholder="请输入单次课价格"
                class="flex-1"
                @change="handleClassPriceChange"
              />
              <span class="text-gray-500 text-sm">元/次</span>
            </div>
          </el-form-item>

          <el-form-item label="购买次数" prop="purchased_count">
            <div class="flex items-center gap-2">
              <el-input-number
                v-model="studentForm.purchased_count"
                :min="1"
                :max="999"
                placeholder="请输入购买次数"
                class="flex-1"
                @change="handlePurchasedCountChange"
              />
              <span class="text-gray-500 text-sm">次</span>
            </div>
          </el-form-item>

          <el-form-item label="剩余次数">
            <div class="flex items-center gap-2">
              <el-input
                :model-value="studentForm.remaining_count || 0"
                disabled
                class="flex-1"
                style="width: 200px;"
              />
              <span class="text-gray-500 text-sm">购买次数变更后自动调整</span>
            </div>
          </el-form-item>
        </template>

        <!-- 考级课时显示（所有会员类型都显示） -->
        <el-form-item label="考级课时" v-if="studentForm.grade">
          <div class="flex items-center gap-2">
            <el-input-number
              :model-value="studentForm.completed_courses || 0"
              :min="0"
              :max="999"
              disabled
              class="w-32"
            />
            <span class="text-gray-600">/</span>
            <el-input-number
              :model-value="getRequiredCourses(studentForm.grade)"
              :min="0"
              :max="999"
              disabled
              class="w-32"
            />
          </div>
          <div class="text-gray-500 text-xs mt-1">
            系统将根据等级自动设置课时数，课时消费请使用"消课"功能
          </div>
        </el-form-item>

        <el-form-item label="会员价格" prop="membership_price">
          <div class="flex items-center gap-2">
            <el-input-number 
              v-model="studentForm.membership_price" 
              :disabled="true"
              class="flex-1" 
            />
            <span class="text-gray-500 text-sm" v-if="studentForm.membership_type === '按次'">
              = {{ studentForm.purchased_count || 0 }} 次 × {{ studentForm.class_price || 0 }} 元
            </span>
            <span class="text-gray-500 text-sm" v-else>
              元
            </span>
          </div>
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

        <el-form-item label="会员开始日期" prop="membership_start_date" v-if="studentForm.membership_type === '年卡' || studentForm.membership_type === '自由'">
          <el-date-picker
            v-model="studentForm.membership_start_date"
            type="date"
            placeholder="选择会员开始日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            class="w-full"
          />
        </el-form-item>

        <el-form-item label="会员结束日期" prop="membership_end_date" v-if="studentForm.membership_type === '年卡' || studentForm.membership_type === '自由'">
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

    <!-- 课时记录弹窗 -->
    <el-dialog
      v-model="courseRecordDialogVisible"
      title="课时消费记录"
      width="700px"
      destroy-on-close
    >
      <div v-if="currentStudentForRecords" class="mb-4">
        <el-descriptions :column="4" border size="small">
          <el-descriptions-item label="学生姓名">{{ currentStudentForRecords.name }}</el-descriptions-item>
          <el-descriptions-item label="当前等级">{{ currentStudentForRecords.grade }}</el-descriptions-item>
          <el-descriptions-item label="会员类型">{{ currentStudentForRecords.membership_type }}</el-descriptions-item>
          <el-descriptions-item label="课时进度">
            <span class="text-blue-600 font-bold">
              {{ (currentStudentForRecords.completed_courses !== undefined && currentStudentForRecords.completed_courses !== null) ? currentStudentForRecords.completed_courses : 0 }}/{{ getRequiredCourses(currentStudentForRecords.grade) }}
            </span>
          </el-descriptions-item>
        </el-descriptions>
      </div>
      
      <el-table
        :data="courseRecords"
        v-loading="loadingRecords"
        size="small"
        max-height="400"
      >
        <el-table-column prop="course_date" label="日期" width="100" />
        <el-table-column prop="course_time" label="时间" width="80" />
        <el-table-column label="操作来源" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.operator_source === 'manager' ? 'warning' : 'success'" size="small">
              {{ scope.row.operator_source === 'manager' ? '管理端' : '小程序' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="operator" label="操作人" width="100" />
        <el-table-column label="扣减" width="80">
          <template #default="scope">
            <el-tag :type="scope.row.is_deducted ? 'danger' : 'info'" size="small">
              {{ scope.row.is_deducted ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="剩余次数" width="100">
          <template #default="scope">
            {{ scope.row.remaining_count_before }} → {{ scope.row.remaining_count_after }}
          </template>
        </el-table-column>
        <el-table-column label="累计课时" width="100">
          <template #default="scope">
            {{ scope.row.completed_courses_before }} → {{ scope.row.completed_courses_after }}
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" show-overflow-tooltip />
      </el-table>
      
      <div class="flex justify-center mt-4" v-if="courseRecordTotal > courseRecordPageSize">
        <el-pagination
          v-model:current-page="courseRecordPage"
          :page-size="courseRecordPageSize"
          :total="courseRecordTotal"
          layout="prev, pager, next"
          @current-change="handleCourseRecordPageChange"
        />
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {uploadFile, generateSignedUrl, getConfig, getStudents, addStudent, updateStudent, deleteStudent, consumeCourse, getCourseRecords, resetCourseProgress } from '../utils/cloudbase'
import dayjs from 'dayjs'

// 状态变量
const students = ref([])
const searchKeyword = ref('')
const filterMembershipType = ref('') // 会员类型筛选
const filterStatus = ref('') // 状态筛选
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

// 课时记录相关状态
const courseRecordDialogVisible = ref(false)
const currentStudentForRecords = ref(null)
const courseRecords = ref([])
const loadingRecords = ref(false)
const courseRecordPage = ref(1)
const courseRecordPageSize = ref(10)
const courseRecordTotal = ref(0)

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
  membership_price: 0, // 会员价格（总价）
  class_price: 0, // 单次课价格（新增）
  purchased_count: 0, // 购买课时数（累计购买次数）
  remaining_count: 0, // 剩余次数
  completed_courses: 0, // 已完成课时数
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
    {
      validator: (rule, value, callback) => {
        if (studentForm.value.membership_type === '年卡' || studentForm.value.membership_type === '自由') {
          if (!value) {
            callback(new Error('请选择会员开始日期'))
          } else {
            callback()
          }
        } else {
          callback()
        }
      },
      trigger: 'change'
    }
  ],
  membership_end_date: [
    {
      validator: (rule, value, callback) => {
        if (studentForm.value.membership_type === '年卡' || studentForm.value.membership_type === '自由') {
          if (!value) {
            callback(new Error('请选择会员结束日期'))
          } else {
            callback()
          }
        } else {
          callback()
        }
      },
      trigger: 'change'
    }
  ],
  purchased_count: [
    { 
      validator: (rule, value, callback) => {
        if (studentForm.value.membership_type === '按次') {
          if (!value && value !== 0) {
            callback(new Error('请输入购买次数'))
          } else if (value < 1) {
            callback(new Error('最低购买1次'))
          } else {
            callback()
          }
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  remaining_count: [
    { 
      validator: (rule, value, callback) => {
        // 剩余次数是自动计算的，只需要确保有值即可
        if (studentForm.value.membership_type === '按次') {
          if (value === undefined || value === null || value === '') {
            callback(new Error('剩余次数计算错误'))
          } else if (value < 0) {
            callback(new Error('剩余次数不能为负数'))
          } else {
            callback()
          }
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
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
  let result = students.value

  // 关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(student =>
      student.name.toLowerCase().includes(keyword) ||
      student.phoneNumber.includes(keyword)
    )
  }

  // 会员类型筛选
  if (filterMembershipType.value) {
    result = result.filter(student =>
      student.membership_type === filterMembershipType.value
    )
  }

  // 状态筛选
  if (filterStatus.value) {
    result = result.filter(student => {
      const status = getStatus(student)
      return status === filterStatus.value
    })
  }

  return result
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

// 自由卡选项：从 configs(type=vip_type) 拉取
const freeCardOptions = computed(() => {
  if (!vipTypes.value || !vipTypes.value.length) return []
  return vipTypes.value.map(card => ({
    label: `${card.label}-${card.price}元`,
    value: card.label,
    price: card.price
  }))
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
  originalGrade.value = '' // 清除原始等级
  originalPurchasedCount.value = 0 // 清除原始购买次数
  originalRemainingCount.value = 0 // 清除原始剩余次数
  resetForm()
  dialogVisible.value = true
}

// 处理编辑学生
const handleEdit = async (student) => {
  isEdit.value = true
  resetForm()
  
  // 保存原始等级，用于检测等级变化
  originalGrade.value = student.grade || ''
  
  // 处理头像URL转换
  let avatarUrl = student.avatar;
  if (avatarUrl && avatarUrl.startsWith('cloud://')) {
    try {
      avatarUrl = await generateSignedUrl(avatarUrl);
    } catch (error) {
      console.error('转换编辑头像URL失败:', error);
    }
  }
  
  // 复制学生数据到表单
  Object.keys(studentForm.value).forEach(key => {
    if (key in student) {
      studentForm.value[key] = student[key]
    }
  })
  
  // 兼容历史数据：如果没有 purchased_count，使用 remaining_count 作为初始值
  if (student.purchased_count === undefined || student.purchased_count === null) {
    studentForm.value.purchased_count = student.remaining_count || 1
  } else {
    studentForm.value.purchased_count = student.purchased_count
  }
  
  // 兼容历史数据：如果没有 class_price（单次课价格），使用配置的默认价格
  if (student.class_price === undefined || student.class_price === null || student.class_price === 0) {
    // 如果学生是按次会员且有会员价格和购买次数，尝试反推单次价格
    if (student.membership_type === '按次' && student.membership_price && student.purchased_count) {
      studentForm.value.class_price = Math.round((student.membership_price / student.purchased_count) * 100) / 100
    } else {
      studentForm.value.class_price = vipClassPrice.value || 0
    }
  } else {
    studentForm.value.class_price = student.class_price
  }
  
  // 兼容历史数据：如果没有 completed_courses，默认为 0
  if (student.completed_courses === undefined || student.completed_courses === null) {
    studentForm.value.completed_courses = 0
  } else {
    studentForm.value.completed_courses = student.completed_courses
  }
  
  // 记录原始购买次数和剩余次数（用于自动计算）
  // 这里应以表单中处理后的值为准，避免旧数据字段缺失导致原始值错误
  originalPurchasedCount.value = studentForm.value.purchased_count || 0
  originalRemainingCount.value = studentForm.value.remaining_count || 0
  
  console.log('========== 编辑学生信息 ==========');
  console.log('学生姓名:', student.name);
  console.log('当前等级:', student.grade);
  console.log('已完成课时:', student.completed_courses);
  console.log('记录原始值:', {
    originalGrade: student.grade,
    originalPurchasedCount: originalPurchasedCount.value,
    originalRemainingCount: originalRemainingCount.value,
    studentPurchasedCount: student.purchased_count,
    studentRemainingCount: student.remaining_count,
    formPurchasedCount: studentForm.value.purchased_count,
    formRemainingCount: studentForm.value.remaining_count,
    completedCourses: studentForm.value.completed_courses
  });
  console.log('====================================');
  
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

// 保存编辑前的等级（用于检测等级变化）
const originalGrade = ref('')
// 保存编辑前的购买次数和剩余次数（用于自动计算剩余次数）
const originalPurchasedCount = ref(0)
const originalRemainingCount = ref(0)

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
    
    // 处理购买次数：按次会员必须有值，年卡会员设为0
    if (studentData.membership_type === '按次') {
      if (studentData.purchased_count !== undefined) {
        studentData.purchased_count = Number(studentData.purchased_count);
      } else {
        // 如果没有设置，使用剩余次数作为购买次数（兼容历史数据）
        studentData.purchased_count = Number(studentData.remaining_count || 1);
      }
      // 处理单次课价格
      if (studentData.class_price !== undefined) {
        studentData.class_price = Number(studentData.class_price);
      } else {
        studentData.class_price = 0;
      }
      // 按次会员不需要会员开始结束日期，清空避免提交无用数据
      studentData.membership_start_date = '';
      studentData.membership_end_date = '';
    } else {
      // 年卡/自由卡：购买次数与单次价格均不计入
      studentData.purchased_count = 0;
      studentData.class_price = 0;
    }
    
    // 处理已完成课时数：确保有值
    if (studentData.completed_courses !== undefined && studentData.completed_courses !== null) {
      studentData.completed_courses = Number(studentData.completed_courses);
    } else {
      studentData.completed_courses = 0;
    }
    
    // 确保布尔字段类型正确
    if (studentData.isActive !== undefined) {
      studentData.isActive = Boolean(studentData.isActive);
    }
    
    // 检测是否等级发生变化（编辑模式）
    // 注意：只有在编辑模式下，且原等级存在，且等级确实改变时才返回true
    const gradeChanged = isEdit.value && originalGrade.value && (originalGrade.value !== studentData.grade);
    
    console.log('========== 提交学生信息 ==========');
    console.log('处理后的提交数据:', studentData);
    console.log('是否编辑模式:', isEdit.value);
    console.log('原等级:', originalGrade.value);
    console.log('新等级:', studentData.grade);
    console.log('等级是否变化:', gradeChanged);
    console.log('已完成课时:', studentData.completed_courses);
    console.log('====================================');
    
    // 根据当前是否为编辑模式调用相应的API
    const result = isEdit.value
      ? await updateStudent(studentData._id, studentData)
      : await addStudent(studentData)

    if (result.success) {
      // 如果等级发生变化，重置课时进度
      if (gradeChanged) {
        console.log('⚠️ 等级变化，将重置课时进度...');
        console.log('原等级:', originalGrade.value, '→ 新等级:', studentData.grade);
        
        // 二次确认是否真的要重置课时
        await ElMessageBox.confirm(
          `检测到等级从"${originalGrade.value}"变更为"${studentData.grade}"，这将重置该学生的已完成课时数为0。是否继续？`,
          '等级变更确认',
          {
            confirmButtonText: '确定重置',
            cancelButtonText: '取消',
            type: 'warning'
          }
        ).then(async () => {
          const resetResult = await resetCourseProgress(studentData._id, studentData.grade);
          if (resetResult.success) {
            ElMessage.success('更新成功，已重置课时进度')
          } else {
            ElMessage.warning('更新成功，但课时进度重置失败：' + resetResult.message)
          }
        }).catch(() => {
          ElMessage.info('已取消课时重置，但学生信息已更新')
        });
      } else {
        console.log('✓ 等级未变化，已完成课时保持不变');
        ElMessage.success(isEdit.value ? '更新成功' : '添加成功')
      }
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
    membership_price: 0, // 会员价格（总价）
    class_price: 0, // 单次课价格
    purchased_count: 0, // 购买课时数
    remaining_count: 0, // 剩余次数
    completed_courses: 0, // 已完成课时数
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
  // 如果已经有status字段且不是根据日期计算的，直接使用
  // 但我们需要根据实时数据计算，所以注释掉这部分
  // if (row.status && row.status !== '正常' && row.status !== '已过期') {
  //   return row.status;
  // }

  // 根据会员日期和剩余次数计算状态
  const now = new Date()
  const start = row.membership_start_date ? new Date(row.membership_start_date) : null
  const end = row.membership_end_date ? new Date(row.membership_end_date) : null
  const remainingCount = row.remaining_count || 0
  
  // 计算距离到期的天数
  const daysUntilExpire = end ? Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null

  // 优先判断是否已过期
  if (end && now > end) {
    return '已过期'
  }
  
  // 判断是否未开始
  if (start && now < start) {
    return '未开始'
  }
  
  // 判断次数是否用完（按次会员）
  if (row.membership_type === '按次' && remainingCount <= 0) {
    return '次数用完'
  }
  
  // 判断是否即将到期（7天内）
  if (daysUntilExpire !== null && daysUntilExpire > 0 && daysUntilExpire <= 7) {
    return '即将到期'
  }
  
  return '正常'
}

// 获取状态标签类型
const getStatusTagType = (row) => {
  const status = getStatus(row)
  const statusTypeMap = {
    '正常': 'success',
    '已过期': 'danger',
    '即将到期': 'warning',
    '次数用完': 'danger',
    '未开始': 'info'
  }
  return statusTypeMap[status] || 'info'
}

// 获取会员类型标签颜色（年卡-success，自由-primary，按次-warning）
const getMembershipTagType = (membershipType) => {
  const map = {
    '年卡': 'success',
    '自由': 'primary',
    '按次': 'warning'
  }
  return map[membershipType] || 'info'
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
    // 新建时默认设置单次价格和次数
    if (!isEdit.value) {
      studentForm.value.class_price = vipClassPrice.value || 0
      studentForm.value.purchased_count = 1
      studentForm.value.remaining_count = 1
      // 记录原始值（新建时）
      originalPurchasedCount.value = 1
      originalRemainingCount.value = 1
    } else {
      // 编辑时，如果 class_price 未设置，使用配置的单次课价格
      if (!studentForm.value.class_price || studentForm.value.class_price === 0) {
        studentForm.value.class_price = vipClassPrice.value || 0
      }
      // 编辑时，如果 purchased_count 为0或未设置，默认设为1
      if (!studentForm.value.purchased_count || studentForm.value.purchased_count === 0) {
        studentForm.value.purchased_count = 1
      }
      // 如果剩余次数为0或未设置，且购买次数有值，则剩余次数等于购买次数
      if ((!studentForm.value.remaining_count || studentForm.value.remaining_count === 0) && studentForm.value.purchased_count > 0) {
        studentForm.value.remaining_count = studentForm.value.purchased_count
      }
      // 重新记录原始值（切换会员类型时）
      originalPurchasedCount.value = studentForm.value.purchased_count
      originalRemainingCount.value = studentForm.value.remaining_count || 0
    }
    // 计算总价 = 单次价格 × 购买次数
    studentForm.value.membership_price = studentForm.value.class_price * studentForm.value.purchased_count
    studentForm.value.membership_name = '按次卡'
    // 按次会员不需要会员日期，清空
    studentForm.value.membership_start_date = ''
    studentForm.value.membership_end_date = ''
  } else if (type === '年卡') {
    studentForm.value.purchased_count = 0 // 年卡不计购买次数
    studentForm.value.remaining_count = 0 // 年卡不计次数
    studentForm.value.class_price = 0 // 年卡不计单次价格
    // 如果已选择等级且有对应的年卡价格
    if (studentForm.value.grade && gradeYearCardOptions.value.length > 0) {
      const yearCardOption = gradeYearCardOptions.value[0];
      studentForm.value.membership_name = yearCardOption.value;
      studentForm.value.membership_price = Number(yearCardOption.price);
    }
  } else if (type === '自由') {
    // 自由卡 = 年卡的兄弟分类：一年有效、不扣次数、价格取自 configs.vip_type
    studentForm.value.purchased_count = 0 // 不计购买次数
    studentForm.value.remaining_count = 0 // 不计剩余次数
    studentForm.value.class_price = 0 // 不计单次价格
    // 默认选第一张自由卡档位
    if (freeCardOptions.value.length > 0) {
      const freeCard = freeCardOptions.value[0]
      studentForm.value.membership_name = freeCard.value
      studentForm.value.membership_price = Number(freeCard.price)
    }
  }
}

// 处理会员卡选择（年卡：value 是价格；自由卡：value 是 card.label，需要反查 price）
const handleYearCardChange = (selectedValue) => {
  if (studentForm.value.membership_type === '自由') {
    // 自由卡：selectedValue 是 card.label，从 freeCardOptions 中查 price
    const freeCard = freeCardOptions.value.find(card => card.value === selectedValue)
    studentForm.value.membership_name = selectedValue
    studentForm.value.membership_price = freeCard ? Number(freeCard.price) : 0
  } else {
    // 年卡：selectedValue 是年卡价格字符串（兼容历史逻辑）
    studentForm.value.membership_name = selectedValue
    studentForm.value.membership_price = Number(selectedValue)
  }
}

// 处理购买次数变更
const handlePurchasedCountChange = (count) => {
  console.log('购买次数变更回调，新值:', count, '原始值:', originalPurchasedCount.value, originalRemainingCount.value)
  
  if (count < 1) {
    ElMessage.warning('最低购买1次')
    studentForm.value.purchased_count = 1
    count = 1 // 确保使用修正后的值
  }
  
  // 更新价格（使用单次价格 × 购买次数）
  studentForm.value.membership_price = count * (studentForm.value.class_price || 0)
  
  // 自动计算剩余次数
  if (!isEdit.value) {
    // 新建学生：剩余次数直接等于购买次数
    studentForm.value.remaining_count = count
  } else {
    // 编辑学生：根据已消费次数自动计算
    // 已消费次数 = 原始购买次数 - 原始剩余次数
    const consumedCount = originalPurchasedCount.value - originalRemainingCount.value
    // 新剩余次数 = 新购买次数 - 已消费次数
    const newRemainingCount = count - consumedCount
    // 确保剩余次数不为负数
    studentForm.value.remaining_count = Math.max(0, newRemainingCount)
    
    console.log('购买次数变更计算:', {
      originalPurchasedCount: originalPurchasedCount.value,
      originalRemainingCount: originalRemainingCount.value,
      newPurchasedCount: count,
      consumedCount: consumedCount,
      calculatedRemainingCount: newRemainingCount,
      finalRemainingCount: studentForm.value.remaining_count
    })
  }
}

// 处理单次价格变更
const handleClassPriceChange = (price) => {
  if (price < 0) {
    ElMessage.warning('单次价格不能小于0')
    studentForm.value.class_price = 0
    price = 0
  }
  
  // 更新总价 = 单次价格 × 购买次数
  studentForm.value.membership_price = price * (studentForm.value.purchased_count || 0)
  
  console.log('单次价格变更:', {
    classPrice: price,
    purchasedCount: studentForm.value.purchased_count,
    totalPrice: studentForm.value.membership_price
  })
}

// 处理剩余次数变更
const handleCountChange = (count) => {
  if (count < 0) {
    ElMessage.warning('剩余次数不能小于0')
    studentForm.value.remaining_count = 0
  }
  // 注意：剩余次数变更不影响价格，价格由购买次数和单次价格决定
}

// 监听等级变化
watch(() => studentForm.value.grade, (newGrade) => {
  if (newGrade && studentForm.value.membership_type === '年卡' && gradeYearCardOptions.value.length > 0) {
    const yearCardOption = gradeYearCardOptions.value[0];
    studentForm.value.membership_name = yearCardOption.value;
    studentForm.value.membership_price = Number(yearCardOption.price);
  }
  // 等级变化时，所需课时数会自动通过 getRequiredCourses 计算，无需手动更新
})

// 获取等级所需课时
const getRequiredCourses = (grade) => {
  if (!grade || !gradeList.value.length) return 0
  const gradeConfig = gradeList.value.find(g => g.name === grade)
  return gradeConfig?.courses || 0
}

// 计算课时进度百分比
const getCourseProgressPercent = (row) => {
  // 兼容历史数据：如果 completed_courses 字段不存在，默认为 0
  const completed = (row.completed_courses !== undefined && row.completed_courses !== null) 
    ? row.completed_courses 
    : 0
  const required = getRequiredCourses(row.grade)
  if (required <= 0) return 0
  return Math.min(Math.round((completed / required) * 100), 100)
}

// 处理消课
const handleConsumeCourse = async (student) => {
  // 检查次卡会员剩余次数
  if (student.membership_type === '按次' && (student.remaining_count || 0) <= 0) {
    ElMessage.warning('该学生课时次数不足，无法消课')
    return
  }
  
  // 先检查今日是否已消课
  const progressRes = await getCourseRecords(student._id, 1, 100)
  if (progressRes.success && progressRes.data && progressRes.data.list) {
    const today = dayjs().format('YYYY-MM-DD')
    const todayRecords = progressRes.data.list.filter(r => r.course_date === today)
    
    if (todayRecords.length > 0) {
      // 今日已消课，弹出确认
      ElMessageBox.confirm(
        `该学生今日已消课 ${todayRecords.length} 次，是否继续消课？`,
        '重复消课确认',
        {
          confirmButtonText: '继续消课',
          cancelButtonText: '取消',
          type: 'warning'
        }
      ).then(() => {
        doConsumeCourse(student, true)
      }).catch(() => {})
      return
    }
  }
  
  // 首次消课确认
  ElMessageBox.confirm(
    `确定为学生"${student.name}"消课吗？\n会员类型：${student.membership_type}\n${student.membership_type === '按次' ? '剩余次数：' + (student.remaining_count || 0) + '次' : '年卡会员不扣次数'}`,
    '消课确认',
    {
      confirmButtonText: '确定消课',
      cancelButtonText: '取消',
      type: 'info'
    }
  ).then(() => {
    doConsumeCourse(student, false)
  }).catch(() => {})
}

// 执行消课
const doConsumeCourse = async (student, confirmRepeat) => {
  try {
    const result = await consumeCourse(student._id, '管理员', '', confirmRepeat)
    
    if (result.success) {
      ElMessage.success(`消课成功！已完成课时：${result.data.completed_courses}`)
      // 刷新学生列表
      loadStudents()
    } else if (result.needConfirm) {
      // 需要确认重复消课
      ElMessageBox.confirm(
        result.message,
        '重复消课确认',
        {
          confirmButtonText: '继续消课',
          cancelButtonText: '取消',
          type: 'warning'
        }
      ).then(() => {
        doConsumeCourse(student, true)
      }).catch(() => {})
    } else {
      ElMessage.error(result.message || '消课失败')
    }
  } catch (error) {
    console.error('消课失败:', error)
    ElMessage.error('消课失败')
  }
}

// 查看课时记录
const handleViewCourseRecords = async (student) => {
  currentStudentForRecords.value = student
  courseRecordPage.value = 1
  courseRecordDialogVisible.value = true
  await loadCourseRecords(student._id)
}

// 加载课时记录
const loadCourseRecords = async (studentId) => {
  loadingRecords.value = true
  try {
    const result = await getCourseRecords(studentId, courseRecordPage.value, courseRecordPageSize.value)
    if (result.success && result.data) {
      courseRecords.value = result.data.list || []
      courseRecordTotal.value = result.data.total || 0
    } else {
      courseRecords.value = []
      courseRecordTotal.value = 0
    }
  } catch (error) {
    console.error('加载课时记录失败:', error)
    courseRecords.value = []
  } finally {
    loadingRecords.value = false
  }
}

// 课时记录分页
const handleCourseRecordPageChange = (page) => {
  courseRecordPage.value = page
  if (currentStudentForRecords.value) {
    loadCourseRecords(currentStudentForRecords.value._id)
  }
}

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
.course-progress {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.course-progress .progress-text {
  font-size: 12px;
  color: #606266;
  font-weight: 500;
}
.course-progress .el-progress {
  width: 100%;
}
.flex {
  display: flex;
}
.justify-between {
  justify-content: space-between;
}
.items-center {
  align-items: center;
}
.gap-2 {
  gap: 8px;
}
.gap-3 {
  gap: 12px;
}
.flex-1 {
  flex: 1;
}
.text-2xl {
  font-size: 24px;
}
.font-bold {
  font-weight: bold;
}
.text-gray-500 {
  color: #909399;
}
.text-gray-600 {
  color: #606266;
}
.text-blue-600 {
  color: #409EFF;
}
.text-xs {
  font-size: 12px;
}
.mt-1 {
  margin-top: 4px;
}
.mb-4 {
  margin-bottom: 16px;
}
.mb-6 {
  margin-bottom: 24px;
}
.mr-2 {
  margin-right: 8px;
}
.mr-4 {
  margin-right: 16px;
}
.w-32 {
  width: 128px;
}
.w-60 {
  width: 240px;
}
.w-72 {
  width: 288px;
}
.w-full {
  width: 100%;
}
</style>
