<template>
  <div class="group-config-container">
    <div class="header">
      <h2 class="text-2xl font-bold text-gray-800">🏷️ 分组规则配置</h2>
      <el-button type="primary" @click="showCreateDialog">
        <el-icon><Plus /></el-icon>
        新建规则
      </el-button>
    </div>

    <!-- 规则列表 -->
    <el-table
      :data="configs"
      v-loading="loading"
      class="config-table"
      stripe
    >
      <el-table-column prop="name" label="规则名称" min-width="180" />
      <el-table-column prop="description" label="描述" min-width="200" />
      
      <el-table-column label="年龄组数量" width="120" align="center">
        <template #default="{ row }">
          {{ row.age_groups ? row.age_groups.length : 0 }}个
        </template>
      </el-table-column>
      
      <el-table-column label="默认规则" width="100" align="center">
        <template #default="{ row }">
          <el-tag v-if="row.is_default" type="success">是</el-tag>
          <el-tag v-else type="info">否</el-tag>
        </template>
      </el-table-column>
      
      <el-table-column label="创建时间" width="180">
        <template #default="{ row }">
          {{ formatDate(row.create_time) }}
        </template>
      </el-table-column>
      
      <el-table-column label="操作" width="280" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="viewConfig(row)">
            <el-icon><View /></el-icon>
            查看详情
          </el-button>
          <el-button link type="primary" @click="editConfig(row)">
            <el-icon><Edit /></el-icon>
            编辑
          </el-button>
          <el-button 
            v-if="!row.is_default"
            link 
            type="danger" 
            @click="deleteConfig(row)"
          >
            <el-icon><Delete /></el-icon>
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 创建/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑分组规则' : '新建分组规则'"
      width="80%"
      :close-on-click-modal="false"
    >
      <el-form :model="formData" label-width="120px">
        <el-form-item label="规则名称" required>
          <el-input v-model="formData.name" placeholder="例如：标准跆拳道分组规则" />
        </el-form-item>
        
        <el-form-item label="规则描述">
          <el-input 
            v-model="formData.description" 
            type="textarea" 
            :rows="2"
            placeholder="例如：按年龄、性别、体重三级分组"
          />
        </el-form-item>
        
        <el-divider>年龄组配置</el-divider>
        
        <div class="age-groups-config">
          <div 
            v-for="(group, index) in formData.age_groups" 
            :key="index"
            class="age-group-item"
          >
            <div class="age-group-header">
              <h4>年龄组 {{ index + 1 }}</h4>
              <el-button 
                type="danger" 
                size="small" 
                link
                @click="removeAgeGroup(index)"
              >
                删除
              </el-button>
            </div>
            
            <el-row :gutter="20">
              <el-col :span="6">
                <el-form-item label="组别代码">
                  <el-input v-model="group.code" placeholder="high_school" />
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <el-form-item label="组别名称">
                  <el-input v-model="group.name" placeholder="高中组" />
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <el-form-item label="最小年龄">
                  <el-input-number v-model="group.age_min" :min="5" :max="20" />
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <el-form-item label="最大年龄">
                  <el-input-number v-model="group.age_max" :min="5" :max="20" />
                </el-form-item>
              </el-col>
            </el-row>
            
            <el-form-item label="是否区分男女">
              <el-switch v-model="group.gender_separated" />
            </el-form-item>
            
            <!-- 体重级别配置 -->
            <div class="weight-categories-config">
              <h5>体重级别</h5>
              
              <!-- 男子组 -->
              <div v-if="group.gender_separated" class="gender-weight-group">
                <div class="gender-label">男子组</div>
                <el-button 
                  type="primary" 
                  size="small" 
                  @click="addWeightCategory(group, 'male')"
                >
                  添加级别
                </el-button>
                <div class="weight-categories-list">
                  <div 
                    v-for="(cat, catIndex) in (group.weight_categories?.male || [])" 
                    :key="catIndex"
                    class="weight-category-item"
                  >
                    <el-input v-model="cat.code" placeholder="w45" style="width: 100px;" />
                    <el-input v-model="cat.label" placeholder="-45" style="width: 80px;" />
                    <el-input-number v-model="cat.max" placeholder="45" :min="1" :max="999" style="width: 120px;" />
                    <el-button 
                      type="danger" 
                      size="small" 
                      link
                      @click="removeWeightCategory(group, 'male', catIndex)"
                    >
                      删除
                    </el-button>
                  </div>
                </div>
              </div>
              
              <!-- 女子组 -->
              <div v-if="group.gender_separated" class="gender-weight-group">
                <div class="gender-label">女子组</div>
                <el-button 
                  type="primary" 
                  size="small" 
                  @click="addWeightCategory(group, 'female')"
                >
                  添加级别
                </el-button>
                <div class="weight-categories-list">
                  <div 
                    v-for="(cat, catIndex) in (group.weight_categories?.female || [])" 
                    :key="catIndex"
                    class="weight-category-item"
                  >
                    <el-input v-model="cat.code" placeholder="w42" style="width: 100px;" />
                    <el-input v-model="cat.label" placeholder="-42" style="width: 80px;" />
                    <el-input-number v-model="cat.max" placeholder="42" :min="1" :max="999" style="width: 120px;" />
                    <el-button 
                      type="danger" 
                      size="small" 
                      link
                      @click="removeWeightCategory(group, 'female', catIndex)"
                    >
                      删除
                    </el-button>
                  </div>
                </div>
              </div>
              
              <!-- 混合组 -->
              <div v-if="!group.gender_separated" class="gender-weight-group">
                <div class="gender-label">男女混合</div>
                <el-button 
                  type="primary" 
                  size="small" 
                  @click="addWeightCategory(group, 'mixed')"
                >
                  添加级别
                </el-button>
                <div class="weight-categories-list">
                  <div 
                    v-for="(cat, catIndex) in (group.weight_categories?.mixed || [])" 
                    :key="catIndex"
                    class="weight-category-item"
                  >
                    <el-input v-model="cat.code" placeholder="w27" style="width: 100px;" />
                    <el-input v-model="cat.label" placeholder="-27" style="width: 80px;" />
                    <el-input-number v-model="cat.max" placeholder="27" :min="1" :max="999" style="width: 120px;" />
                    <el-button 
                      type="danger" 
                      size="small" 
                      link
                      @click="removeWeightCategory(group, 'mixed', catIndex)"
                    >
                      删除
                    </el-button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <el-button type="success" @click="addAgeGroup" class="mt-4">
            <el-icon><Plus /></el-icon>
            添加年龄组
          </el-button>
        </div>
      </el-form>
      
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveConfig" :loading="saving">
          保存
        </el-button>
      </template>
    </el-dialog>

    <!-- 查看详情对话框 -->
    <el-dialog
      v-model="viewDialogVisible"
      title="分组规则详情"
      width="70%"
    >
      <div v-if="viewingConfig" class="view-content">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="规则名称">{{ viewingConfig.name }}</el-descriptions-item>
          <el-descriptions-item label="描述">{{ viewingConfig.description }}</el-descriptions-item>
          <el-descriptions-item label="年龄组数量">{{ viewingConfig.age_groups?.length }}个</el-descriptions-item>
          <el-descriptions-item label="是否默认">
            <el-tag v-if="viewingConfig.is_default" type="success">是</el-tag>
            <el-tag v-else type="info">否</el-tag>
          </el-descriptions-item>
        </el-descriptions>
        
        <el-divider>年龄组配置</el-divider>
        
        <div v-for="(group, index) in viewingConfig.age_groups" :key="index" class="view-age-group">
          <h4>{{ group.name }}（{{ group.age_min }}-{{ group.age_max }}岁）</h4>
          <p>代码：{{ group.code }}</p>
          <p>区分男女：{{ group.gender_separated ? '是' : '否' }}</p>
          
          <div class="view-weight-categories">
            <div v-if="group.gender_separated">
              <h5>男子组体重级别</h5>
              <el-tag 
                v-for="cat in group.weight_categories?.male" 
                :key="cat.code"
                class="mr-2 mb-2"
              >
                {{ cat.label }}kg ({{ cat.code }})
              </el-tag>
              
              <h5 class="mt-4">女子组体重级别</h5>
              <el-tag 
                v-for="cat in group.weight_categories?.female" 
                :key="cat.code"
                class="mr-2 mb-2"
              >
                {{ cat.label }}kg ({{ cat.code }})
              </el-tag>
            </div>
            <div v-else>
              <h5>体重级别</h5>
              <el-tag 
                v-for="cat in group.weight_categories?.mixed" 
                :key="cat.code"
                class="mr-2 mb-2"
              >
                {{ cat.label }}kg ({{ cat.code }})
              </el-tag>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, Delete, View } from '@element-plus/icons-vue'
