# 跆拳道管理系统

这是一个基于Vue 3、Tailwind CSS和Element Plus开发的跆拳道管理系统，用于管理跆拳道小程序的相关数据。

## 功能特点

- 学生管理：查看、添加、编辑和删除学生信息
- 荣誉管理：管理学生的比赛获奖记录
- 注册管理：处理小程序用户的注册申请
- 响应式设计：适配不同尺寸的屏幕
- 数据统计：直观展示关键数据指标

## 技术栈

- Vue 3：前端框架
- Vite：构建工具
- Tailwind CSS：样式框架
- Element Plus：UI组件库
- Pinia：状态管理
- Vue Router：路由管理
- 腾讯云开发：后端服务和数据库

## 安装与运行

### 安装依赖

```bash
npm install
```

### 开发环境运行

```bash
npm run dev
```

### 构建生产环境

```bash
npm run build
```

## 配置说明

在使用前，需要在`src/utils/cloudbase.js`文件中配置您的腾讯云环境ID：

```js
const app = cloudbase.init({
  env: 'your-env-id' // 替换为您的环境ID
})
```

## 数据库结构

系统使用腾讯云开发的对象数据库存储数据，包含以下几个集合：

- `students`：存储学生信息
- `honor`：存储荣誉记录
- `registrations`：存储注册申请
- `admin`：存储管理员账号

## 贡献

欢迎提交问题和功能请求！
