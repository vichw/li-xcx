<template>
  <div class="registration-container">
    <div class="header">
      <div>
        <el-button @click="goBack" class="mb-2">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
        <h2 class="text-2xl font-bold text-gray-800">
          🏆 {{ competition?.name }} - 报名管理
        </h2>
        <div class="info-bar">
          <el-tag :type="competition?.registration_status === 'open' ? 'success' : 'info'">
            报名状态: {{ competition?.registration_status === 'open' ? '开放中' : '已截止' }}
          </el-tag>
          <span class="ml-4 text-gray-600">
            报名人数: {{ registrations.length }}人
          </span>
          <span class="ml-4 text-gray-600">
            已选中: {{ selectedCount }}人
          </span>
        </div>
      </div>
      <div class="action-buttons">
        <el-button
          type="success"
          @click="openCreateDialog"
          :disabled="competition?.registration_status !== 'open'"
        >
          新增报名学生
        </el-button>
        <el-button
          type="primary"
          :disabled="selectedCount < 2"
          @click="generateBracketWithSelected"
        >
          <el-icon><Trophy /></el-icon>
          生成对战表（按分组）
        </el-button>
        <el-button @click="exportRegistrations">
          <el-icon><Download /></el-icon>
          导出报名表
        </el-button>
        <el-button type="info" @click="statsDialogVisible = true">
          <el-icon><DataBoard /></el-icon>
          分组统计
        </el-button>
      </div>
    </div>

    <el-divider />

    <!-- 操作栏 -->
    <div class="toolbar">
      <el-button size="small" @click="selectAll">全选</el-button>
      <el-button size="small" @click="selectNone">取消全选</el-button>
      <el-button size="small" @click="invertSelection">反选</el-button>
      
      <el-button
        size="small"
        type="primary"
        :disabled="selectedRegistrationIds.length === 0"
        @click="confirmSelection"
      >
        确认选择（{{ selectedRegistrationIds.length }}人）
      </el-button>
    </div>

    <!-- 报名列表 -->
    <el-table
      ref="registrationTableRef"
      :data="registrations"
      v-loading="loading"
      class="registration-table"
      stripe
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="55" :selectable="checkSelectable" />
      
      <el-table-column label="序号" type="index" width="60" />

      <el-table-column label="子组" min-width="180">
        <template #default="{ row }">
          <span v-if="!row.editing">{{ row.sub_group_name || '-' }}</span>
          <el-select
            v-else
            v-model="row.new_sub_group_id"
            placeholder="选择分组"
            size="small"
            filterable
            style="width: 100%"
          >
            <el-option
              v-for="sg in availableSubGroups"
              :key="sg.sub_group_id"
              :label="sg.sub_group_name"
              :value="sg.sub_group_id"
            >
              <span style="float: left">{{ sg.sub_group_name }}</span>
              <span style="float: right; color: #8492a6; font-size: 12px">
                {{ sg.participant_count }}人
              </span>
            </el-option>
          </el-select>
        </template>
      </el-table-column>

      <el-table-column prop="student_name" label="姓名" width="120">
        <template #default="{ row }">
          <el-input
            v-if="row.editing"
            v-model="row.student_name"
            size="small"
          />
          <span v-else>{{ row.student_name }}</span>
        </template>
      </el-table-column>

      <el-table-column prop="organization" label="所属单位" width="140">
        <template #default="{ row }">
          <el-input
            v-if="row.editing"
            v-model="row.organization"
            size="small"
          />
          <span v-else>{{ row.organization || '-' }}</span>
        </template>
      </el-table-column>

      <el-table-column prop="id_card" label="身份证号" width="160">
        <template #default="{ row }">
          <span>{{ row.id_card ? row.id_card.substr(0, 6) + '********' + row.id_card.substr(14) : '-' }}</span>
        </template>
      </el-table-column>
      
      <el-table-column prop="age" label="年龄" width="70" align="center">
        <template #default="{ row }">
          <span>{{ row.age }}</span>
        </template>
      </el-table-column>
      
      <el-table-column prop="gender" label="性别" width="70" align="center">
        <template #default="{ row }">
          <span>{{ row.gender === 'male' ? '男' : '女' }}</span>
        </template>
      </el-table-column>
      
      <el-table-column prop="weight" label="体重(kg)" width="100" align="center">
        <template #default="{ row }">
          <el-input-number
            v-if="row.editing"
            v-model="row.weight"
            :min="20"
            :max="150"
            :precision="1"
            size="small"
          />
          <span v-else>{{ row.weight }}</span>
        </template>
      </el-table-column>

      <el-table-column label="年龄组" width="120" align="center">
        <template #default="{ row }">
          {{ row.age_group_name || '-' }}
        </template>
      </el-table-column>

      <el-table-column label="体重级别" width="100" align="center">
        <template #default="{ row }">
          <span v-if="row.weight_category_label">{{ row.weight_category_label }}kg</span>
          <span v-else>-</span>
        </template>
      </el-table-column>

      <el-table-column label="报名时间" width="160">
        <template #default="{ row }">
          {{ formatDateTime(row.registration_time) }}
        </template>
      </el-table-column>
      
      <el-table-column label="状态" width="100" align="center">
        <template #default="{ row }">
          <el-tag v-if="row.is_selected" type="success">已选中</el-tag>
          <el-tag v-else type="info">待选择</el-tag>
        </template>
      </el-table-column>
      
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button
            v-if="!row.editing"
            size="small"
            @click="editRow(row)"
          >
            编辑
          </el-button>
          <el-button
            v-if="!row.editing"
            size="small"
            type="danger"
            @click="removeRow(row)"
          >
            移除
          </el-button>
          <el-button
            v-if="row.editing"
            size="small"
            type="primary"
            @click="saveRow(row)"
          >
            保存
          </el-button>
          <el-button
            v-if="row.editing"
            size="small"
            @click="cancelEdit(row)"
          >
            取消
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog
      v-model="createDialogVisible"
      title="维护报名学生信息"
      width="520px"
      @close="resetCreateForm"
    >
      <el-form :model="createForm" label-width="100px">
        <el-form-item label="姓名" required>
          <el-input v-model="createForm.student_name" placeholder="请输入姓名" />
        </el-form-item>

        <el-form-item label="身份证号" required>
          <el-input
            v-model="createForm.id_card"
            placeholder="请输入18位身份证号"
            maxlength="18"
            @input="onCreateIdCardInput"
          />
        </el-form-item>

        <el-form-item label="年龄" required>
          <el-input v-model="createForm.age" disabled />
        </el-form-item>

        <el-form-item label="性别" required>
          <el-radio-group v-model="createForm.gender" disabled>
            <el-radio label="male">男</el-radio>
            <el-radio label="female">女</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="体重(kg)" required>
          <el-input-number
            v-model="createForm.weight"
            :min="20"
            :max="150"
            :precision="1"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="联系方式">
          <el-input v-model="createForm.contact" placeholder="请输入联系方式（可选）" />
        </el-form-item>

        <el-form-item label="所属单位">
          <el-input v-model="createForm.organization" placeholder="请输入所属单位（可选）" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="createSubmitting" @click="submitCreateRegistration">
          提交报名
        </el-button>
      </template>
    </el-dialog>

    <!-- 分组统计弹窗 -->
    <el-dialog v-model="statsDialogVisible" title="分组报名统计" width="520px">
      <el-table :data="groupStats" stripe size="small" max-height="400">
        <el-table-column label="序号" type="index" width="60" />
        <el-table-column prop="sub_group_name" label="分组名称" min-width="200" />
        <el-table-column label="报名人数" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.count >= 2 ? 'success' : 'danger'">
              {{ row.count }}人
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.count >= 2" type="success">可参赛</el-tag>
            <el-tag v-else type="danger">人数不足</el-tag>
          </template>
        </el-table-column>
      </el-table>

      <template #footer>
        <el-button @click="statsDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowLeft, Trophy, Download, DataBoard } from '@element-plus/icons-vue';
