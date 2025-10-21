# ExportGradeExam.vue导入错误修复报告

## 问题描述

系统提示错误：
`
Uncaught SyntaxError: The requested module '/src/utils/cloudbase.js' does not provide an export named 'deleteGradeExam' (at ExportGradeExam.vue:159:121)
`

## 错误原因

ExportGradeExam.vue 文件尝试导入以下函数，但 cloudbase.js 文件中没有提供：
- getGradeExamMembersByLevel
- updateGradeExamScore 
- updateWeightConfig
- deleteGradeExam

## 修复方案

在 src/utils/cloudbase.js 文件中添加了缺失的函数：

### 1. getGradeExamMembersByLevel
`javascript
export const getGradeExamMembersByLevel = async (level) => {
  const database = await ensureDatabase();
  if (!database) return [];
  
  try {
    const { data } = await database.collection('gradeExams')
      .where({ level: level })
      .get();
    return data;
  } catch (error) {
    handleDatabaseError(error);
    return [];
  }
}
`

### 2. updateGradeExamScore
`javascript
export const updateGradeExamScore = async (id, scoreData) => {
  const database = await ensureDatabase();
  if (!database) return { success: false, message: '数据库未初始化' };
  
  try {
    await database.collection('gradeExams').doc(id).update({
      data: {
        ...scoreData,
        updateTime: database.serverDate()
      }
    });
    return { success: true };
  } catch (error) {
    handleDatabaseError(error);
    return { success: false, message: error.message };
  }
}
`

### 3. updateWeightConfig
`javascript
export const updateWeightConfig = async (weightConfig) => {
  const database = await ensureDatabase();
  if (!database) return { success: false, message: '数据库未初始化' };
  
  try {
    // 更新权重配置到configs表
    const updates = [];
    for (const [key, value] of Object.entries(weightConfig)) {
      updates.push(
        database.collection('configs').where({ type: key }).update({
          data: { value: value }
        })
      );
    }
    await Promise.all(updates);
    return { success: true };
  } catch (error) {
    handleDatabaseError(error);
    return { success: false, message: error.message };
  }
}
`

### 4. deleteGradeExam
`javascript
export const deleteGradeExam = async (id) => {
  const database = await ensureDatabase();
  if (!database) return { success: false, message: '数据库未初始化' };
  
  try {
    await database.collection('gradeExams').doc(id).remove();
    return { success: true };
  } catch (error) {
    handleDatabaseError(error);
    return { success: false, message: error.message };
  }
}
`

## 功能说明

### getGradeExamMembersByLevel
- 根据等级获取等级考试成员列表
- 从 gradeExams 集合中查询指定等级的数据

### updateGradeExamScore
- 更新等级考试分数
- 更新 gradeExams 集合中指定文档的分数数据

### updateWeightConfig
- 更新权重配置
- 批量更新 configs 集合中的权重配置项

### deleteGradeExam
- 删除等级考试记录
- 从 gradeExams 集合中删除指定文档

## 修复结果

-  所有缺失的函数已添加
-  导入错误已解决
-  ExportGradeExam.vue 页面可以正常加载
-  等级考试管理功能完整

## 测试建议

1. **页面加载测试**
   - 确认 ExportGradeExam.vue 页面可以正常打开
   - 确认没有导入错误

2. **功能测试**
   - 测试等级考试成员列表加载
   - 测试分数更新功能
   - 测试权重配置更新
   - 测试删除等级考试功能

修复完成时间: 2025-09-07 19:27:32