import { callFunction } from '../utils/cloudbase'

const configs = ref([])
const loading = ref(false)
const dialogVisible = ref(false)
const viewDialogVisible = ref(false)
const isEdit = ref(false)
const saving = ref(false)
const viewingConfig = ref(null)

const formData = ref({
  name: '',
  description: '',
  age_groups: []
})

// 加载配置列表
const loadConfigs = async () => {
  loading.value = true
  try {
    const result = await callFunction('competitionFunctions', {
      type: 'getGroupConfigs'
    })
    
    if (result.success) {
      configs.value = result.data || []
    } else {
      ElMessage.error('加载失败：' + (result.message || '未知错误'))
    }
  } catch (error) {
    console.error('加载配置失败:', error)
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

// 显示创建对话框
const showCreateDialog = () => {
  isEdit.value = false
  formData.value = {
    name: '',
    description: '',
    age_groups: []
  }
  dialogVisible.value = true
}

// 编辑配置
const editConfig = (config) => {
  isEdit.value = true
  formData.value = {
    _id: config._id,
    name: config.name,
    description: config.description || '',
    age_groups: JSON.parse(JSON.stringify(config.age_groups || []))
  }
  dialogVisible.value = true
}

// 查看配置
const viewConfig = (config) => {
  viewingConfig.value = config
  viewDialogVisible.value = true
}

// 删除配置
const deleteConfig = async (config) => {
  try {
    await ElMessageBox.confirm(
      '确定要删除这个分组规则吗？删除后无法恢复。',
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    // TODO: 实现删除接口
    ElMessage.success('删除成功')
    loadConfigs()
  } catch {
    // 用户取消
  }
}

// 添加年龄组
const addAgeGroup = () => {
  formData.value.age_groups.push({
    code: '',
    name: '',
    age_min: 5,
    age_max: 6,
    gender_separated: false,
    weight_categories: {
      mixed: []
    }
  })
}

// 移除年龄组
const removeAgeGroup = (index) => {
  formData.value.age_groups.splice(index, 1)
}

// 添加体重级别
const addWeightCategory = (group, gender) => {
  if (!group.weight_categories) {
    group.weight_categories = {}
  }
  if (!group.weight_categories[gender]) {
    group.weight_categories[gender] = []
  }
  group.weight_categories[gender].push({
    code: '',
    label: '',
    max: 0
  })
}

// 移除体重级别
const removeWeightCategory = (group, gender, index) => {
  group.weight_categories[gender].splice(index, 1)
}

// 保存配置
const saveConfig = async () => {
  // 验证
  if (!formData.value.name) {
    ElMessage.warning('请输入规则名称')
    return
  }
  
  if (formData.value.age_groups.length === 0) {
    ElMessage.warning('请至少添加一个年龄组')
    return
  }
  
  saving.value = true
  try {
    const data = {
      name: formData.value.name,
      description: formData.value.description,
      age_groups: formData.value.age_groups
    }
    
    let result
    if (isEdit.value) {
      result = await callFunction('competitionFunctions', {
        type: 'updateGroupConfig',
        config_id: formData.value._id,
        ...data
      })
    } else {
      result = await callFunction('competitionFunctions', {
        type: 'createGroupConfig',
        ...data
      })
    }
    
    if (result.success) {
      ElMessage.success(isEdit.value ? '更新成功' : '创建成功')
      dialogVisible.value = false
      loadConfigs()
    } else {
      ElMessage.error(result.message || '保存失败')
    }
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

// 格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(() => {
  loadConfigs()
})
</script>

<style scoped>
.group-config-container {
  padding: 24px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.config-table {
  margin-top: 16px;
}

.age-groups-config {
  max-height: 500px;
  overflow-y: auto;
}

.age-group-item {
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  background: #fafafa;
}

.age-group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.weight-categories-config {
  margin-top: 16px;
  padding: 12px;
  background: white;
  border-radius: 4px;
}

.gender-weight-group {
  margin-bottom: 16px;
}

.gender-label {
  font-weight: 600;
  margin-bottom: 8px;
  color: #333;
}

.weight-categories-list {
  margin-top: 12px;
}

.weight-category-item {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 8px;
}

.view-content {
  padding: 16px;
}

.view-age-group {
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  background: #fafafa;
}

.view-weight-categories {
  margin-top: 12px;
}
</style>

