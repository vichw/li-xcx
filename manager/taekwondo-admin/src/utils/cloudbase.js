import mockService from './mockService'

// 是否使用模拟数据（开发测试用）
const USE_MOCK = false  // 关闭模拟数据模式，使用实际的腾讯云服务

// 以下是原始的腾讯云开发代码，生产环境中使用
import cloudbase from '@cloudbase/js-sdk'

// 初始化云开发 SDK - 使用官方推荐的初始化方式
const app = cloudbase.init({
  //env: 'cloud1-6g5xcrtub6610fb6', // 苏教练
  env: 'cloud1-9gzafxc7e0a56cdb',  // 李教练
  region: 'ap-shanghai',           // 地域，默认是上海
  timeout: 15000,                   // 请求超时时间（毫秒）
  // debug仅在开发环境启用，生产环境请关闭
  debug: process.env.NODE_ENV === 'development'
})

// 获取auth服务 - 使用官方推荐的登录态持久化方案
const auth = app.auth({
  persistence: 'local'  // 本地存储，登录态不随浏览器关闭而清除
});


auth.signInAnonymously();



// 提前定义db，但不立即使用
let db = null

// 错误码和错误信息映射
const ERROR_MAP = {
  'ACCESS_TOKEN_DISABLED': '匿名登录未开启，请在腾讯云控制台启用匿名登录',
  'DATABASE_PERMISSION_DENIED': '数据库权限不足，请检查集合权限配置',
  'INVALID_ENV': '环境ID错误或不存在',
  'NETWORK_ERROR': '网络连接错误，请检查网络状态',
  'SYS_ERR': '系统内部错误，请稍后再试',
  'SIGN_PARAM_INVALID': '登录参数无效',
  'UNAUTHENTICATED': '未认证，请先登录'
}

/**
 * 初始化数据库
 * @returns {Object} 数据库实例
 */
const setupDatabase = () => {
  if (!db) {
    db = app.database();
    console.log('数据库实例已初始化');
  }
  return db;
}


/**
 * 尝试清除现有登录状态并重新登录
 * 解决"credentials not found"错误
 */
const clearAndReLogin = async () => {
  try {
    console.log('尝试清除登录状态并重新登录...');

    // 先尝试登出，清除可能存在问题的登录态
    await auth.signOut();

    // 等待一点时间以确保登出完成
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 执行匿名登录
    const loginResult = await auth.signInAnonymously();
    console.log('重新登录结果:', loginResult);

    // 获取并验证登录状态
    const loginState = await auth.getLoginState();
    if (loginState && loginState.isAnonymous) {
      console.log('重新登录成功，用户ID:', loginState.user.uid);
      return true;
    } else {
      console.warn('重新登录状态异常:', loginState);
      return false;
    }
  } catch (error) {
    console.error('重新登录失败:', error);
    return false;
  }
}

/**
 * 匿名登录 - 使用官方API文档推荐的方式
 * @returns {Promise<boolean>} 登录是否成功
 */
const anonymousLogin = async () => {
  try {
    console.log('尝试匿名登录...');

    // 根据最新的API文档更新匿名登录方法
    const loginResult = await auth.signInAnonymously();
    console.log('匿名登录结果:', loginResult);

    // 显式等待一小段时间，确保登录状态已更新
    await new Promise(resolve => setTimeout(resolve, 500));

    // 获取登录状态并检查
    const loginState = await auth.getLoginState();
    console.log('登录状态:', loginState);

    if (loginState && loginState.isAnonymous) {
      console.log('匿名登录成功，用户ID:', loginState.user.uid);
      return true;
    } else {
      console.warn('匿名登录状态异常，返回结果:', loginState);

      // 如果没有正确获取到登录状态，尝试清除并重新登录
      return await clearAndReLogin();
    }
  } catch (error) {
    console.error('匿名登录错误:', error);

    // 检查是否是凭据问题，如果是则尝试清除登录状态并重新登录
    if (error.message && (
        error.message.includes('credentials not found') ||
        error.code === 'UNAUTHENTICATED' ||
        error.code === 'unauthenticated'
    )) {
      console.log('检测到凭据问题，尝试清除登录状态并重新登录');
      return await clearAndReLogin();
    }

    handleAuthError(error);
    return false;
  }
}

/**
 * 使用新版API进行匿名登录 (仅作为参考，待SDK版本更新后使用)
 * @returns {Promise<boolean>} 登录是否成功
 */