import { callFunction } from '../utils/cloudbase';
import * as XLSX from 'xlsx';

const route = useRoute();
const router = useRouter();

const registrationTableRef = ref(null);  // 表格引用
const competition = ref(null);
const registrations = ref([]);
const loading = ref(false);
const selectedRegistrationIds = ref([]);
const createDialogVisible = ref(false);
const createSubmitting = ref(false);
const availableSubGroups = ref([]);
const statsDialogVisible = ref(false);
const createForm = reactive({
  student_name: '',
  id_card: '',
  age: '',
  gender: 'male',
  weight: null,
  contact: '',
  organization: ''
});

const competitionId = route.params.id;

const resetCreateForm = () => {
  createForm.student_name = '';
  createForm.id_card = '';
  createForm.age = '';
  createForm.gender = 'male';
  createForm.weight = null;
  createForm.contact = '';
  createForm.organization = '';
};

const openCreateDialog = () => {
  if (competition.value?.registration_status !== 'open') {
    ElMessage.warning('当前比赛报名已截止');
    return;
  }
  resetCreateForm();
  createDialogVisible.value = true;
};

const validateIdCard = (idCard) => {
  const reg = /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[0-9Xx]$/;
  if (!reg.test(idCard)) {
    return { valid: false };
  }

  const year = Number(idCard.substring(6, 10));
  const month = Number(idCard.substring(10, 12));
  const day = Number(idCard.substring(12, 14));
  const today = new Date();
  let age = today.getFullYear() - year;
  const monthDiff = today.getMonth() + 1 - month;
  const dayDiff = today.getDate() - day;

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }

  const genderCode = Number(idCard.charAt(16));
  const gender = genderCode % 2 === 1 ? 'male' : 'female';

  return { valid: true, age, gender };
};

