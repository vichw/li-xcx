<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold">报名管理</h2>
      <div class="flex items-center">
        <el-select v-model="selectedGrade" placeholder="选择考级等级" class="w-48 mr-4">
          <el-option
            v-for="g in gradeList"
            :key="g.index"
            :label="g.name"
            :value="g.name"
          />
        </el-select>
        <el-select v-model="selectedDeleteStatus" placeholder="是否结束" class="w-48 mr-4">
          <el-option
            v-for="opt in deleteStatusOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
        <el-input
          v-model="searchKeyword"
          placeholder="搜索姓名/身份证号"
          clearable
          class="w-72 mr-4"
        />
        <el-button type="primary" @click="fetchList">查询</el-button>
        <el-button type="danger" :disabled="selectedRows.length === 0" @click="batchDelete">删除</el-button>
        <el-button type="success" @click="exportZip" :disabled="filteredList.length === 0">一键导出</el-button>
        <el-button type="warning" @click="openWeightDialog" class="ml-2">权重设置</el-button>
      </div>
    </div>
    <el-card shadow="hover">
      <el-table
        ref="tableRef"
        :data="filteredList"
        style="width: 100%"
        v-loading="loading"
        :empty-text="loading ? '加载中...' : '暂无数据'"
        size="small"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="50" />
        <el-table-column prop="name" label="姓名" :row-span="2" />
        <el-table-column prop="idCard" label="身份证号" :row-span="2" />
        <el-table-column label="头像" :row-span="2">
          <template #default="scope">
            <el-avatar :src="scope.row.avatar" size="40" />
          </template>
        </el-table-column>
        <el-table-column prop="current_grade" label="当前级别" :row-span="2" />
        <el-table-column prop="next_grade" label="考级级别" :row-span="2" />
        <el-table-column prop="fee" label="费用(元)" :row-span="2" />
        <el-table-column prop="status" label="状态" :row-span="2">
          <template #default="scope">
            <el-tag :type="scope.row.status === 1 ? 'success' : 'info'">
              {{ scope.row.status === 1 ? '已缴费' : '未缴费' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="create_time" label="报名时间" :row-span="2">
          <template #default="scope">
            {{ formatDate(scope.row.create_time) }}
          </template>
        </el-table-column>
        <el-table-column prop="pay_time" label="支付时间" :row-span="2">
          <template #default="scope">
            {{ formatDate(scope.row.pay_time) }}
          </template>
        </el-table-column>
        <el-table-column label="考试成绩" align="center">
          <el-table-column prop="score_behavior" label="行为素质">
            <template #default="scope">
              {{ scope.row.score_behavior ?? '-' }}<span v-if="scope.row.weight_behavior !== undefined">（权重:{{ scope.row.weight_behavior }}）</span>
            </template>
          </el-table-column>
          <el-table-column prop="score_tech" label="专项技术">
            <template #default="scope">
              {{ scope.row.score_tech ?? '-' }}<span v-if="scope.row.weight_tech !== undefined">（权重:{{ scope.row.weight_tech }}）</span>
            </template>
          </el-table-column>
          <el-table-column prop="score_physical" label="身体素质">
            <template #default="scope">
              {{ scope.row.score_physical ?? '-' }}<span v-if="scope.row.weight_physical !== undefined">（权重:{{ scope.row.weight_physical }}）</span>
            </template>
          </el-table-column>
          <el-table-column prop="score_total" label="总分">
            <template #default="scope">
              {{ scope.row.score_total ?? '-' }}
            </template>
          </el-table-column>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center">
          <template #default="scope">
            <el-button size="small" @click="editScore(scope.row)">编辑成绩</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    <el-dialog v-model="scoreDialogVisible" title="编辑考试成绩">
      <el-form>
        <el-form-item label="行为素质">
          <el-input-number v-model="scoreForm.score_behavior" :min="0" :max="100" />
          <span>权重: {{ weights.behavior }}</span>
        </el-form-item>
        <el-form-item label="专项技术">
          <el-input-number v-model="scoreForm.score_tech" :min="0" :max="100" />
          <span>权重: {{ weights.tech }}</span>
        </el-form-item>
        <el-form-item label="身体素质">
          <el-input-number v-model="scoreForm.score_physical" :min="0" :max="100" />
          <span>权重: {{ weights.physical }}</span>
        </el-form-item>
        <el-form-item label="总分">
          <el-input v-model="scoreForm.score_total" disabled />
        </el-form-item>
      </el-form>
      <template v-if="showWeightDiff">
        <div style="margin-top: 12px; color: #888;">
          <div>历史权重：行为{{ historyWeightInfo.behavior }}，专项{{ historyWeightInfo.tech }}，体能{{ historyWeightInfo.physical }}</div>
          <div>历史总分：{{ historyScoreInfo }}</div>
          <div style="margin-top: 8px;"><span style="color:#409EFF;">最新权重：</span>行为{{ weights.behavior }}，专项{{ weights.tech }}，体能{{ weights.physical }}</div>
          <div>最新总分：{{ scoreForm.score_total }}</div>
          <div style="color: #f56c6c;">当前权重调整后，保存将以新权重重新计算总分</div>
        </div>
      </template>
      <template #footer>
        <el-button @click="scoreDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveScore">保存</el-button>
      </template>
    </el-dialog>
    <el-dialog v-model="weightDialogVisible" title="权重设置">
      <el-form>
        <el-form-item label="行为素质">
          <el-input-number v-model="weightForm.behavior" :min="0" :max="1" :step="0.01" />
        </el-form-item>
        <el-form-item label="专项技术">
          <el-input-number v-model="weightForm.tech" :min="0" :max="1" :step="0.01" />
        </el-form-item>
        <el-form-item label="身体素质">
          <el-input-number v-model="weightForm.physical" :min="0" :max="1" :step="0.01" />
        </el-form-item>
        <div style="color:#888;font-size:13px;">三项权重之和应大于等于1，单项最大为1</div>
      </el-form>
      <template #footer>
        <el-button @click="weightDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveWeights">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { getBeltLevels, getGradeExamMembersByLevel, downloadImage, getConfig, updateGradeExamScore, updateWeightConfig, deleteGradeExam } from '../utils/cloudbase'
import dayjs from 'dayjs'

const gradeList = ref([{ name: '全部', index: -1, value: 0 }])
const selectedGrade = ref('全部')
const list = ref([])
const loading = ref(false)
const searchKeyword = ref('')
const weights = ref({ behavior: 0.3, tech: 0.3, physical: 0.4 })
const scoreDialogVisible = ref(false)
const scoreForm = ref({})
let editingRow = null
const weightDialogVisible = ref(false)
const weightForm = ref({ behavior: 0.3, tech: 0.3, physical: 0.4 })
const historyWeightInfo = ref(null)
const historyScoreInfo = ref(null)
const showWeightDiff = ref(false)
const selectedRows = ref([])

const deleteStatusOptions = [
  { label: '全部', value: '' },
  { label: '未出成绩', value: '0' },
  { label: '已出成绩', value: '1' }
]
const selectedDeleteStatus = ref('')

onMounted(async () => {
  const levels = await getBeltLevels()
  gradeList.value = [{ name: '全部', index: -1, value: 0 }, ...levels]
  await fetchList()
  await loadWeights()
})

const fetchList = async () => {
  loading.value = true
  try {
    list.value = await getGradeExamMembersByLevel(
      selectedGrade.value === '全部' ? '' : selectedGrade.value,
      selectedDeleteStatus.value
    )
  } catch (e) {
    ElMessage.error('查询失败')
  } finally {
    loading.value = false
  }
}

const filteredList = computed(() => {
  if (!searchKeyword.value) return list.value
  const keyword = searchKeyword.value.toLowerCase()
  return list.value.filter(stu =>
    (stu.name && stu.name.toLowerCase().includes(keyword)) ||
    (stu.idCard && stu.idCard.toLowerCase().includes(keyword))
  )
})

const exportZip = async () => {
  if (filteredList.value.length === 0) {
    ElMessage.warning('无可导出的数据')
    return
  }
  const zip = new JSZip()
  let detailLines = []
  for (const stu of filteredList.value) {
    // 明细内容
    detailLines.push([
      `姓名：${stu.name}`,
      `身份证号：${stu.idCard}`,
      `当前级别：${stu.current_grade}`,
      `考级级别：${stu.next_grade}`,
      `费用：${stu.fee}`,
      `状态：${stu.status === 1 ? '已缴费' : '未缴费'}`,
      `报名时间：${formatDate(stu.create_time)}`,
      `支付时间：${formatDate(stu.pay_time)}`
    ].join('  |  '))
    // 头像处理（统一调用cloudbase.js封装）
    try {
      if (stu.avatar) {
        const base64 = await downloadImage(stu.avatar)
        if (base64) {
          const byteCharacters = atob(base64)
          const byteNumbers = new Array(byteCharacters.length)
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i)
          }
          const byteArray = new Uint8Array(byteNumbers)
          const blob = new Blob([byteArray], { type: 'image/jpeg' })
          const filename = `${stu.name}-${stu.idCard}.jpg`
          zip.file(filename, blob)
        } else {
          console.warn('云函数未返回图片', stu.avatar)
        }
      }
    } catch (e) {
      console.warn('头像下载失败', stu.avatar, e)
    }
  }
  zip.file('明细.txt', detailLines.join('\n'))
  zip.generateAsync({ type: 'blob' }).then(content => {
    saveAs(content, '报名导出.zip')
  })
}