const anonymousLoginWithNewAPI = async () => {
  try {
    console.log('尝试使用新版API进行匿名登录...');

    // 创建匿名登录提供者
    const anonymousProvider = new cloudbase.AnonymousAuthProvider();

    // 执行匿名登录
    const result = await anonymousProvider.signIn();

    // 检查登录结果
    if (result && result.credential && result.credential.refreshToken) {
      console.log('匿名登录成功，用户ID:', result.user.uid);
      return true;
    } else {
      console.warn('匿名登录状态异常，返回结果:', result);
      return false;
    }
  } catch (error) {
    handleAuthError(error);
    return false;
  }
}

/**
 * 处理认证相关错误
 * @param {Error} error 错误对象
 */
const handleAuthError = (error) => {
  console.error('认证错误:', error);

  const errorCode = error.code || '';
  let errorMessage = ERROR_MAP[errorCode] || error.message || '未知错误';

  // 特殊处理某些错误信息
  if (error.message && error.message.includes('credentials not found')) {
    errorMessage = '登录凭证未找到或已失效，请尝试重新登录';
  }

  console.error(`错误码: ${errorCode}, 错误信息: ${errorMessage}`);

  if (errorCode === 'ACCESS_TOKEN_DISABLED') {
    console.error('解决方法: 在腾讯云控制台 -> 云开发 -> 环境 -> 环境设置 -> 登录方式中开启匿名登录');
  } else if (errorCode === 'UNAUTHENTICATED' || errorCode === 'unauthenticated') {
    console.error('解决方法: 请确认匿名登录已在腾讯云控制台开启，并检查登录流程');
  }
}

/**
 * 处理数据库错误
 * @param {Error} error 错误对象
 */
const handleDatabaseError = (error) => {
  console.error('数据库错误:', error);

  const errorCode = error.code || '';
  const errorMessage = ERROR_MAP[errorCode] || error.message || '未知错误';

  console.error(`错误码: ${errorCode}, 错误信息: ${errorMessage}`);

  if (errorCode === 'DATABASE_PERMISSION_DENIED') {
    console.error('解决方法: 检查以下几点');
    console.error('1. 确保云环境ID正确: cloud1-6g5xcrtub6610fb6');
    console.error('2. 设置数据库权限 -> 集合权限 -> 修改为:');
    console.error('   {"read": true, "write": "auth != null"}');
    console.error('3. 确保集合已创建');
    console.error('4. 确保网站域名已添加到安全域名列表');
  }
}

/**
 * 检查控制台是否已启用匿名登录
 */
const checkAnonymousLoginEnabled = async () => {
  try {
    // 尝试匿名登录，如果成功则表示已启用
    const result = await auth.signInAnonymously();
    return true;
  } catch (error) {
    if (error.code === 'ACCESS_TOKEN_DISABLED') {
      console.error('匿名登录未启用，请在腾讯云控制台开启匿名登录功能');
      return false;
    }
    // 其他错误可能不是由于未启用导致
    return true;
  }
}

/**
 * 执行登录并初始化数据库
 * @returns {Promise<boolean>} 初始化是否成功
 */