const onCreateIdCardInput = (value) => {
  createForm.id_card = (value || '').toUpperCase();
  if (createForm.id_card.length === 18) {
    const validation = validateIdCard(createForm.id_card);
    if (!validation.valid) {
      ElMessage.warning('身份证号格式不正确');
      createForm.age = '';
      createForm.gender = 'male';
      return;
    }
    createForm.age = validation.age;
    createForm.gender = validation.gender;
  } else {
    createForm.age = '';
    createForm.gender = 'male';
  }
};

const validateCreateForm = () => {
  const studentName = (createForm.student_name || '').trim();
  const idCard = (createForm.id_card || '').trim();
  const weight = Number(createForm.weight);
  const age = Number(createForm.age);

  if (!studentName) {
    ElMessage.warning('请输入姓名');
    return false;
  }
  if (!idCard || idCard.length !== 18) {
    ElMessage.warning('请输入18位身份证号');
    return false;
  }
  const validation = validateIdCard(idCard);
  if (!validation.valid) {
    ElMessage.warning('身份证号格式不正确');
    return false;
  }
  if (!age || age < 5 || age > 100) {
    ElMessage.warning('年龄范围异常，请检查身份证号');
    return false;
  }
  if (!createForm.gender) {
    ElMessage.warning('性别信息异常，请检查身份证号');
    return false;
  }
  if (!weight || weight < 20 || weight > 150) {
    ElMessage.warning('请输入有效体重(20-150kg)');
    return false;
  }
  return true;
};