const formatDate = (val) => {
  if (!val) return '--'
  if (val.$date) return dayjs(val.$date).format('YYYY-MM-DD HH:mm:ss')
  return dayjs(val).format('YYYY-MM-DD HH:mm:ss')
}

const loadWeights = async () => {
  const configs = await getConfig(['weights_behavior', 'weights_tech', 'weights_physical'])
  weights.value.behavior = Number(configs.find(c => c.type === 'weights_behavior')?.value ?? 0.3)
  weights.value.tech = Number(configs.find(c => c.type === 'weights_tech')?.value ?? 0.3)
  weights.value.physical = Number(configs.find(c => c.type === 'weights_physical')?.value ?? 0.4)
}

const editScore = async (row) => {
  await loadWeights()
  editingRow = row
  debugger
  scoreForm.value = {
    score_behavior: row.score_behavior ?? 0,
    score_tech: row.score_tech ?? 0,
    score_physical: row.score_physical ?? 0,
    score_total: row.score_total ?? 0
  }
  // 历史权重
  historyWeightInfo.value = {
    behavior: row.weight_behavior,
    tech: row.weight_tech,
    physical: row.weight_physical
  }
  // 判断是否有差异，若有任一权重为空则不显示对比
  if (
    historyWeightInfo.value.behavior == null ||
    historyWeightInfo.value.tech == null ||
    historyWeightInfo.value.physical == null
  ) {
    showWeightDiff.value = false
  } else {
    showWeightDiff.value =
      historyWeightInfo.value.behavior !== weights.value.behavior ||
      historyWeightInfo.value.tech !== weights.value.tech ||
      historyWeightInfo.value.physical !== weights.value.physical
  }
  // 历史得分
  if (showWeightDiff.value) {
    historyScoreInfo.value = (
      (scoreForm.value.score_behavior || 0) * historyWeightInfo.value.behavior +
      (scoreForm.value.score_tech || 0) * historyWeightInfo.value.tech +
      (scoreForm.value.score_physical || 0) * historyWeightInfo.value.physical
    ).toFixed(1)
  } else {
    historyScoreInfo.value = null
  }
  scoreDialogVisible.value = true
}