const initializeAuth = async () => {
  if (USE_MOCK) {
    console.log('使用模拟数据模式，跳过云开发登录');
    return true;
  }

  let retryCount = 0;
  const maxRetries = 3;

  while (retryCount < maxRetries) {
    try {
      console.log(`初始化云开发...(尝试 ${retryCount + 1}/${maxRetries})`);



      // 检查是否已经登录
      let loginState = await auth.getLoginState();
      console.log('当前登录状态:', loginState);

      if (loginState) {
        const loginType = loginState.isAnonymous ? '匿名登录' : '其他方式登录';
        console.log(`已有登录状态(${loginType})，用户ID:`, loginState.user.uid);

        // 监听登录状态过期事件
        auth.onLoginStateExpired(() => {
          console.log('登录状态已过期，准备重新登录...');
          anonymousLogin();
        });

      } else {
        console.log('未检测到登录状态，执行匿名登录...');

        // 检查匿名登录是否已启用
        const anonymousEnabled = await checkAnonymousLoginEnabled();
        if (!anonymousEnabled) {
          console.error('匿名登录功能未启用，请在腾讯云控制台开启');
          return false;
        }

        // 执行匿名登录
        const loginSuccess = await anonymousLogin();
        if (!loginSuccess) {
          throw new Error('匿名登录失败');
        }

        // 再次获取登录状态进行二次确认
        loginState = await auth.getLoginState();
        if (!loginState) {
          throw new Error('登录成功但无法获取登录状态');
        }
      }

      // 初始化数据库实例
      setupDatabase();

      // 测试数据库访问权限
      try {
        console.log('验证数据库访问权限...');
        const testResult = await db.collection('students').limit(1).get();
        console.log('数据库访问正常:', testResult);
        return true;
      } catch (dbError) {
        // 如果是权限问题，可能需要重新登录
        if (dbError.code === 'DATABASE_PERMISSION_DENIED' && retryCount < maxRetries - 1) {
          console.log('数据库权限被拒绝，尝试重新登录...');
          await clearAndReLogin();
          retryCount++;
          continue;
        }

        handleDatabaseError(dbError);
        return false;
      }

    } catch (error) {
      console.error(`初始化过程发生错误 (尝试 ${retryCount + 1}/${maxRetries}):`, error);

      // 如果是身份验证错误并且还有重试机会，则尝试重新登录
      if ((error.code === 'UNAUTHENTICATED' ||
           error.code === 'unauthenticated' ||
           error.message.includes('credentials not found')) &&
          retryCount < maxRetries - 1) {
        console.log('认证错误，尝试重新登录...');
        await clearAndReLogin();
        retryCount++;
        continue;
      }

      // 最后一次尝试也失败
      if (retryCount === maxRetries - 1) {
        console.error('多次尝试登录失败，请检查腾讯云控制台配置');
        return false;
      }

      retryCount++;
    }
  }

  return false;
}



/**
 * 确保数据库已初始化
 * @returns {Promise<Object|null>} 数据库对象或null
 */
const ensureDatabase = async () => {
  if (USE_MOCK) return null;

  if (!db) {
    setupDatabase();
  }

  // 检查登录状态，如果未登录则尝试重新登录
  const loginState = await auth.getLoginState();
  if (!loginState) {
    console.log('操作数据库前发现未登录，尝试重新登录...');
    const loginSuccess = await anonymousLogin();
    if (!loginSuccess) {
      console.error('重新登录失败，无法操作数据库');
      return null;
    }
  }

  return db;
}

// 登录方法
export const adminLogin = async (username, password) => {
  if (USE_MOCK) {
    return mockService.adminLogin(username, password)
  }

  const database = await ensureDatabase();
  if (!database) {
    return {
      success: false,
      message: '无法连接到云数据库，请检查网络或配置'
    };
  }

  try {
    // 查询管理员表
    const { data } = await database.collection('admin')
      .where({
        username,
        password // 实际项目中应该存储加密后的密码，这里简化处理
      })
      .get()

    if (data.length > 0) {
      return {
        success: true,
        data: data[0]
      }
    }
    return {
      success: false,
      message: '用户名或密码错误'
    }
  } catch (error) {
    handleDatabaseError(error);
    return {
      success: false,
      message: '登录失败，请稍后再试'
    }
  }
}

// 获取学生列表
export const getStudents = async () => {



  if (USE_MOCK) {
    return mockService.getStudents()
  }

  const database = await ensureDatabase();
  if (!database) {
    return [];
  }

  try {
    console.log('获取学生列表...');
    const { data } = await database.collection('students').get();
    console.log(`成功获取 ${data.length} 名学生`);
    return data;
  } catch (error) {
    handleDatabaseError(error);
    return [];
  }
}

// 添加学生
export const addStudent = async (student) => {
  if (USE_MOCK) {
    return mockService.addStudent(student)
  }

  const database = await ensureDatabase();
  if (!database) {
    return {
      success: false,
      message: '无法连接到数据库'
    };
  }

  try {
    console.log('添加学生:', student.name);
    const result = await database.collection('students').add({
      ...student,
      createTime: database.serverDate(),
      updateTime: database.serverDate()
    });

    return {
      success: true,
      id: result.id
    };
  } catch (error) {
    handleDatabaseError(error);
    return {
      success: false,
      message: `添加学生失败: ${error.message || '未知错误'}`
    };
  }
}