const submitCreateRegistration = async () => {
  if (!validateCreateForm()) {
    return;
  }

  createSubmitting.value = true;
  try {
    const eligibilityResult = await callFunction('competitionFunctions', {
      type: 'validateParticipantEligibility',
      competition_id: competitionId,
      age: parseInt(createForm.age, 10),
      gender: createForm.gender,
      weight: parseFloat(createForm.weight)
    });

    if (!eligibilityResult.success) {
      ElMessage.error(eligibilityResult.message || '资格校验失败');
      return;
    }

    if (!eligibilityResult.eligible) {
      ElMessage.error(eligibilityResult.error_reason || eligibilityResult.message || '不符合参赛条件');
      return;
    }

    const subGroupInfo = eligibilityResult.sub_group_info || {};
    const genderText = subGroupInfo.gender_group === 'male'
      ? '男子组'
      : subGroupInfo.gender_group === 'female'
        ? '女子组'
        : '不分男女';

    await ElMessageBox.confirm(
      `资格校验通过，将分配到"${subGroupInfo.sub_group_name || '-'}"。年龄组：${subGroupInfo.age_group_name || '-'}，性别组：${genderText}，体重级别：${subGroupInfo.weight_category_label || '-'}kg。确定提交报名吗？`,
      '确认报名',
      {
        confirmButtonText: '确认报名',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );

    const registerResult = await callFunction('competitionFunctions', {
      type: 'register',
      competition_id: competitionId,
      student_name: createForm.student_name.trim(),
      id_card: createForm.id_card.trim(),
      age: parseInt(createForm.age, 10),
      gender: createForm.gender,
      weight: parseFloat(createForm.weight),
      contact: (createForm.contact || '').trim(),
      organization: (createForm.organization || '').trim()
    });

    if (registerResult.success) {
      ElMessage.success('报名成功');
      createDialogVisible.value = false;
      resetCreateForm();
      await loadRegistrations();
      await loadCompetitionDetail();
      return;
    }

    ElMessage.error(registerResult.message || '报名失败');
  } catch (error) {
    if (error !== 'cancel') {
      console.error('管理员提交报名失败:', error);
      ElMessage.error('报名失败');
    }
  } finally {
    createSubmitting.value = false;
  }
};

// 已选中的参赛学生数量
const selectedCount = computed(() => {
  return registrations.value.filter(r => r.is_selected).length;
});

// 分组报名统计（按子组人数降序）
const groupStats = computed(() => {
  const counts = {};
  registrations.value.forEach(r => {
    const gid = r.sub_group_id || '__ungrouped__';
    const gname = r.sub_group_name || '未分组';
    if (!counts[gid]) {
      counts[gid] = { sub_group_id: gid, sub_group_name: gname, count: 0 };
    }
    counts[gid].count++;
  });
  return Object.values(counts).sort((a, b) => b.count - a.count);
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

// 加载可选分组列表
const loadSubGroups = async () => {
  try {
    const result = await callFunction('competitionFunctions', {
      type: 'getSubGroups',
      competition_id: competitionId,
      flat: true
    });
    if (result.success) {
      availableSubGroups.value = result.data || [];
    }
  } catch (error) {
    console.error('加载分组列表失败:', error);
  }
};

// 加载报名列表
const loadRegistrations = async () => {
  loading.value = true;
  try {
    const result = await callFunction('competitionFunctions', {
      type: 'getRegistrations',
      competition_id: competitionId
    });
    
    if (result.success) {
      const mapped = result.data.map(r => ({
        ...r,
        editing: false,
        new_sub_group_id: r.sub_group_id || '',
        _originalData: { ...r }
      }));

      // 按子组人数降序排列
      const groupCounts = {};
      mapped.forEach(r => {
        const gid = r.sub_group_id || '';
        groupCounts[gid] = (groupCounts[gid] || 0) + 1;
      });
      mapped.sort((a, b) => {
        const countA = groupCounts[a.sub_group_id || ''] || 0;
        const countB = groupCounts[b.sub_group_id || ''] || 0;
        if (countB !== countA) return countB - countA;
        // 同组内按报名时间升序
        return (a.registration_time || '').localeCompare(b.registration_time || '');
      });

      registrations.value = mapped;
    } else {
      ElMessage.error(result.message || '加载失败');
    }
  } catch (error) {
    console.error('加载报名列表失败:', error);
    ElMessage.error('加载失败');
  } finally {
    loading.value = false;
  }
};

// 表格选择变化
const handleSelectionChange = (selection) => {
  selectedRegistrationIds.value = selection.map(item => item._id);
};

// 检查是否可选择（已生成对战表后不可修改选择）
const checkSelectable = (row) => {
  return !competition.value?.bracket_generated;
};

// 全选
const selectAll = () => {
  if (!registrationTableRef.value) return;
  
  registrations.value.forEach((row) => {
    if (!competition.value?.bracket_generated) {
      registrationTableRef.value.toggleRowSelection(row, true);
    }
  });
};

// 取消全选
const selectNone = () => {
  if (!registrationTableRef.value) return;
  
  registrationTableRef.value.clearSelection();
};

// 反选
const invertSelection = () => {
  if (!registrationTableRef.value) return;
  
  const currentSelectedIds = new Set(selectedRegistrationIds.value);
  
  registrations.value.forEach((row) => {
    if (!competition.value?.bracket_generated) {
      const isCurrentlySelected = currentSelectedIds.has(row._id);
      registrationTableRef.value.toggleRowSelection(row, !isCurrentlySelected);
    }
  });
};

// 确认选择参赛学生
const confirmSelection = async () => {
  if (selectedRegistrationIds.value.length < 2) {
    ElMessage.warning('至少需要选择2名学生才能生成对战表');
    return;
  }
  
  if (selectedRegistrationIds.value.length > 64) {
    ElMessage.warning('参赛人数不能超过64人');
    return;
  }
  
  try {
    await ElMessageBox.confirm(
      `确定选择这${selectedRegistrationIds.value.length}名学生作为参赛者吗？`,
      '确认选择',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    
    loading.value = true;
    const result = await callFunction('competitionFunctions', {
      type: 'selectParticipants',
      competition_id: competitionId,
      registration_ids: selectedRegistrationIds.value
    });
    
    if (result.success) {
      ElMessage.success(`已选择${result.count}名参赛学生`);
      await loadRegistrations();
      await loadCompetitionDetail();
    } else {
      ElMessage.error(result.message || '选择失败');
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('确认选择失败:', error);
      ElMessage.error('操作失败');
    }
  } finally {
    loading.value = false;
  }
};

// 生成对战表（按分组生成）
const generateBracketWithSelected = async () => {
  const selectedStudents = registrations.value.filter(r => r.is_selected);

  if (selectedStudents.length < 2) {
    ElMessage.warning('请先选择至少2名参赛学生');
    return;
  }

  // 按子组分组统计
  const groupCounts = {};
  selectedStudents.forEach(s => {
    const gid = s.sub_group_id || '未分组';
    groupCounts[gid] = (groupCounts[gid] || 0) + 1;
  });
  const groupsWithEnough = Object.entries(groupCounts)
    .filter(([_, count]) => count >= 2).length;
  const groupsWithFew = Object.entries(groupCounts)
    .filter(([_, count]) => count < 2).length;

  if (groupsWithEnough === 0) {
    ElMessage.warning('没有足够的分组可以生成对战表（每组至少需要2人），请调整分组');
    return;
  }

  let message = `将为 ${groupsWithEnough} 个分组生成对战表`;
  if (groupsWithFew > 0) {
    message += `，${groupsWithFew} 个分组因人数不足跳过`;
  }
  message += '，确定继续吗？';

  try {
    await ElMessageBox.confirm(message, '确认生成对战表', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    });

    loading.value = true;
    const result = await callFunction('competitionFunctions', {
      type: 'generateAllBrackets',
      competition_id: competitionId
    });

    if (result.success) {
      const { success_count, error_count } = result.data;
      if (error_count > 0) {
        ElMessage.warning(
          `成功为 ${success_count} 个分组生成对战表，${error_count} 个分组失败`
        );
      } else {
        ElMessage.success(`成功为 ${success_count} 个分组生成对战表`);
      }
      await loadCompetitionDetail();
      router.push(`/dashboard/competition/${competitionId}/groups`);
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

// 编辑行
const editRow = (row) => {
  if (availableSubGroups.value.length === 0) {
    loadSubGroups();
  }
  row.new_sub_group_id = row.sub_group_id || '';
  row.editing = true;
};

// 保存行
const saveRow = async (row) => {
  const parsedWeight = parseFloat(row.weight);
  const normalizedStudentName = (row.student_name || '').trim();

  if (!normalizedStudentName) {
    ElMessage.warning('姓名不能为空');
    return;
  }

  if (Number.isNaN(parsedWeight)) {
    ElMessage.warning('请输入有效体重');
    return;
  }

  loading.value = true;
  try {
    const payload = {
      type: 'updateRegistration',
      registration_id: row._id,
      student_name: normalizedStudentName,
      id_card: row.id_card || '',
      age: Number(row.age) || 0,
      gender: row.gender || '',
      weight: parsedWeight,
      contact: (row.contact || '').trim(),
      organization: (row.organization || '').trim()
    };

    const result = await callFunction('competitionFunctions', {
      ...payload
    });

    if (!result.success) {
      ElMessage.error(result.message || '保存失败');
      return;
    }

    // 如果分组已变更，调用分组变更接口
    const oldGroupId = (row._originalData.sub_group_id || '');
    const newGroupId = (row.new_sub_group_id || '');

    if (newGroupId && newGroupId !== oldGroupId) {
      const groupResult = await callFunction('competitionFunctions', {
        type: 'changeRegistrationGroup',
        registration_id: row._id,
        competition_id: competitionId,
        new_sub_group_id: newGroupId
      });

      if (!groupResult.success) {
        ElMessage.error(groupResult.message || '分组变更失败');
        return;
      }
    }

    ElMessage.success('保存成功');
    row.student_name = normalizedStudentName;
    row.weight = parsedWeight;
    row.editing = false;
    row._originalData = { ...row };

    await loadRegistrations();
  } catch (error) {
    console.error('保存失败:', error);
    ElMessage.error('保存失败');
  } finally {
    loading.value = false;
  }
};

// 取消编辑
const cancelEdit = (row) => {
  Object.assign(row, row._originalData);
  row.new_sub_group_id = row.sub_group_id || '';
  row.editing = false;
};

// 移除报名学生
const removeRow = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定移除学生"${row.student_name}"的报名记录吗？此操作不可恢复。`,
      '确认移除',
      {
        confirmButtonText: '确定移除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );

    loading.value = true;
    const result = await callFunction('competitionFunctions', {
      type: 'removeRegistration',
      competition_id: competitionId,
      registration_id: row._id
    });

    if (result.success) {
      ElMessage.success('移除成功');
      await loadRegistrations();
      await loadCompetitionDetail();
    } else {
      ElMessage.error(result.message || '移除失败');
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('移除报名学生失败:', error);
      ElMessage.error('移除失败');
    }
  } finally {
    loading.value = false;
  }
};

// 导出报名表
const exportRegistrations = () => {
  if (registrations.value.length === 0) {
    ElMessage.warning('暂无报名数据');
    return;
  }
  
  const data = registrations.value.map((r, index) => ({
    '序号': index + 1,
    '姓名': r.student_name,
    '所属单位': r.organization || '',
    '身份证号': r.id_card || '',
    '年龄': r.age,
    '性别': r.gender === 'male' ? '男' : '女',
    '体重(kg)': r.weight,
    '子组': r.sub_group_name || '',
    '年龄组': r.age_group_name || '',
    '性别组': r.gender_group === 'male' ? '男子' : r.gender_group === 'female' ? '女子' : (r.gender_group || ''),
    '体重级别': r.weight_category_label ? r.weight_category_label + 'kg' : '',
    '报名时间': formatDateTime(r.registration_time),
    '状态': r.is_selected ? '已选中' : '待选择'
  }));
  
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '报名表');
  XLSX.writeFile(wb, `${competition.value?.name || '比赛'}_报名表.xlsx`);
  
  ElMessage.success('导出成功');
};

// 返回
const goBack = () => {
  router.push('/dashboard/competition');
};

// 格式化日期时间
const formatDateTime = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

// 初始化
onMounted(() => {
  loadCompetitionDetail();
  loadRegistrations();
  loadSubGroups();
});
</script>

<style scoped>
.registration-container {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.info-bar {
  margin-top: 12px;
  display: flex;
  align-items: center;
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.toolbar {
  margin-bottom: 20px;
  display: flex;
  gap: 12px;
}

.registration-table {
  margin-bottom: 20px;
}
</style>