watch(
  [() => scoreForm.value.score_behavior, () => scoreForm.value.score_tech, () => scoreForm.value.score_physical, () => weights.value],
  () => {
    scoreForm.value.score_total = (
      (scoreForm.value.score_behavior || 0) * weights.value.behavior +
      (scoreForm.value.score_tech || 0) * weights.value.tech +
      (scoreForm.value.score_physical || 0) * weights.value.physical
    ).toFixed(1)
  }
)

const saveScore = async () => {
  if (!editingRow) return
  // 保存到云数据库，带上当前权重
  await updateGradeExamScore(editingRow, scoreForm.value, weights.value)
  editingRow.score_behavior = scoreForm.value.score_behavior
  editingRow.score_tech = scoreForm.value.score_tech
  editingRow.score_physical = scoreForm.value.score_physical
  editingRow.score_total = scoreForm.value.score_total
  scoreDialogVisible.value = false
  await fetchList() // 保存后刷新表格
}

const openWeightDialog = async () => {
  const configs = await getConfig(['weights_behavior', 'weights_tech', 'weights_physical'])
  weightForm.value = {
    behavior: Number(configs.find(c => c.type === 'weights_behavior')?.value ?? 0.3),
    tech: Number(configs.find(c => c.type === 'weights_tech')?.value ?? 0.3),
    physical: Number(configs.find(c => c.type === 'weights_physical')?.value ?? 0.4)
  }
  weightDialogVisible.value = true
}

const saveWeights = async () => {
  const sum = Number(weightForm.value.behavior) + Number(weightForm.value.tech) + Number(weightForm.value.physical)
  if (
    weightForm.value.behavior > 1 ||
    weightForm.value.tech > 1 ||
    weightForm.value.physical > 1
  ) {
    ElMessage.error('单项权重不能大于1')
    return
  }
  if (sum < 1) {
    ElMessage.error('三项权重之和必须大于等于1')
    return
  }
  await updateWeightConfig(weightForm.value)
  ElMessage.success('权重设置已保存')
  weightDialogVisible.value = false
  await loadWeights()
}

const handleSelectionChange = (rows) => {
  selectedRows.value = rows
}

const batchDelete = async () => {
  if (selectedRows.value.length === 0) return
  ElMessageBox.confirm(
    `确定要删除选中的${selectedRows.value.length}条考级报名记录吗？此操作不可撤销！`,
    '批量删除确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      for (const row of selectedRows.value) {
        await deleteGradeExam(row._id)
      }
      ElMessage.success('删除成功')
      await fetchList()
      selectedRows.value = []
    } catch (e) {
      ElMessage.error('删除失败')
    }
  }).catch(() => {})
}
</script>

<style scoped>
.mb-6 { margin-bottom: 24px; }
.w-48 { width: 192px; }
.w-72 { width: 288px; }
.mr-4 { margin-right: 16px; }
.el-table th, .el-table td {
  padding: 6px 8px !important;
  font-size: 13px;
}
</style> 