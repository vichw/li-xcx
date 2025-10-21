import studentsData from '../data/students.json'
import honorData from '../data/honor.json'
import registrationsData from '../data/registrations.json'
import adminData from '../data/admin.json'


// 深拷贝数据，防止引用修改
const students = JSON.parse(JSON.stringify(studentsData))
const honors = JSON.parse(JSON.stringify(honorData))
const registrations = JSON.parse(JSON.stringify(registrationsData))
const admins = JSON.parse(JSON.stringify(adminData))

// 生成随机ID
const generateId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

// 登录方法
export const adminLogin = async (username, password) => {
  // 模拟API延迟
  await new Promise(resolve => setTimeout(resolve, 500))
  
  const admin = admins.find(a => a.username === username && a.password === password)
  
  if (admin) {
    return {
      success: true,
      data: admin
    }
  }
  
  return {
    success: false,
    message: '用户名或密码错误'
  }
}

// 获取学生列表
export const getStudents = async () => {
  // 模拟API延迟
  await new Promise(resolve => setTimeout(resolve, 500))
  return students
}

// 添加学生
export const addStudent = async (student) => {
  // 模拟API延迟
  await new Promise(resolve => setTimeout(resolve, 500))
  
  const newStudent = {
    ...student,
    _id: generateId(),
    createTime: { $date: new Date().toISOString() },
    updateTime: { $date: new Date().toISOString() }
  }
  
  students.push(newStudent)
  
  return {
    success: true,
    id: newStudent._id
  }
}

// 更新学生
export const updateStudent = async (id, student) => {
  // 模拟API延迟
  await new Promise(resolve => setTimeout(resolve, 500))
  
  const index = students.findIndex(s => s._id === id)
  
  if (index !== -1) {
    students[index] = {
      ...students[index],
      ...student,
      updateTime: { $date: new Date().toISOString() }
    }
    
    return {
      success: true
    }
  }
  
  return {
    success: false,
    message: '学生不存在'
  }
}

// 删除学生
export const deleteStudent = async (id) => {
  // 模拟API延迟
  await new Promise(resolve => setTimeout(resolve, 500))
  
  const studentIndex = students.findIndex(s => s._id === id)
  
  if (studentIndex !== -1) {
    // 删除学生数据
    students.splice(studentIndex, 1)
    
    
    
    return {
      success: true
    }
  }
  
  return {
    success: false,
    message: '学生不存在'
  }
}

// 获取荣誉列表
export const getHonors = async () => {
  // 模拟API延迟
  await new Promise(resolve => setTimeout(resolve, 500))
  return honors
}

// 添加荣誉
export const addHonor = async (honor) => {
  // 模拟API延迟
  await new Promise(resolve => setTimeout(resolve, 500))
  
  const newHonor = {
    ...honor,
    _id: generateId(),
    createTime: { $date: new Date().toISOString() },
    updateTime: { $date: new Date().toISOString() }
  }
  
  honors.push(newHonor)
  
  return {
    success: true,
    id: newHonor._id
  }
}

// 更新荣誉
export const updateHonor = async (id, honor) => {
  // 模拟API延迟
  await new Promise(resolve => setTimeout(resolve, 500))
  
  const index = honors.findIndex(h => h._id === id)
  
  if (index !== -1) {
    honors[index] = {
      ...honors[index],
      ...honor,
      updateTime: { $date: new Date().toISOString() }
    }
    
    return {
      success: true
    }
  }
  
  return {
    success: false,
    message: '荣誉记录不存在'
  }
}

// 删除荣誉
export const deleteHonor = async (id) => {
  // 模拟API延迟
  await new Promise(resolve => setTimeout(resolve, 500))
  
  const index = honors.findIndex(h => h._id === id)
  
  if (index !== -1) {
    honors.splice(index, 1)
    
    return {
      success: true
    }
  }
  
  return {
    success: false,
    message: '荣誉记录不存在'
  }
}

// 获取注册列表
export const getRegistrations = async () => {
  // 模拟API延迟
  await new Promise(resolve => setTimeout(resolve, 500))
  return registrations
}

// 处理注册申请
export const handleRegistration = async (id, status) => {
  // 模拟API延迟
  await new Promise(resolve => setTimeout(resolve, 500))
  
  const index = registrations.findIndex(r => r._id === id)
  
  if (index !== -1) {
    registrations[index] = {
      ...registrations[index],
      status,
      updateTime: { $date: new Date().toISOString() }
    }
    
    return {
      success: true
    }
  }
  
  return {
    success: false,
    message: '注册申请不存在'
  }
}

export default {
  adminLogin,
  getStudents,
  addStudent,
  updateStudent,
  deleteStudent,
  getHonors,
  addHonor,
  updateHonor,
  deleteHonor,
  getRegistrations,
  handleRegistration
} 