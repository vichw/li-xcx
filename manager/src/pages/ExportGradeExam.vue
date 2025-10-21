<template>
  <div>
    <select v-model="selectedGrade">
      <option v-for="g in gradeList" :key="g" :value="g">{{g}}</option>
    </select>
    <button @click="fetchList">查询</button>
    <button @click="exportZip" :disabled="list.length === 0">一键导出</button>
    <table>
      <tr>
        <th>姓名</th>
        <th>身份证号</th>
        <th>头像</th>
      </tr>
      <tr v-for="stu in list" :key="stu.idCard">
        <td>{{stu.name}}</td>
        <td>{{stu.idCard}}</td>
        <td><img :src="stu.avatar" width="60" /></td>
      </tr>
    </table>
  </div>
</template>

<script>
import JSZip from 'jszip'
import { saveAs } from 'file-saver'

export default {
  data() {
    return {
      selectedGrade: '',
      gradeList: ['白带', '黄带', '蓝带', '红带', '黑带'], // 示例
      list: []
    }
  },
  methods: {
    async fetchList() {
      // 调用云函数获取数据
      const res = await wx.cloud.callFunction({
        name: 'exportGradeExamMembers',
        data: { grade: this.selectedGrade }
      })
      this.list = res.result.list || []
    },
    async exportZip() {
      const zip = new JSZip()
      let detailLines = []
      for (const stu of this.list) {
        // 下载图片为blob
        const response = await fetch(stu.avatar)
        const blob = await response.blob()
        const filename = `${stu.name}-${stu.idCard}.jpg`
        zip.file(filename, blob)
        detailLines.push(`${stu.name}-${stu.idCard}（身份证）`)
      }
      zip.file('明细.txt', detailLines.join('\n'))
      zip.generateAsync({ type: 'blob' }).then(content => {
        saveAs(content, `${this.selectedGrade}考级.zip`)
      })
    }
  }
}
</script> 