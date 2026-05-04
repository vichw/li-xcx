<template>
  <div class="feedback-container">
    <!-- 统计卡片 -->
    <el-row :gutter="20" class="statistics-row">
      <el-col :span="8">
        <el-card class="stat-card pending">
          <div class="stat-content">
            <div class="stat-icon">📋</div>
            <div class="stat-info">
              <div class="stat-value">{{ statistics.pending }}</div>
              <div class="stat-label">待处理</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card class="stat-card today">
          <div class="stat-content">
            <div class="stat-icon">📈</div>
            <div class="stat-info">
              <div class="stat-value">{{ statistics.todayNew }}</div>
              <div class="stat-label">今日新增</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card class="stat-card total">
          <div class="stat-content">
            <div class="stat-icon">📊</div>
            <div class="stat-info">
              <div class="stat-value">{{ statistics.total }}</div>
              <div class="stat-label">总计</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 筛选栏 -->
    <el-card class="filter-card">
      <el-form :model="filterForm" class="filter-form">
        <!-- 第一行：常用筛选项 -->
        <el-row :gutter="20">
          <el-col :span="5">
            <el-form-item label="类型">
              <el-select 
                v-model="filterForm.feedbackType" 
                placeholder="全部" 
                clearable 
                @change="loadFeedbackList"
                style="width: 100%"
              >
                <el-option label="投诉" value="complaint"></el-option>
                <el-option label="建议" value="suggestion"></el-option>
              </el-select>
            </el-form-item>
          </el-col>

          <el-col :span="5">
            <el-form-item label="状态">
              <el-select 
                v-model="filterForm.status" 
                placeholder="全部" 
                clearable 
                @change="loadFeedbackList"
                style="width: 100%"
              >
                <el-option label="待处理" value="pending"></el-option>
                <el-option label="处理中" value="processing"></el-option>
                <el-option label="已解决" value="resolved"></el-option>
                <el-option label="已关闭" value="closed"></el-option>
              </el-select>
            </el-form-item>
          </el-col>

          <el-col :span="8">
            <el-form-item label="搜索">
              <el-input
                v-model="filterForm.keyword"
                placeholder="标题或内容"
                clearable
                @clear="loadFeedbackList"
                @keyup.enter="loadFeedbackList"
              >
                <template #append>
                  <el-button :icon="Search" @click="loadFeedbackList"></el-button>
                </template>
              </el-input>
            </el-form-item>
          </el-col>

          <el-col :span="6" class="filter-actions">
            <el-button 
              type="primary" 
              :icon="Search" 
              @click="loadFeedbackList"
            >
              查询
            </el-button>
            <el-button @click="handleReset">重置</el-button>
            <el-link 
              type="primary" 
              :underline="false" 
              @click="expandFilter = !expandFilter"
              class="expand-link"
            >
              {{ expandFilter ? '收起' : '展开' }}
              <el-icon style="margin-left: 4px">
                <component :is="expandFilter ? 'ArrowUp' : 'ArrowDown'" />
              </el-icon>
            </el-link>
          </el-col>
        </el-row>

        <!-- 第二行：可展开的高级筛选项 -->
        <el-collapse-transition>
          <div v-show="expandFilter">
            <el-divider style="margin: 12px 0" />
            <el-row :gutter="20">
              <el-col :span="6">
                <el-form-item label="类别">
                  <el-select 
                    v-model="filterForm.category" 
                    placeholder="全部" 
                    clearable 
                    @change="loadFeedbackList"
                    style="width: 100%"
                  >
                    <el-option 
                      v-for="cat in categories" 
                      :key="cat.value" 
                      :label="cat.name" 
                      :value="cat.value"
                    ></el-option>
                  </el-select>
                </el-form-item>
              </el-col>

              <el-col :span="12">
                <el-form-item label="日期范围">
                  <el-date-picker
                    v-model="filterForm.dateRange"
                    type="daterange"
                    range-separator="至"
                    start-placeholder="开始日期"
                    end-placeholder="结束日期"
                    @change="loadFeedbackList"
                    style="width: 100%"
                  />
                </el-form-item>
              </el-col>
            </el-row>
          </div>
        </el-collapse-transition>
      </el-form>
    </el-card>

    <!-- 反馈列表 -->
    <el-card class="table-card">
      <el-table
        :data="feedbackList"
        v-loading="loading"
        stripe
        style="width: 100%"
      >
        <el-table-column prop="type" label="类型" width="80">
          <template #default="{ row }">
            <el-tag :type="row.type === 'complaint' ? 'danger' : 'primary'" size="small">
              {{ row.type === 'complaint' ? '投诉' : '建议' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="category_name" label="类别" width="120"></el-table-column>

        <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip></el-table-column>

        <el-table-column prop="user_name" label="提交人" width="100"></el-table-column>

        <el-table-column prop="user_phone" label="联系方式" width="120">
          <template #default="{ row }">
            {{ maskPhone(row.user_phone) }}
          </template>
        </el-table-column>

        <el-table-column label="图片" width="80" align="center">
          <template #default="{ row }">
            <span v-if="row.images && row.images.length > 0">
              📷 {{ row.images.length }}
            </span>
            <span v-else style="color: #ccc">-</span>
          </template>
        </el-table-column>

        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="create_time" label="提交时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.create_time) }}
          </template>
        </el-table-column>

        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleFeedback(row)">
              处理
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="loadFeedbackList"
        @current-change="loadFeedbackList"
        style="margin-top: 20px; text-align: right"
      />
    </el-card>

    <!-- 处理对话框 -->
    <el-dialog
      v-model="handleDialogVisible"
      title="处理投诉建议"
      width="70%"
      :close-on-click-modal="false"
    >
      <div class="handle-dialog-content" v-if="currentFeedback">
        <el-row :gutter="20">
          <!-- 左侧：反馈详情 -->
          <el-col :span="12">
            <div class="feedback-detail">
              <h3>
                <el-tag :type="currentFeedback.type === 'complaint' ? 'danger' : 'primary'" size="small">
                  {{ currentFeedback.type === 'complaint' ? '投诉' : '建议' }}
                </el-tag>
                <el-tag type="info" size="small" style="margin-left: 8px">
                  {{ currentFeedback.category_name }}
                </el-tag>
              </h3>
              
              <h2>{{ currentFeedback.title }}</h2>

              <div class="detail-section">
                <h4>详细描述</h4>
                <p class="content-text">{{ currentFeedback.content }}</p>
              </div>

              <div class="detail-section" v-if="currentFeedback.images && currentFeedback.images.length > 0">
                <h4>相关图片（{{ currentFeedback.images.length }}张）</h4>
                <div class="image-grid">
                  <el-image
                    v-for="(img, index) in currentFeedback.images"
                    :key="index"
                    :src="img"
                    :preview-src-list="currentFeedback.images"
                    :initial-index="index"
                    fit="cover"
                    class="preview-image"
                  />
                </div>
              </div>

              <div class="detail-section">
                <h4>提交信息</h4>
                <div class="info-item">
                  <span class="label">提交人：</span>
                  <span>{{ currentFeedback.user_name }}</span>
                </div>
                <div class="info-item">
                  <span class="label">联系方式：</span>
                  <span>{{ currentFeedback.user_phone }}</span>
                </div>
                <div class="info-item">
                  <span class="label">提交时间：</span>
                  <span>{{ formatTime(currentFeedback.create_time) }}</span>
                </div>
              </div>
            </div>
          </el-col>

          <!-- 右侧：处理表单 -->
          <el-col :span="12">
            <div class="handle-form">
              <el-form :model="handleForm" label-width="100px">
                <el-form-item label="状态">
                  <el-select v-model="handleForm.status" style="width: 100%">
                    <el-option label="待处理" value="pending"></el-option>
                    <el-option label="处理中" value="processing"></el-option>
                    <el-option label="已解决" value="resolved"></el-option>
                    <el-option label="已关闭" value="closed"></el-option>
                  </el-select>
                </el-form-item>

                <el-form-item label="回复内容" required>
                  <el-input
                    v-model="handleForm.admin_reply"
                    type="textarea"
                    :rows="10"
                    placeholder="请输入回复内容"
                    maxlength="500"
                    show-word-limit
                  />
                </el-form-item>

                <el-form-item label="处理人">
                  <el-input v-model="handleForm.admin_name" placeholder="请输入处理人姓名" />
                </el-form-item>
              </el-form>

              <!-- 已有回复 -->
              <div class="existing-reply" v-if="currentFeedback.admin_reply">
                <h4>历史回复</h4>
                <div class="reply-box">
                  <p>{{ currentFeedback.admin_reply }}</p>
                  <div class="reply-info">
                    <span>{{ currentFeedback.admin_name }}</span>
                    <span>{{ formatTime(currentFeedback.reply_time) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </el-col>
        </el-row>
      </div>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="handleDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitHandle" :loading="submitting">
            保存
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Search, ArrowUp, ArrowDown } from '@element-plus/icons-vue';
import { callFunction, getConfigs, generateSignedUrl } from '@/utils/cloudbase';

// 统计数据
const statistics = reactive({
  pending: 0,
  todayNew: 0,
  total: 0
});

// 类别列表
const categories = ref([]);

// 筛选表单展开状态
const expandFilter = ref(false);

// 筛选表单
const filterForm = reactive({
  feedbackType: '',
  category: '',
  status: '',
  dateRange: [],
  keyword: ''
});

// 反馈列表
const feedbackList = ref([]);
const loading = ref(false);

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
});

// 处理对话框
const handleDialogVisible = ref(false);
const currentFeedback = ref(null);
const handleForm = reactive({
  status: '',
  admin_reply: '',
  admin_name: ''
});
const submitting = ref(false);

// 初始化
onMounted(() => {
  loadCategories();
  loadFeedbackList();
});

/**
 * 加载类别列表
 */
async function loadCategories() {
  try {
    // 直接获取 complain 类型的配置
    const configs = await getConfigs('complain');
    categories.value = configs;
    console.log('投诉类别加载成功:', categories.value);
  } catch (error) {
    console.error('加载类别失败:', error);
    ElMessage.error('加载投诉类别失败');
  }
}

/**
 * 重置筛选条件
 */
function handleReset() {
  filterForm.feedbackType = '';
  filterForm.category = '';
  filterForm.status = '';
  filterForm.dateRange = [];
  filterForm.keyword = '';
  pagination.page = 1;
  loadFeedbackList();
}

/**
 * 加载反馈列表
 */
async function loadFeedbackList() {
  loading.value = true;
  
  try {
    const params = {
      type: 'getAllFeedbacks',
      limit: pagination.pageSize,
      skip: (pagination.page - 1) * pagination.pageSize
    };

    // 添加筛选条件
    if (filterForm.feedbackType) {
      params.feedbackType = filterForm.feedbackType;
    }
    if (filterForm.category) {
      params.category = filterForm.category;
    }
    if (filterForm.status) {
      params.status = filterForm.status;
    }
    if (filterForm.dateRange && filterForm.dateRange.length === 2) {
      params.start_date = filterForm.dateRange[0].toISOString();
      params.end_date = filterForm.dateRange[1].toISOString();
    }
    if (filterForm.keyword) {
      params.keyword = filterForm.keyword.trim();
    }

    const result = await callFunction('feedbackFunctions', params);

    if (result.success) {
      feedbackList.value = result.data || [];
      pagination.total = result.total || 0;
      
      // 更新统计数据
      if (result.statistics) {
        statistics.pending = result.statistics.pending;
        statistics.todayNew = result.statistics.todayNew;
        statistics.total = result.statistics.total;
      }
    } else {
      throw new Error(result.message || '加载失败');
    }
  } catch (error) {
    console.error('加载反馈列表失败:', error);
    ElMessage.error('加载失败：' + error.message);
  } finally {
    loading.value = false;
  }
}

/**
 * 打开处理对话框
 */
async function handleFeedback(feedback) {
  console.log('handleFeedback 接收到的数据:', feedback);
  console.log('create_time:', feedback.create_time, typeof feedback.create_time);
  
  // 转换图片URLs为HTTP格式
  let processedFeedback = { ...feedback };
  if (feedback.images && feedback.images.length > 0) {
    console.log('开始转换图片URLs:', feedback.images);
    
    try {
      const imagePromises = feedback.images.map(async (img) => {
        if (img && img.startsWith('cloud://')) {
          const httpUrl = await generateSignedUrl(img);
          console.log('图片URL转换:', img, '->', httpUrl);
          return httpUrl;
        }
        return img;
      });
      
      processedFeedback.images = await Promise.all(imagePromises);
      console.log('图片URLs转换完成:', processedFeedback.images);
    } catch (error) {
      console.error('图片URL转换失败:', error);
      // 如果转换失败，仍然使用原始URLs
    }
  }
  
  currentFeedback.value = processedFeedback;
  handleForm.status = feedback.status;
  handleForm.admin_reply = feedback.admin_reply || '';
  handleForm.admin_name = feedback.admin_name || '管理员';
  handleDialogVisible.value = true;
  
  console.log('currentFeedback.value:', currentFeedback.value);
}

/**
 * 提交处理结果
 */
async function submitHandle() {
  // 验证
  if (!handleForm.status) {
    ElMessage.warning('请选择状态');
    return;
  }
  if (!handleForm.admin_reply || !handleForm.admin_reply.trim()) {
    ElMessage.warning('请输入回复内容');
    return;
  }
  if (!handleForm.admin_name || !handleForm.admin_name.trim()) {
    ElMessage.warning('请输入处理人姓名');
    return;
  }

  submitting.value = true;

  try {
    const result = await callFunction('feedbackFunctions', {
      type: 'handleFeedback',
      feedback_id: currentFeedback.value._id,
      status: handleForm.status,
      admin_reply: handleForm.admin_reply.trim(),
      admin_name: handleForm.admin_name.trim()
    });

    if (result.success) {
      ElMessage.success('处理成功');
      handleDialogVisible.value = false;
      loadFeedbackList();
    } else {
      throw new Error(result.message || '处理失败');
    }
  } catch (error) {
    console.error('处理失败:', error);
    ElMessage.error('处理失败：' + error.message);
  } finally {
    submitting.value = false;
  }
}

/**
 * 格式化时间
 */
function formatTime(date) {
  console.log('formatTime 输入:', date, typeof date);
  
  if (!date) {
    console.log('formatTime: 日期为空');
    return '';
  }
  
  // 处理云数据库的 serverDate 格式 { $date: 'xxx' }
  let dateValue = date;
  if (typeof date === 'object' && date.$date) {
    console.log('formatTime: 检测到 $date 格式');
    dateValue = date.$date;
  }
  
  console.log('formatTime 处理后的值:', dateValue);
  
  const d = new Date(dateValue);
  console.log('formatTime Date对象:', d, 'getTime:', d.getTime());
  
  // 检查日期是否有效
  if (isNaN(d.getTime())) {
    console.error('formatTime: 无效的日期格式:', date);
    return '';
  }
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hour = String(d.getHours()).padStart(2, '0');
  const minute = String(d.getMinutes()).padStart(2, '0');
  const result = `${year}-${month}-${day} ${hour}:${minute}`;
  
  console.log('formatTime 最终结果:', result);
  return result;
}

/**
 * 手机号脱敏
 */
function maskPhone(phone) {
  if (!phone) return '';
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
}

/**
 * 获取状态文本
 */
function getStatusText(status) {
  const map = {
    pending: '待处理',
    processing: '处理中',
    resolved: '已解决',
    closed: '已关闭'
  };
  return map[status] || status;
}

/**
 * 获取状态类型
 */
function getStatusType(status) {
  const map = {
    pending: 'info',
    processing: 'warning',
    resolved: 'success',
    closed: ''
  };
  return map[status] || 'info';
}
</script>

<style scoped>
.feedback-container {
  padding: 20px;
}

/* 统计卡片 */
.statistics-row {
  margin-bottom: 20px;
}

.stat-card {
  cursor: pointer;
  transition: transform 0.3s;
}

.stat-card:hover {
  transform: translateY(-5px);
}

.stat-card.pending {
  border-left: 4px solid #409eff;
}

.stat-card.today {
  border-left: 4px solid #67c23a;
}

.stat-card.total {
  border-left: 4px solid #909399;
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 20px;
}

.stat-icon {
  font-size: 48px;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
  color: #303133;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 5px;
}

/* 筛选卡片 */
.filter-card {
  margin-bottom: 20px;
}

.filter-form {
  padding: 10px 0;
}

.filter-form .el-form-item {
  margin-bottom: 18px;
}

.filter-form .el-form-item__label {
  font-weight: 500;
  color: #606266;
}

.filter-actions {
  display: flex;
  align-items: flex-end;
  justify-content: flex-start;
  padding-bottom: 18px;
  gap: 10px;
}

.filter-actions .el-button {
  flex-shrink: 0;
}

.filter-actions .expand-link {
  display: inline-flex;
  align-items: center;
  font-size: 14px;
  white-space: nowrap;
  flex-shrink: 0;
  margin-left: 5px;
}

/* 表格卡片 */
.table-card {
  min-height: 500px;
}

/* 处理对话框 */
.handle-dialog-content {
  max-height: 70vh;
  overflow-y: auto;
}

.feedback-detail h2 {
  font-size: 20px;
  margin: 15px 0;
  color: #303133;
}

.feedback-detail h3 {
  margin-bottom: 10px;
}

.detail-section {
  margin: 20px 0;
  padding: 15px;
  background: #f5f7fa;
  border-radius: 8px;
}

.detail-section h4 {
  font-size: 14px;
  color: #606266;
  margin-bottom: 10px;
}

.content-text {
  line-height: 1.8;
  color: #606266;
  white-space: pre-wrap;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.preview-image {
  width: 100%;
  height: 120px;
  border-radius: 8px;
  cursor: pointer;
}

.info-item {
  padding: 8px 0;
  border-bottom: 1px solid #ebeef5;
}

.info-item:last-child {
  border-bottom: none;
}

.info-item .label {
  color: #909399;
  margin-right: 10px;
}

.handle-form {
  background: #fff;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #ebeef5;
}

.existing-reply {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 2px solid #ebeef5;
}

.existing-reply h4 {
  font-size: 14px;
  color: #606266;
  margin-bottom: 10px;
}

.reply-box {
  background: #f0f9ff;
  padding: 15px;
  border-radius: 8px;
  border-left: 4px solid #409eff;
}

.reply-box p {
  line-height: 1.8;
  color: #606266;
  margin-bottom: 10px;
}

.reply-info {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #909399;
}
</style>

