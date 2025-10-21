<template>
  <div>
    <h3>学生图片管理</h3>
    <input type="file" @change="handleFileUpload" />
    <ul>
      <li v-for="image in images" :key="image">
        <img :src="getImageUrl(image)" alt="学生图片" width="100" />
      </li>
    </ul>
  </div>
</template>

<script>
import { uploadImage, listImages } from '@/api/tencentCloud';

export default {
  data() {
    return {
      images: [],
      bucket: 'your-bucket-name', // 替换为你的存储桶名称
      region: 'your-region', // 替换为你的存储区域
      prefix: 'students/', // 图片存储的前缀路径
    };
  },
  methods: {
    async handleFileUpload(event) {
      const file = event.target.files[0];
      if (!file) return;

      const key = `${this.prefix}${file.name}`;
      try {
        await uploadImage(file, this.bucket, this.region, key);
        this.fetchImages();
      } catch (error) {
        console.error('上传失败:', error);
      }
    },
    async fetchImages() {
      try {
        const imageKeys = await listImages(this.bucket, this.region, this.prefix);
        this.images = imageKeys;
      } catch (error) {
        console.error('获取图片列表失败:', error);
      }
    },
    getImageUrl(key) {
      return `https://${this.bucket}.cos.${this.region}.myqcloud.com/${key}`;
    },
  },
  mounted() {
    this.fetchImages();
  },
};
</script>
