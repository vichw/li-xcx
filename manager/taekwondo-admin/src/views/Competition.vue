<template>
  <div class="competition-container">
    <div class="header">
      <h2 class="text-2xl font-bold text-gray-800">🏆 比赛管理</h2>
      <el-button type="primary" @click="showCreateDialog">
        <el-icon><Plus /></el-icon>
        新建比赛
      </el-button>
    </div>

    <!-- 筛选条件 -->
    <div class="filter-bar">
      <el-input
        v-model="searchKeyword"
        placeholder="搜索比赛名称"
        class="search-input"
        clearable
        @change="loadCompetitions"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>

      <el-select
        v-model="filterStatus"
        placeholder="选择比赛状态"
        clearable
        @change="loadCompetitions"
        class="filter-select"
      >
        <el-option label="全部状态" value="" />
        <el-option label="未开始" value="pending" />
        <el-option label="进行中" value="ongoing" />
        <el-option label="已完成" value="finished" />
      </el-select>

      <el-select
        v-model="filterRegistrationStatus"
        placeholder="选择报名状态"
        clearable
        @change="loadCompetitions"
        class="filter-select"
      >
        <el-option label="全部报名状态" value="" />
        <el-option label="报名中" value="open" />
        <el-option label="已截止" value="closed" />
      </el-select>
    </div>

    <!-- 比赛列表 -->
    <el-table
      :data="competitions"
      v-loading="loading"
      class="competition-table"
      stripe
    >
      <el-table-column prop="name" label="赛事名称" min-width="180" />
      
      <el-table-column label="比赛日期" width="220">
        <template #default="{ row }">
          {{ formatDate(row.start_date) }} ~ {{ formatDate(row.end_date) }}
        </template>
      </el-table-column>
      
      <el-table-column label="报名状态" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="row.registration_status === 'open' ? 'success' : 'info'">
            {{ row.registration_status === 'open' ? '报名中' : '已截止' }}
          </el-tag>
        </template>
      </el-table-column>
      
      <el-table-column prop="registration_count" label="报名人数" width="100" align="center">
        <template #default="{ row }">
          {{ row.registration_count || 0 }}人
        </template>
      </el-table-column>
      
      <el-table-column prop="participant_count" label="参赛人数" width="100" align="center">
        <template #default="{ row }">
          {{ row.participant_count || 0 }}人
        </template>
      </el-table-column>
      
      <el-table-column label="比赛状态" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)">
            {{ getStatusText(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      
      <el-table-column label="对战表" width="100" align="center">
        <template #default="{ row }">
          <el-tag v-if="row.bracket_generated" type="success">已生成</el-tag>
          <el-tag v-else type="info">未生成</el-tag>
        </template>
      </el-table-column>
      
      <el-table-column label="操作" width="560" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="editCompetition(row)">编辑</el-button>
          
          <!-- 所有比赛都显示分组管理 -->
          <el-button
            size="small"
            type="info"
            @click="viewGroups(row)"
          >
            分组管理
          </el-button>

          <el-button
            size="small"
            type="primary"
            plain
            @click="viewRegistrations(row)"
          >
            维护报名学生
          </el-button>
          
          <el-button
            v-if="row.bracket_generated"
            size="small"
            type="primary"
            @click="viewBracket(row)"
          >
            对战表管理
          </el-button>
          
          <el-button
            v-if="row.bracket_generated"
            size="small"
            type="warning"
            @click="viewResult(row)"
          >
            结果管理
          </el-button>

          <el-button
            v-if="row.bracket_generated"
            size="small"
            type="danger"
            @click="clearAllBracketsForCompetition(row)"
          >
            <el-icon><Delete /></el-icon>
            一键清空对战表
          </el-button>

          <el-button
            size="small"
            type="danger"
            @click="deleteCompetition(row)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <el-pagination
      v-model:current-page="currentPage"
      v-model:page-size="pageSize"
      :total="total"
      :page-sizes="[10, 20, 50]"
      layout="total, sizes, prev, pager, next, jumper"
      @size-change="loadCompetitions"
      @current-change="loadCompetitions"
      class="pagination"
    />

    <!-- 创建/编辑比赛对话框 -->
    <el-dialog
      :title="dialogTitle"
      v-model="dialogVisible"
      width="500px"
      @close="resetForm"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="100px"
      >
        <el-form-item label="赛事名称" prop="name">
          <el-input v-model="formData.name" placeholder="请输入赛事名称" />
        </el-form-item>
        
        <el-form-item label="开始日期" prop="start_date">
          <el-date-picker
            v-model="formData.start_date"
            type="date"
            placeholder="选择开始日期"
            style="width: 100%"
          />
        </el-form-item>
        
        <el-form-item label="结束日期" prop="end_date">
          <el-date-picker
            v-model="formData.end_date"
            type="date"
            placeholder="选择结束日期"
            style="width: 100%"
          />
        </el-form-item>
        
        <el-form-item label="报名状态" prop="registration_status">
          <el-radio-group v-model="formData.registration_status">
            <el-radio label="open">开放报名</el-radio>
            <el-radio label="closed">关闭报名</el-radio>
          </el-radio-group>
        </el-form-item>
        
        <!-- 选择分组规则（必填） -->
        <el-form-item label="分组规则" prop="group_config_id">
          <el-select 
            v-model="formData.group_config_id" 
            placeholder="选择分组规则"
            style="width: 100%"
          >
            <el-option
              v-for="config in groupConfigs"
              :key="config._id"
              :label="config.name"
              :value="config._id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm" :loading="submitting">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Search, Delete } from '@element-plus/icons-vue';
import { useRouter } from 'vue-router';
import { callFunction } from '../utils/cloudbase';

const router = useRouter();

// 数据
const competitions = ref([]);
const loading = ref(false);
const submitting = ref(false);
const groupConfigs = ref([]);

// 分页
const currentPage = ref(1);
const pageSize = ref(20);
const total = ref(0);

// 筛选
const searchKeyword = ref('');
const filterStatus = ref('');
const filterRegistrationStatus = ref('');

// 对话框
const dialogVisible = ref(false);
const dialogTitle = ref('新建比赛');
const isEdit = ref(false);
const editId = ref('');

const formRef = ref(null);
const formData = reactive({
  name: '',
  start_date: '',
  end_date: '',
  registration_status: 'open',
  group_config_id: ''
});

const formRules = {
  name: [
    { required: true, message: '请输入赛事名称', trigger: 'blur' }
  ],
  start_date: [
    { required: true, message: '请选择开始日期', trigger: 'change' }
  ],
  end_date: [
    { required: true, message: '请选择结束日期', trigger: 'change' }
  ],
  registration_status: [
    { required: true, message: '请选择报名状态', trigger: 'change' }
  ],
  group_config_id: [
    { required: true, message: '请选择分组规则', trigger: 'change' }
  ]
};

// 加载比赛列表
const loadCompetitions = async () => {
  loading.value = true;
  try {
    const result = await callFunction('competitionFunctions', {
      type: 'getCompetitions',
      status: filterStatus.value,
      registration_status: filterRegistrationStatus.value,
      limit: pageSize.value,
      skip: (currentPage.value - 1) * pageSize.value
    });
    
    if (result.success) {
      competitions.value = result.data;
      total.value = result.total;
    } else {
      ElMessage.error(result.message || '加载失败');
    }
  } catch (error) {
    console.error('加载比赛列表失败:', error);
    ElMessage.error('加载失败');
  } finally {
    loading.value = false;
  }
};

// 显示创建对话框
const showCreateDialog = () => {
  isEdit.value = false;
  dialogTitle.value = '新建比赛';
  dialogVisible.value = true;
};

// 编辑比赛
const editCompetition = (row) => {
  isEdit.value = true;
  editId.value = row._id;
  dialogTitle.value = '编辑比赛';
  
  Object.assign(formData, {
    name: row.name,
    start_date: new Date(row.start_date),
    end_date: new Date(row.end_date),
    registration_status: row.registration_status || 'open',
    group_config_id: row.group_config_id || ''
  });
  
  dialogVisible.value = true;
};

// 提交表单
const submitForm = async () => {
  if (!formRef.value) return;
  
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    
    // 验证日期
    if (new Date(formData.start_date) >= new Date(formData.end_date)) {
      ElMessage.error('结束日期必须大于开始日期');
      return;
    }
    
    // 验证分组规则
    if (!formData.group_config_id) {
      ElMessage.error('请选择分组规则');
      return;
    }
    
    submitting.value = true;
    
    try {
      const params = {
        type: isEdit.value ? 'updateCompetition' : 'createCompetition',
        name: formData.name,
        start_date: formData.start_date.toISOString(),
        end_date: formData.end_date.toISOString(),
        registration_status: formData.registration_status,
        group_config_id: formData.group_config_id
      };
      
      if (isEdit.value) {
        params.competition_id = editId.value;
      }
      
      const result = await callFunction('competitionFunctions', params);
      
      if (result.success) {
        ElMessage.success(isEdit.value ? '更新成功' : '创建成功');
        dialogVisible.value = false;
        loadCompetitions();
      } else {
        ElMessage.error(result.message || '操作失败');
      }
    } catch (error) {
      console.error('提交失败:', error);
      ElMessage.error('操作失败');
    } finally {
      submitting.value = false;
    }
  });
};