export const updateStudent = async (id, student) => {
  debugger
  console.log('===========>更新学生:', id, student);

  // 参数验证
  if (!id || typeof id !== 'string') {
    return {
      success: false,
      message: '无效的ID'
    };
  }

  if (USE_MOCK) {
    return mockService.updateStudent(id, student);
  }

  const database = await ensureDatabase();
  if (!database) {
    return {
      success: false,
      message: '无法连接到数据库'
    };
  }

  try {
    const doc = database.collection('students').doc(id);

    // 可选：检查文档是否存在
    const res = await doc.get();
    if (!res.data) {
      return {
        success: false,
        message: '学生记录不存在'
      };
    }

    // 过滤掉 undefined 字段、createTime 字段和 _id 字段
    const updateData = {};
    Object.keys(student).forEach(key => {
      if (student[key] !== undefined && key !== 'createTime' && key !== '_id') {
        updateData[key] = student[key];
      }
    });
    updateData.updateTime = database.serverDate();
    
    console.log('准备更新的数据:', updateData);
    console.log('原始学生数据:', res.data);

    const result = await doc.update(updateData);
    console.log('update result:', result);

    if (result.updated === 1) {
      return {
        success: true,
        message: '更新成功'
      };
    } else {
      // 检查是否有字段值相同导致更新失败
      console.warn('更新失败，可能原因：');
      console.warn('1. 所有字段值都相同，没有实际变化');
      console.warn('2. 数据库权限问题');
      console.warn('3. 字段类型不匹配');
      
      // 强制更新，即使值相同也更新
      try {
        const forceUpdateData = { ...updateData };
        forceUpdateData.updateTime = database.serverDate();
        const forceResult = await doc.update(forceUpdateData);
        console.log('强制更新结果:', forceResult);
        
        if (forceResult.updated === 1) {
          return {
            success: true,
            message: '更新成功（强制更新）'
          };
        }
      } catch (forceError) {
        console.error('强制更新也失败:', forceError);
      }
      
      return {
        success: false,
        message: '未能更新学生信息，请检查数据是否有变化'
      };
    }
  } catch (error) {
    console.error('更新学生失败:', error);
    return {
      success: false,
      message: `更新学生信息失败: ${error.message}`,
      errorCode: error.code
    };
  }
};


// 删除学生
export const deleteStudent = async (id) => {
  if (USE_MOCK) {
    return mockService.deleteStudent(id)
  }

  const database = await ensureDatabase();
  if (!database) {
    return {
      success: false,
      message: '无法连接到数据库'
    };
  }

  try {
    // 1. 删除学生的考级报名数据
    await database.collection('gradeExams')
      .where({
        student_id: id
      })
      .remove();

    // 2. 删除学生数据
    await database.collection('students')
      .doc(id)
      .remove();
      
    return {
      success: true
    }
  } catch (error) {
    handleDatabaseError(error);
    return {
      success: false,
      message: '删除学生及相关数据失败'
    }
  }
}

// 获取荣誉列表
export const getHonors = async () => {
  if (USE_MOCK) {
    return mockService.getHonors()
  }

  const database = await ensureDatabase();
  if (!database) {
    return [];
  }

  try {
    const { data } = await database.collection('honors').get();
    return data;
  } catch (error) {
    handleDatabaseError(error);
    return [];
  }
}

// 添加荣誉
export const addHonor = async (honor) => {
  if (USE_MOCK) {
    return mockService.addHonor(honor)
  }

  const database = await ensureDatabase();
  if (!database) {
    return {
      success: false,
      message: '无法连接到数据库'
    };
  }

  try {
    const result = await database.collection('honors').add({
      ...honor,
      createTime: database.serverDate(),
      updateTime: database.serverDate()
    });

    return {
      success: true,
      id: result.id
    }
  } catch (error) {
    handleDatabaseError(error);
    return {
      success: false,
      message: '添加荣誉记录失败'
    }
  }
}

// 更新荣誉
export const updateHonor = async (id, honor) => {
  if (USE_MOCK) {
    return mockService.updateHonor(id, honor)
  }

  const database = await ensureDatabase();
  if (!database) {
    return {
      success: false,
      message: '无法连接到数据库'
    };
  }

  try {

    const doc = database.collection('honors').doc(id);
    // 可选：检查文档是否存在
    const res = await doc.get();
    if (!res.data) {
      return {
        success: false,
        message: '荣誉记录不存在'
      };
    }
    console.log('===========>更新荣誉:', res);

    // 更新荣誉信息
    await deleteHonor(id);
    await database.collection('honors').add({
      ...honor,
      createTime: res.data.createTime,
      updateTime: database.serverDate()
    });
    console.log('===========>更新荣誉成功:', honor.name);
    return {
      success: true
    }
  } catch (error) {
    handleDatabaseError(error);
    return {
      success: false,
      message: '更新荣誉记录失败'
    }
  }
}

