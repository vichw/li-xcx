<template>
  <div class="image-preview">
    <img 
      v-if="isLoaded" 
      :src="src" 
      :alt="alt" 
      class="preview-image"
      @click="handlePreview"
      @error="handleError"
      :style="imageStyle"
    />
    <div v-else-if="isError" class="error-placeholder">
      <el-icon><PictureRounded /></el-icon>
      <span>{{ errorText }}</span>
    </div>
    <div v-else class="loading-placeholder">
      <el-icon><Loading /></el-icon>
      <span>加载中...</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { PictureRounded, Loading } from '@element-plus/icons-vue';
import { ElImageViewer } from 'element-plus';
import { createApp, h } from 'vue';

const props = defineProps({
  src: {
    type: String,
    required: true
  },
  alt: {
    type: String,
    default: '图片'
  },
  width: {
    type: [String, Number],
    default: '100%'
  },
  height: {
    type: [String, Number],
    default: 'auto'
  },
  fit: {
    type: String,
    default: 'cover'
  },
  errorText: {
    type: String,
    default: '图片加载失败'
  },
  previewSrcList: {
    type: Array,
    default: () => []
  },
  initialIndex: {
    type: Number,
    default: 0
  }
});

const isLoaded = ref(false);
const isError = ref(false);
const imageEl = ref(null);

const imageStyle = computed(() => {
  return {
    width: typeof props.width === 'number' ? `${props.width}px` : props.width,
    height: typeof props.height === 'number' ? `${props.height}px` : props.height,
    objectFit: props.fit
  };
});

const handleError = (e) => {
  console.error('Image failed to load:', props.src, e);
  isError.value = true;
  isLoaded.value = false;
};

const loadImage = () => {
  const img = new Image();
  img.onload = () => {
    isLoaded.value = true;
    isError.value = false;
  };
  img.onerror = handleError;
  img.src = props.src;
};

const handlePreview = () => {
  if (isLoaded.value && !isError.value) {
    // 如果有预览列表，使用预览列表，否则只预览当前图片
    const srcList = props.previewSrcList.length > 0 
      ? props.previewSrcList 
      : [props.src];
    
    // 创建一个预览组件的实例
    const instance = createApp({
      render() {
        return h(ElImageViewer, {
          urlList: srcList,
          initialIndex: props.initialIndex,
          onClose: () => {
            instance.unmount();
            document.body.removeChild(container);
          },
        });
      },
    });

    // 创建容器并挂载
    const container = document.createElement('div');
    document.body.appendChild(container);
    instance.mount(container);
  }
};

onMounted(() => {
  loadImage();
});
</script>

<style scoped>
.image-preview {
  position: relative;
  overflow: hidden;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.preview-image {
  cursor: pointer;
  transition: transform 0.3s;
}

.preview-image:hover {
  transform: scale(1.05);
}

.error-placeholder,
.loading-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: #909399;
  font-size: 14px;
}

.error-placeholder i,
.loading-placeholder i {
  font-size: 24px;
  margin-bottom: 8px;
}
</style> 