// 重置表单
const resetForm = () => {
  if (formRef.value) {
    formRef.value.resetFields();
  }
  Object.assign(formData, {
    name: '',
    start_date: '',
    end_date: '',
    registration_status: 'open',
    group_config_id: ''
  });
};

// 查看报名管理
const viewRegistrations = (row) => {
  router.push(`/dashboard/competition/${row._id}/registration`);
};

// 生成对战表
const generateBracket = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要为"${row.name}"生成对战表吗？将基于已选中的${row.participant_count}名参赛学生生成。`,
      '确认操作',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    
    loading.value = true;
    const result = await callFunction('competitionFunctions', {
      type: 'generateBracket',
      competition_id: row._id,
      regenerate: false
    });
    
    if (result.success) {
      ElMessage.success(`对战表生成成功！共${result.data.participant_count}人参赛`);
      loadCompetitions();
    } else {
      ElMessage.error(result.message || '生成失败');
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('生成对战表失败:', error);
      ElMessage.error('生成失败');
    }
  } finally {
    loading.value = false;
  }
};

// 查看对战表
const viewBracket = (row) => {
  router.push(`/dashboard/competition/${row._id}/bracket`);
};

// 查看结果
const viewResult = (row) => {
  router.push(`/dashboard/competition/${row._id}/result`);
};

// 一键清空所有分组对战表
const clearAllBracketsForCompetition = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定清空"${row.name}"的所有分组对战表及比赛结果吗？此操作不可恢复。`,
      '确认清空',
      {
        confirmButtonText: '确定清空',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );

    const result = await callFunction('competitionFunctions', {
      type: 'clearAllBrackets',
      competition_id: row._id
    });

    if (result.success) {
      ElMessage.success(
        `已清空：删除 ${result.data.deleted_brackets} 场比赛，${result.data.deleted_results} 条结果`
      );
      loadCompetitions();
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

// 删除比赛
const deleteCompetition = async (row) => {
  try {
    // 根据比赛状态提供不同的警告信息
    let warningMessage = `确定要删除"${row.name}"吗？`;
    
    if (row.status === 'ongoing') {
      warningMessage += `\n\n⚠️ 该比赛正在进行中！`;
    } else if (row.status === 'finished') {
      warningMessage += `\n\n⚠️ 该比赛已完成！`;
    }
    
    if (row.registration_count > 0 || row.participant_count > 0) {
      warningMessage += `\n• 将删除 ${row.registration_count || 0} 条报名记录`;
    }
    
    if (row.bracket_generated) {
      warningMessage += `\n• 将删除所有对战表和比赛结果`;
    }
    
    warningMessage += `\n\n此操作不可恢复，请谨慎操作！`;
    
    await ElMessageBox.confirm(
      warningMessage,
      '确认删除',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'error',
        dangerouslyUseHTMLString: false
      }
    );
    
    loading.value = true;
    const result = await callFunction('competitionFunctions', {
      type: 'deleteCompetition',
      competition_id: row._id
    });
    
    if (result.success) {
      ElMessage.success('删除成功');
      loadCompetitions();
    } else {
      ElMessage.error(result.message || '删除失败');
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除比赛失败:', error);
      ElMessage.error('删除失败');
    }
  } finally {
    loading.value = false;
  }
};

// 格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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

// 加载分组配置列表
const loadGroupConfigs = async () => {
  try {
    const result = await callFunction('competitionFunctions', {
      type: 'getGroupConfigs'
    });
    if (result.success) {
      groupConfigs.value = result.data || [];
    }
  } catch (error) {
    console.error('加载分组配置失败:', error);
  }
};

// 查看分组管理
const viewGroups = (competition) => {
  router.push({
    name: 'CompetitionGroups',
    params: { id: competition._id }
  });
};

// 初始化
onMounted(() => {
  loadCompetitions();
  loadGroupConfigs();
});
</script>

<style scoped>
.competition-container {
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.filter-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.search-input {
  width: 300px;
}

.filter-select {
  width: 180px;
}

.competition-table {
  margin-bottom: 20px;
}

.pagination {
  display: flex;
  justify-content: flex-end;
}
</style>