// 删除荣誉
export const deleteHonor = async (id) => {
  if (USE_MOCK) {
    return mockService.deleteHonor(id)
  }

  const database = await ensureDatabase();
  if (!database) {
    return {
      success: false,
      message: '无法连接到数据库'
    };
  }

  try {
    await database.collection('honors').doc(id).remove();
    return {
      success: true
    }
  } catch (error) {
    handleDatabaseError(error);
    return {
      success: false,
      message: '删除荣誉记录失败'
    }
  }
}

// 获取注册列表
export const getRegistrations = async () => {
  if (USE_MOCK) {
    return mockService.getRegistrations()
  }

  const database = await ensureDatabase();
  if (!database) {
    return [];
  }

  try {
    const { data } = await database.collection('registrations').get();
    return data;
  } catch (error) {
    handleDatabaseError(error);
    return [];
  }
}

// 处理注册申请
export const handleRegistration = async (id, status) => {
  if (USE_MOCK) {
    return mockService.handleRegistration(id, status)
  }

  const database = await ensureDatabase();
  if (!database) {
    return {
      success: false,
      message: '无法连接到数据库'
    };
  }

  try {
    await database.collection('registrations').doc(id).update({
      status,
      updateTime: database.serverDate()
    });

    return {
      success: true
    }
  } catch (error) {
    handleDatabaseError(error);
    return {
      success: false,
      message: '处理报名申请失败'
    }
  }
}


// 获取跆拳道级别列表
export const getConfig = async (type = 'belt_level') => {
  const database = await ensureDatabase();
  if (!database) {
    return [];
  }
  try {
    let query = database.collection('configs');
    if (Array.isArray(type)) {
      query = query.where({ type: database.command.in(type) });
    } else if (typeof type === 'string') {
      query = query.where({ type });
    }
    const { data } = await query.get();
    return data;
  } catch (error) {
    handleDatabaseError(error);
    return [];
  }
}


/**
 * 生成带签名的临时URL
 * @param {string} cloudPath 云存储路径（cloud://开头）
 * @returns {Promise<string>} 带签名的HTTPS链接
 */
export const generateSignedUrl = async (cloudPath) => {
  if (!cloudPath) return '';
  if (cloudPath.startsWith('http')) return cloudPath;
  if (!cloudPath.startsWith('cloud://')) return cloudPath;

  try {
    console.log('开始转换云存储URL:', cloudPath);
    
    // 获取临时链接
    const { fileList } = await app.getTempFileURL({
      fileList: [cloudPath],
      maxAge: 30 * 60, // half hour
    });
    
    console.log('getTempFileURL返回结果:', fileList);
    
    if (fileList && fileList.length > 0 && fileList[0].tempFileURL) {
      console.log('转换成功:', fileList[0].tempFileURL);
      return fileList[0].tempFileURL;
    } else {
      console.error('getTempFileURL返回结果异常:', fileList);
      return cloudPath; // 返回原始路径
    }
  } catch (error) {
    console.error('generateSignedUrl调用失败:', error);
    console.error('错误详情:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    return cloudPath; // 出错时返回原始路径
  }
}

export const uploadFile = async (param) => {
  debugger 
  const file = param.file;
  console.log('file:', file);
  const suffix = file.name.substring(file.name.lastIndexOf('.') + 1);
  const cloudPath = `avatars/${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${suffix}`;

  try {
    const res = await app.uploadFile({
      cloudPath,
      filePath: file            
    });

    console.log('上传结果:', res);

    if (res.fileID) {
      param.onSuccess({
        success: true,
        url: res.fileID, //  返回 fileID
      });
    } else {
      param.onError({
        success: false,
        message: '上传失败',
      });
      ElMessage.error('上传失败');
    }
  } catch (error) {
    console.error('上传失败:', error);
    param.onError({
      success: false,
      message: '上传失败',
    });
    ElMessage.error('上传失败');
  }
};

/**
 * 按考级等级导出报名学员信息
 * @param {string} gradeLevel
 * @returns {Promise<Array>} [{name, idCard, avatar}]
 */
export const getGradeExamMembersByLevel = async (gradeLevel, deleteStatus = '') => {
  const database = await ensureDatabase();
  if (!database) return [];

  try {
    // 1. 查 gradeExams
    let query = database.collection('gradeExams');
    const whereCond = { 
      status: 1
    };
    if (gradeLevel) {
      whereCond.next_grade = gradeLevel;
    }
    // 根据deleteStatus筛选
    if (deleteStatus !== '') {
      whereCond.delete = Number(deleteStatus);
    }
    query = query.where(whereCond);
    const examsRes = await query.get();
    if (!examsRes.data || examsRes.data.length === 0) {
      return [];
    }
    // 2. 查 students
    const studentIds = examsRes.data.map(item => item.student_id);
    const studentsRes = await database.collection('students').where({
      _id: database.command.in(studentIds)
    }).get();
    // 3. 组装数据并处理头像
    const result = await Promise.all(examsRes.data.map(async exam => {
      const student = studentsRes.data.find(s => s._id === exam.student_id) || {};
      let avatar = student.avatar || '';
      if (avatar && avatar.startsWith('cloud://')) {
        avatar = await generateSignedUrl(avatar);
      }
      return {
        _id: exam._id,
        name: student.name || '',
        idCard: student.idCard || '',
        avatar,
        current_grade: exam.current_grade,
        current_index: exam.current_index,
        next_grade: exam.next_grade,
        next_index: exam.next_index,
        fee: exam.fee,
        status: exam.status,
        exam_subjects: exam.exam_subjects,
        create_time: exam.create_time,
        pay_time: exam.pay_time,
        score_behavior: exam.score_behavior,
        score_tech: exam.score_tech,
        score_physical: exam.score_physical,
        score_total: exam.score_total,
        weight_behavior: exam.weight_behavior,
        weight_tech: exam.weight_tech,
        weight_physical: exam.weight_physical
      };
    }));
    return result;
  } catch (error) {
    handleDatabaseError(error);
    return [];
  }
};

/**
 * 获取所有考级等级（belt_level）
 * @returns {Promise<Array>} [{name, index, value}]
 */
export const getBeltLevels = async () => {
  const database = await ensureDatabase();
  if (!database) return [];
  try {
    const { data } = await database.collection('configs')
      .where({ type: 'belt_level' })
      .get();
    // 按 index 排序
    return data.sort((a, b) => a.index - b.index);
  } catch (error) {
    handleDatabaseError(error);
    return [];
  }
};

/**
 * 调用云函数下载图片，返回base64
 * @param {string} url
 * @returns {Promise<string|null>} base64字符串或null
 */
export const downloadImage = async (url) => {
  try {
    const res = await app.callFunction({
      name: 'taekwondoFunctions',
      
      data: { 
        url,
        type: 'downloadImage'
       }
    })
    if (res.result && res.result.success) {
      return res.result.buffer
    }
    return null
  } catch (e) {
    return null
  }
}

/**
 * 更新考级成绩
 * @param {Object} row - gradeExams表的报名记录（需有唯一标识 _id 或其它）
 * @param {Object} score - {score_behavior, score_tech, score_physical, score_total}
 * @param {Object} weights - {behavior, tech, physical}
 * @returns {Promise<Object>} 更新结果
 */
export const updateGradeExamScore = async (row, score, weights) => {
  const database = await ensureDatabase();
  if (!database) return { success: false, message: '无法连接数据库' };
  if (!row || !row._id) return { success: false, message: '无效的报名记录' };
  try {
    await database.collection('gradeExams').doc(row._id).update({
      score_behavior: score.score_behavior,
      score_tech: score.score_tech,
      score_physical: score.score_physical,
      score_total: Number(score.score_total),
      weight_behavior: weights.behavior,
      weight_tech: weights.tech,
      weight_physical: weights.physical,
      delete: 1  // 新增：设置成绩后标记为生效
    });
    return { success: true };
  } catch (error) {
    handleDatabaseError(error);
    return { success: false, message: error.message };
  }
}

export const updateWeightConfig = async (weightObj) => {
  const database = await ensureDatabase()
  if (!database) return { success: false, message: '无法连接数据库' }
  try {
    await database.collection('configs').where({ type: 'weights_behavior' }).update({ value: Number(weightObj.behavior) })
    await database.collection('configs').where({ type: 'weights_tech' }).update({ value: Number(weightObj.tech) })
    await database.collection('configs').where({ type: 'weights_physical' }).update({ value: Number(weightObj.physical) })
    return { success: true }
  } catch (e) {
    handleDatabaseError(e)
    return { success: false, message: e.message }
  }
}

export const deleteGradeExam = async (id) => {
  const database = await ensureDatabase();
  if (!database) return;
  try {
    await database.collection('gradeExams').doc(id).remove();
    return true;
  } catch (e) {
    throw e;
  }
}

export default {
  app,
  auth,
  db,
  getLoginState: auth.getLoginState.bind(auth),
  signOut: auth.signOut.bind(auth),
  initializeAuth,
  downloadImage
}
