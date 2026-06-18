// 比赛管理云函数
const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { type } = event;
  
  try {
    switch (type) {
      // 获取比赛列表
      case 'getCompetitions':
        return await getCompetitions(event);
      
      // 获取比赛详情
      case 'getCompetitionDetail':
        return await getCompetitionDetail(event);
      
      // 获取比赛结果
      case 'getResults':
        return await getResults(event);
      
      // 创建比赛
      case 'createCompetition':
        return await createCompetition(event);
      
      // 更新比赛
      case 'updateCompetition':
        return await updateCompetition(event);
      
      // 删除比赛
      case 'deleteCompetition':
        return await deleteCompetition(event);
      
      // 生成对战表
      case 'generateBracket':
        return await generateBracket(event);
      
      // 更新对战结果
      case 'updateMatch':
        return await updateMatch(event);

      // 更新对战人员
      case 'updateMatchParticipants':
        return await updateMatchParticipants(event);

      // 保存比赛结果
      case 'saveResults':
        return await saveResults(event);
      
      // ==================== 新增：报名相关接口 ====================
      
      // 学生报名（支持两种type名称）
      case 'register':
      case 'registerCompetition':
        return await registerCompetition(event);
      
      // 检查报名状态
      case 'checkRegistration':
        return await checkRegistration(event);
      
      // 校验参赛资格
      case 'validateParticipantEligibility':
        return await validateParticipantEligibility(event);
      
      // 获取报名列表（管理端）
      case 'getRegistrations':
        return await getRegistrations(event);
      
      // 更新报名信息（管理端）
      case 'updateRegistration':
        return await updateRegistration(event);
      
      // 选择参赛学生（管理端）
      case 'selectParticipants':
        return await selectParticipants(event);

      // 移除报名学生（管理端）
      case 'removeRegistration':
        return await removeRegistration(event);

      // 变更学生分组（管理端）
      case 'changeRegistrationGroup':
        return await changeRegistrationGroup(event);

      // 获取展示名次配置
      case 'getDisplayRankCount':
        return await getDisplayRankCount(event);
      
      // ==================== 新增：分组规则配置接口 ====================
      
      // 获取分组规则列表
      case 'getGroupConfigs':
        return await getGroupConfigs(event);
      
      // 获取分组规则详情
      case 'getGroupConfigDetail':
        return await getGroupConfigDetail(event);
      
      // 创建分组规则
      case 'createGroupConfig':
        return await createGroupConfig(event);
      
      // 更新分组规则
      case 'updateGroupConfig':
        return await updateGroupConfig(event);
      
      // 获取比赛的所有子组
      case 'getSubGroups':
        return await getSubGroups(event);
      
      // 获取子组详情
      case 'getSubGroupDetail':
        return await getSubGroupDetail(event);
      
      // 为所有子组生成对战表
      case 'generateAllBrackets':
        return await generateAllBrackets(event);
      
      // 为单个子组生成对战表
      case 'generateSubGroupBracket':
        return await generateSubGroupBracket(event);

      // 清空子组对战表
      case 'clearSubGroupBracket':
        return await clearSubGroupBracket(event);

      // 一键清空比赛所有对战表
      case 'clearAllBrackets':
        return await clearAllBrackets(event);

      default:
        return {
          success: false,
          message: '未知的操作类型'
        };
    }
  } catch (error) {
    console.error('云函数执行错误:', error);
    return {
      success: false,
      message: error.message || '操作失败',
      error: error
    };
  }
};

/**
 * 获取比赛列表
 * @param {Object} event - { status, registration_status, limit, skip }
 */
async function getCompetitions(event) {
  const { status, registration_status, limit = 20, skip = 0 } = event;
  
  try {
    // 构建查询条件
    let whereCondition = {};
    if (status) {
      whereCondition.status = status;
    }
    if (registration_status) {
      whereCondition.registration_status = registration_status;
    }
    
    // 查询比赛列表
    const result = await db.collection('competitions')
      .where(whereCondition)
      .orderBy('create_time', 'desc')
      .skip(skip)
      .limit(limit)
      .get();
    
    // 统计总数
    const countResult = await db.collection('competitions')
      .where(whereCondition)
      .count();
    
    return {
      success: true,
      data: result.data,
      total: countResult.total
    };
  } catch (error) {
    console.error('获取比赛列表失败:', error);
    throw error;
  }
}

/**
 * 获取比赛详情（含对战表和结果，支持子组）
 * @param {Object} event - { competition_id, sub_group_id }
 */
async function getCompetitionDetail(event) {
  const { competition_id, sub_group_id } = event;
  
  if (!competition_id) {
    return {
      success: false,
      message: '缺少比赛ID'
    };
  }
  
  try {
    // 获取比赛信息
    const competition = await db.collection('competitions')
      .doc(competition_id)
      .get();
    
    if (!competition.data) {
      return {
        success: false,
        message: '比赛不存在'
      };
    }
    
    let subGroups = [];
    let brackets = [];
    let results = [];
    
    // 判断是否启用自动分组
    
      // 获取所有子组
      const subGroupsResult = await db.collection('competition_sub_groups')
        .where({ competition_id })
        .orderBy('age_group_code', 'asc')
        .get();
      
      subGroups = subGroupsResult.data || [];
      
      // 如果指定了子组，获取该子组的对战表和结果
      if (sub_group_id) {
        const bracketsResult = await db.collection('competition_brackets')
          .where({ competition_id, sub_group_id })
          .orderBy('round', 'asc')
          .orderBy('match_no', 'asc')
          .get();
        
        brackets = bracketsResult.data || [];
        
        const resultsResult = await db.collection('competition_results')
          .where({ competition_id, sub_group_id })
          .orderBy('rank', 'asc')
          .get();
        
        // 过滤掉无效数据
        results = (resultsResult.data || []).filter(result => 
          result.student_id && result.student_name && result.rank
        );
      }
    
    
    return {
      success: true,
      data: {
        competition: competition.data,
        sub_groups: subGroups,  // 子组列表（自动分组模式）
        brackets: brackets,     // 对战表（传统模式或指定子组）
        results: results        // 比赛结果（传统模式或指定子组）
      }
    };
  } catch (error) {
    console.error('获取比赛详情失败:', error);
    throw error;
  }
}

/**
 * 获取比赛结果（支持子组）
 * @param {Object} event - { competition_id, sub_group_id }
 */
async function getResults(event) {
  const { competition_id, sub_group_id } = event;
  
  if (!competition_id) {
    return {
      success: false,
      message: '缺少比赛ID'
    };
  }
  
  try {
    const where = { competition_id };
    if (sub_group_id) {
      where.sub_group_id = sub_group_id;
    }
    
    // 获取比赛结果
    const results = await db.collection('competition_results')
      .where(where)
      .orderBy('rank', 'asc')
      .get();
    
    // 过滤掉无效数据（没有学生ID或姓名的记录）
    const validResults = results.data.filter(result => 
      result.student_id && result.student_name && result.rank
    );
    
    // 如果没有指定子组，按子组分组返回
    if (!sub_group_id && validResults.length > 0) {
      const grouped = {};
      validResults.forEach(result => {
        const key = result.sub_group_id || 'default';
        if (!grouped[key]) {
          grouped[key] = {
            sub_group_id: result.sub_group_id || null,
            sub_group_name: result.sub_group_name || '全部',
            results: []
          };
        }
        grouped[key].results.push(result);
      });
      
      return {
        success: true,
        data: Object.values(grouped)
      };
    }
    
    return {
      success: true,
      data: validResults
    };
  } catch (error) {
    console.error('获取比赛结果失败:', error);
    throw error;
  }
}

/**
 * 创建比赛（支持自动分组）
 * @param {Object} event - { name, start_date, end_date, registration_status, enable_auto_grouping, group_config_id, age_min, age_max, weight_min, weight_max }
 */
async function createCompetition(event) {
  const { 
    name, 
    start_date, 
    end_date, 
    registration_status = 'open',
    group_config_id
  } = event;
  
  // 验证必填字段
  if (!name || !start_date || !end_date || !group_config_id) {
    return {
      success: false,
      message: '缺少必填字段'
    };
  }
  
  // 验证分组配置是否存在
  const groupConfig = await db.collection('competition_group_configs')
    .doc(group_config_id)
    .get();
  
  if (!groupConfig.data) {
    return {
      success: false,
      message: '分组规则不存在'
    };
  }
  
  // 验证日期
  const startDate = new Date(start_date);
  const endDate = new Date(end_date);
  
  if (startDate >= endDate) {
    return {
      success: false,
      message: '结束日期必须大于开始日期'
    };
  }
  
  try {
    // 默认状态为 ongoing（进行中）
    const status = 'ongoing';
    
    // 创建比赛数据
    const competitionData = {
      name,
      start_date: startDate,
      end_date: endDate,
      registration_status,
      status,
      registration_count: 0,
      participant_count: 0,
      bracket_generated: false,
      enable_auto_grouping: true,  // 现在所有比赛都是自动分组
      group_config_id,
      groups_generated: false,
      brackets_generated: false,
      create_time: db.serverDate(),
      update_time: db.serverDate()
    }
    
    // 创建比赛
    const result = await db.collection('competitions').add({
      data: competitionData
    });
    
    return {
      success: true,
      message: '创建成功',
      competition_id: result._id
    };
  } catch (error) {
    console.error('创建比赛失败:', error);
    throw error;
  }
}

/**
 * 更新比赛
 * @param {Object} event - { competition_id, ...updateData }
 */
async function updateCompetition(event) {
  const { competition_id, ...updateData } = event;
  
  if (!competition_id) {
    return {
      success: false,
      message: '缺少比赛ID'
    };
  }
  
  try {
    // 移除不允许直接更新的字段
    delete updateData.type;
    delete updateData._id;
    delete updateData.create_time;
    
    // 更新时间
    updateData.update_time = db.serverDate();
    
    // 格式化日期（如果有更新的话）
    if (updateData.start_date) {
      updateData.start_date = new Date(updateData.start_date);
    }
    if (updateData.end_date) {
      updateData.end_date = new Date(updateData.end_date);
    }
    
    // 注意：不自动修改 status，保持原有状态
    // 如果需要修改状态，应该由管理员在管理端手动操作
    
    await db.collection('competitions')
      .doc(competition_id)
      .update({
        data: updateData
      });
    
    return {
      success: true,
      message: '更新成功'
    };
  } catch (error) {
    console.error('更新比赛失败:', error);
    throw error;
  }
}

/**
 * 删除比赛（级联删除对战表和结果）
 * @param {Object} event - { competition_id }
 */
async function deleteCompetition(event) {
  const { competition_id } = event;
  
  if (!competition_id) {
    return {
      success: false,
      message: '缺少比赛ID'
    };
  }
  
  try {
    // 检查比赛状态
    const competition = await db.collection('competitions')
      .doc(competition_id)
      .get();
    
    if (!competition.data) {
      return {
        success: false,
        message: '比赛不存在'
      };
    }
    
    // 只能删除未开始的比赛
    // if (competition.data.status !== 'pending') {
    //   return {
    //     success: false,
    //     message: '只能删除未开始的比赛'
    //   };
    // }
    
    // 删除对战表
    await db.collection('competition_brackets')
      .where({ competition_id })
      .remove();
    
    // 删除比赛结果
    await db.collection('competition_results')
      .where({ competition_id })
      .remove();
    
    // 删除比赛
    await db.collection('competitions')
      .doc(competition_id)
      .remove();
    
    return {
      success: true,
      message: '删除成功'
    };
  } catch (error) {
    console.error('删除比赛失败:', error);
    throw error;
  }
}

/**
 * 生成对战表（单败淘汰赛）
 * @param {Object} event - { competition_id, regenerate }
 */
async function generateBracket(event) {
  const { competition_id, regenerate = false } = event;
  
  if (!competition_id) {
    return {
      success: false,
      message: '缺少比赛ID'
    };
  }
  
  try {
    // 获取比赛信息
    const competition = await db.collection('competitions')
      .doc(competition_id)
      .get();
    
    if (!competition.data) {
      return {
        success: false,
        message: '比赛不存在'
      };
    }
    
    // 检查是否已生成对战表
    if (competition.data.bracket_generated && !regenerate) {
      return {
        success: false,
        message: '对战表已生成，如需重新生成请确认'
      };
    }
    
    // 如果是重新生成，先删除旧对战表和结果
    if (regenerate) {
      await db.collection('competition_brackets')
        .where({ competition_id })
        .remove();
      
      await db.collection('competition_results')
        .where({ competition_id })
        .remove();
    }
    
    // 查询被选中的报名学生
    const registrationsResult = await db.collection('competition_registrations')
      .where({
        competition_id: competition_id,
        is_selected: true
      })
      .get();
    
    // 转换为学员格式
    const students = registrationsResult.data.map(reg => ({
      _id: reg._id,
      name: reg.student_name,
      avatar: null,  // 报名数据无头像
      age: reg.age,
      gender: reg.gender,
      weight: reg.weight
    }));
    
    if (students.length < 2) {
      return {
        success: false,
        message: '参赛学员不足（至少需要2人）'
      };
    }
    
    if (students.length > 64) {
      return {
        success: false,
        message: '参赛学员过多（最多64人）'
      };
    }
    
    // 随机打乱学员顺序
    const shuffled = students.sort(() => Math.random() - 0.5);
    
    // 计算轮次数（2的幂次）
    const rounds = Math.ceil(Math.log2(students.length));
    const totalSlots = Math.pow(2, rounds);
    
    // 生成对战表
    const brackets = [];
    
    // 第一轮对战
    let matchNo = 1;
    for (let i = 0; i < totalSlots; i += 2) {
      const student1 = shuffled[i] || null;
      const student2 = shuffled[i + 1] || null;
      
      const match = {
        competition_id,
        round: 1,
        match_no: matchNo,
        position: `R1-M${matchNo}`,
        student1_id: student1 ? student1._id : null,
        student1_name: student1 ? student1.name : null,
        student1_avatar: student1 ? student1.avatar : null,
        student2_id: student2 ? student2._id : null,
        student2_name: student2 ? student2.name : null,
        student2_avatar: student2 ? student2.avatar : null,
        winner_id: student2 ? null : (student1 ? student1._id : null),
        winner_name: student2 ? null : (student1 ? student1.name : null),
        score: student2 ? null : '轮空',
        create_time: db.serverDate()
      };
      
      brackets.push(match);
      matchNo++;
    }
    
    // 生成后续轮次的空对战，并自动填充轮空晋级的选手
    // matchNo 继续全局递增（不在每轮重置为1）
    for (let round = 2; round <= rounds; round++) {
      const matchesInRound = Math.pow(2, rounds - round);
      for (let i = 0; i < matchesInRound; i++) {
        // 查找上一轮的两场对战（当前对战的来源）
        const prevMatch1Index = i * 2;
        const prevMatch2Index = i * 2 + 1;
        const prevRoundStartIndex = brackets.findIndex(m => m.round === round - 1);
        
        const prevMatch1 = prevRoundStartIndex >= 0 ? brackets[prevRoundStartIndex + prevMatch1Index] : null;
        const prevMatch2 = prevRoundStartIndex >= 0 ? brackets[prevRoundStartIndex + prevMatch2Index] : null;
        
        // 获取晋级选手（轮空自动晋级）
        const student1 = prevMatch1 && prevMatch1.winner_id ? {
          _id: prevMatch1.winner_id,
          name: prevMatch1.winner_name,
          avatar: prevMatch1.student1_id === prevMatch1.winner_id ? prevMatch1.student1_avatar : prevMatch1.student2_avatar
        } : null;
        
        const student2 = prevMatch2 && prevMatch2.winner_id ? {
          _id: prevMatch2.winner_id,
          name: prevMatch2.winner_name,
          avatar: prevMatch2.student1_id === prevMatch2.winner_id ? prevMatch2.student1_avatar : prevMatch2.student2_avatar
        } : null;
        
        const match = {
          competition_id,
          round: round,
          match_no: matchNo,  // 使用全局递增的 matchNo
          position: `R${round}-M${i + 1}`,  // position 保持原有格式用于内部逻辑
          student1_id: student1 ? student1._id : null,
          student1_name: student1 ? student1.name : '待定',
          student1_avatar: student1 ? student1.avatar : null,
          student2_id: student2 ? student2._id : null,
          student2_name: student2 ? student2.name : '待定',
          student2_avatar: student2 ? student2.avatar : null,
          winner_id: null,
          winner_name: null,
          score: null,
          create_time: db.serverDate()
        };
        
        brackets.push(match);
        matchNo++;  // 全局递增
      }
    }
    
    // 批量插入对战表
    // 由于小程序云开发限制，需要分批插入
    const batchSize = 20;
    for (let i = 0; i < brackets.length; i += batchSize) {
      const batch = brackets.slice(i, i + batchSize);
      await Promise.all(
        batch.map(match => 
          db.collection('competition_brackets').add({ data: match })
        )
      );
    }
    
    // 更新比赛信息
    await db.collection('competitions')
      .doc(competition_id)
      .update({
        data: {
          bracket_generated: true,
          participant_count: students.length,
          update_time: db.serverDate()
        }
      });
    
    return {
      success: true,
      message: '对战表生成成功',
      data: {
        participant_count: students.length,
        rounds: rounds,
        total_matches: brackets.length
      }
    };
  } catch (error) {
    console.error('生成对战表失败:', error);
    throw error;
  }
}

/**
 * 更新对战结果
 * @param {Object} event - { match_id, winner_id, score }
 */
async function updateMatch(event) {
  const { match_id, winner_id, score } = event;
  
  if (!match_id || !winner_id) {
    return {
      success: false,
      message: '缺少必填字段'
    };
  }
  
  try {
    // 获取当前对战信息
    const match = await db.collection('competition_brackets')
      .doc(match_id)
      .get();
    
    if (!match.data) {
      return {
        success: false,
        message: '对战不存在'
      };
    }
    
    // 验证获胜者是否是参赛者之一
    if (winner_id !== match.data.student1_id && winner_id !== match.data.student2_id) {
      return {
        success: false,
        message: '获胜者必须是参赛学员之一'
      };
    }
    
    // 获取获胜者姓名
    let winnerName = '';
    if (winner_id === match.data.student1_id) {
      winnerName = match.data.student1_name;
    } else if (winner_id === match.data.student2_id) {
      winnerName = match.data.student2_name;
    }
    
    // 更新当前对战结果
    await db.collection('competition_brackets')
      .doc(match_id)
      .update({
        data: {
          winner_id: winner_id,
          winner_name: winnerName,
          score: score || '',
          update_time: db.serverDate()
        }
      });
    
    console.log('对战结果已更新:', {
      match_id,
      winner_id,
      winnerName,
      round: match.data.round,
      match_no: match.data.match_no
    });
    
    // 如果不是最后一轮，更新下一轮对战表
    const competition = await db.collection('competitions')
      .doc(match.data.competition_id)
      .get();
    
    // 计算总轮次
    // 自动分组模式下，需要用子组的人数而不是整个比赛的人数
    let participantCount = competition.data.participant_count;
    
    if (match.data.sub_group_id) {
      // 查询该子组的参赛人数
      const subGroupResult = await db.collection('competition_sub_groups')
        .where({
          competition_id: match.data.competition_id,
          sub_group_id: match.data.sub_group_id
        })
        .get();
      
      if (subGroupResult.data.length > 0) {
        participantCount = subGroupResult.data[0].participant_count;
      }
    }
    
    const totalRounds = Math.ceil(Math.log2(participantCount));
    
    console.log('轮次信息:', {
      currentRound: match.data.round,
      totalRounds,
      needUpdateNext: match.data.round < totalRounds
    });
    
    if (match.data.round < totalRounds) {
      // 从position中提取当前轮次内的局部序号
      // 支持两种格式：
      // 1. 传统模式: R1-M2
      // 2. 自动分组模式: sub_group_id_R1_M2
      let positionMatch;
      let subGroupPrefix = '';
      
      if (match.data.sub_group_id) {
        // 自动分组模式: sub_group_id_R1_M2
        positionMatch = match.data.position.match(/(.+)_R(\d+)_M(\d+)/);
        if (positionMatch) {
          subGroupPrefix = positionMatch[1];
          // 注意：自动分组模式下，轮次在index[2]，场次在index[3]
          positionMatch = [positionMatch[0], positionMatch[2], positionMatch[3]];
        }
      } else {
        // 传统模式: R1-M2
        positionMatch = match.data.position.match(/R(\d+)-M(\d+)/);
      }
      
      if (!positionMatch) {
        console.error('position格式错误:', match.data.position);
        return {
          success: true,
          message: '保存成功，但无法更新下一轮'
        };
      }
      
      const currentRoundMatchNo = parseInt(positionMatch[2]); // 当前轮次内的局部序号
      const nextRound = match.data.round + 1;
      const nextRoundMatchNo = Math.ceil(currentRoundMatchNo / 2); // 下一轮的局部序号
      
      // 根据模式生成下一轮的 position
      let nextPosition;
      if (match.data.sub_group_id) {
        // 自动分组模式
        nextPosition = `${subGroupPrefix}_R${nextRound}_M${nextRoundMatchNo}`;
      } else {
        // 传统模式
        nextPosition = `R${nextRound}-M${nextRoundMatchNo}`;
      }
      
      const isFirstStudent = (currentRoundMatchNo % 2 === 1);
      
      console.log('下一轮对战信息:', {
        mode: match.data.sub_group_id ? '自动分组模式' : '传统模式',
        sub_group_id: match.data.sub_group_id || '无',
        currentPosition: match.data.position,
        currentRoundMatchNo,
        nextRound,
        nextRoundMatchNo,
        nextPosition,
        isFirstStudent,
        willUpdatePosition: isFirstStudent ? 'student1' : 'student2'
      });
      
      // 使用 position 字段查找下一轮对战
      // 注意：自动分组模式下需要同时匹配 sub_group_id
      const whereCondition = {
        competition_id: match.data.competition_id,
        position: nextPosition
      };
      
      // 如果有子组ID，添加到查询条件中
      if (match.data.sub_group_id) {
        whereCondition.sub_group_id = match.data.sub_group_id;
      }
      
      console.log('查询下一轮对战的条件:', whereCondition);
      
      const nextMatches = await db.collection('competition_brackets')
        .where(whereCondition)
        .get();
      
      console.log('查找到的下一轮对战数量:', nextMatches.data.length);
      if (nextMatches.data.length > 0) {
        console.log('下一轮对战详情:', {
          _id: nextMatches.data[0]._id,
          position: nextMatches.data[0].position,
          round: nextMatches.data[0].round,
          student1: nextMatches.data[0].student1_name,
          student2: nextMatches.data[0].student2_name
        });
      }
      
      if (nextMatches.data.length > 0) {
        const nextMatch = nextMatches.data[0];
        const updateData = {};
        
        if (isFirstStudent) {
          updateData.student1_id = winner_id;
          updateData.student1_name = winnerName;
          updateData.student1_avatar = null;
        } else {
          updateData.student2_id = winner_id;
          updateData.student2_name = winnerName;
          updateData.student2_avatar = null;
        }
        
        updateData.update_time = db.serverDate();
        
        console.log('即将更新下一轮对战:', {
          nextMatchId: nextMatch._id,
          updateData
        });
        
        await db.collection('competition_brackets')
          .doc(nextMatch._id)
          .update({
            data: updateData
          });
        
        console.log('下一轮对战已更新');
      } else {
        console.warn('未找到下一轮对战，可能配置有误');
      }
    }
    
    return {
      success: true,
      message: '更新成功'
    };
  } catch (error) {
    console.error('更新对战结果失败:', error);
    throw error;
  }
}

/**
 * 更新对战人员（管理端二次编辑）
 * @param {Object} event - { match_id, student1_id, student1_name, student2_id, student2_name }
 */
async function updateMatchParticipants(event) {
  const { match_id, student1_id, student1_name, student2_id, student2_name } = event;

  if (!match_id || !student1_id || !student2_id) {
    return { success: false, message: '缺少必填参数' };
  }

  try {
    const updateData = {
      student1_id,
      student1_name,
      student2_id,
      student2_name,
      winner_id: _.set(null),
      winner_name: '',
      score: '',
      update_time: db.serverDate()
    };

    await db.collection('competition_brackets')
      .doc(match_id)
      .update({ data: updateData });

    return {
      success: true,
      message: '对战人员已更新'
    };
  } catch (error) {
    console.error('更新对战人员失败:', error);
    throw error;
  }
}

/**
 * 保存比赛结果（支持子组）
 * @param {Object} event - { competition_id, sub_group_id, results: [{student_id, rank}] }
 */
async function saveResults(event) {
  const { competition_id, sub_group_id, results } = event;
  
  if (!competition_id || !results || !Array.isArray(results)) {
    return {
      success: false,
      message: '缺少必填字段'
    };
  }
  
  try {
    // 获取比赛信息
    const competition = await db.collection('competitions')
      .doc(competition_id)
      .get();
    
    if (!competition.data) {
      return {
        success: false,
        message: '比赛不存在'
      };
    }
    
    // 验证名次连续性
    const ranks = results.map(r => r.rank).sort((a, b) => a - b);
    for (let i = 0; i < ranks.length; i++) {
      if (ranks[i] !== i + 1) {
        return {
          success: false,
          message: '名次必须从1开始连续'
        };
      }
    }
    
    // 获取展示名次配置
    const displayRankConfig = await db.collection('configs')
      .where({ type: 'competition_display_rank' })
      .get();
    
    const maxDisplayRank = displayRankConfig.data.length > 0 
      ? displayRankConfig.data[0].value 
      : 3;
    
    // 验证数量
    if (results.length > maxDisplayRank) {
      return {
        success: false,
        message: `最多只能设置前${maxDisplayRank}名`
      };
    }
    
    // 获取子组信息（如果是自动分组模式）
    let subGroupName = null;
    if (sub_group_id) {
      const subGroup = await db.collection('competition_sub_groups')
        .where({ competition_id, sub_group_id })
        .get();
      
      if (subGroup.data.length > 0) {
        subGroupName = subGroup.data[0].sub_group_name;
      }
    }
    
    // 删除旧结果（指定子组或全部）
    const deleteWhere = { competition_id };
    if (sub_group_id) {
      deleteWhere.sub_group_id = sub_group_id;
    }
    
    await db.collection('competition_results')
      .where(deleteWhere)
      .remove();
    
    // 保存新结果
    for (const result of results) {
      const registration = await db.collection('competition_registrations')
        .doc(result.student_id)
        .get();
      
      if (registration.data) {
        const resultData = {
          competition_id,
          student_id: result.student_id,
          student_name: registration.data.student_name,
          student_avatar: null,
          age: registration.data.age,
          gender: registration.data.gender,
          weight: registration.data.weight,
          rank: result.rank,
          create_time: db.serverDate()
        };
        
        // 如果是自动分组模式，添加子组信息
        if (sub_group_id && subGroupName) {
          resultData.sub_group_id = sub_group_id;
          resultData.sub_group_name = subGroupName;
        }
        
        await db.collection('competition_results').add({
          data: resultData
        });
      }
    }
    
    return {
      success: true,
      message: '保存成功'
    };
  } catch (error) {
    console.error('保存比赛结果失败:', error);
    throw error;
  }
}

// ==================== 新增：报名相关功能 ====================

/**
 * 学生报名参加比赛
 * @param {Object} event - { competition_id, student_name, age, gender, weight, openid }
 */
/**
 * 校验参赛资格
 * @param {Object} event - { competition_id, age, gender, weight }
 * @returns {Object} { success, eligible, sub_group_info, error_reason }
 */
async function validateParticipantEligibility(event) {
  const { competition_id, age, gender, weight } = event;
  
  // 验证必填字段
  if (!competition_id || !age || !gender || !weight) {
    return {
      success: false,
      message: '缺少必填字段'
    };
  }
  
  try {
    // 获取比赛信息
    const competition = await db.collection('competitions')
      .doc(competition_id)
      .get();
    
    if (!competition.data) {
      return {
        success: false,
        message: '比赛不存在'
      };
    }
    
    // 获取分组规则
    const groupConfig = await db.collection('competition_group_configs')
      .doc(competition.data.group_config_id)
      .get();
    
    if (!groupConfig.data) {
      return {
        success: false,
        message: '分组规则不存在'
      };
    }
    
    // 调用分组算法进行匹配
    try {
      const groupInfo = calculateGroup(
        parseInt(age),
        gender,
        parseFloat(weight),
        groupConfig.data.age_groups
      );
      
      return {
        success: true,
        eligible: true,
        sub_group_info: groupInfo,
        message: '符合参赛条件'
      };
    } catch (error) {
      // 匹配失败，返回详细原因
      return {
        success: true,
        eligible: false,
        error_reason: error.message || '不符合参赛条件',
        message: error.message || '不符合参赛条件'
      };
    }
  } catch (error) {
    console.error('校验参赛资格失败:', error);
    return {
      success: false,
      message: '校验失败'
    };
  }
}

/**
 * 学生报名（支持自动分组）
 * @param {Object} event - { competition_id, student_name, id_card, age, gender, weight, contact }
 */
async function registerCompetition(event) {
  const { competition_id, student_name, id_card, age, gender, weight, contact, organization } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  
  // 验证必填字段
  if (!competition_id || !student_name || !id_card || !age || !gender || !weight) {
    return {
      success: false,
      message: '缺少必填字段'
    };
  }
  
  try {
    // 检查比赛是否存在且报名开放
    const competition = await db.collection('competitions')
      .doc(competition_id)
      .get();
    
    if (!competition.data) {
      return {
        success: false,
        message: '比赛不存在'
      };
    }
    
    if (competition.data.registration_status !== 'open') {
      return {
        success: false,
        message: '报名已截止'
      };
    }
    

    
    const studentAge = parseInt(age);
    const studentWeight = parseFloat(weight);
    
    // 获取分组规则配置
    const groupConfig = await db.collection('competition_group_configs')
      .doc(competition.data.group_config_id)
      .get();
    
    if (!groupConfig.data) {
      return {
        success: false,
        message: '分组规则配置不存在'
      };
    }
    
    // 计算分组（校验参赛资格）
    let groupInfo = null;
    try {
      groupInfo = calculateGroup(studentAge, gender, studentWeight, groupConfig.data.age_groups);
    } catch (error) {
      // 不符合参赛条件，返回详细错误信息
      return {
        success: false,
        message: `抱歉，您不符合本次比赛的参赛要求。\n\n${error.message}`,
        error_reason: error.message
      };
    }
    
    // 创建报名记录
    const registrationData = {
      competition_id,
      openid,
      student_name,
      id_card,
      age: studentAge,
      gender,
      weight: studentWeight,
      contact: contact || '',
      organization: organization || '',
      registration_time: db.serverDate(),
      is_selected: groupInfo ? true : false,  // 自动分组模式下自动参赛
      status: 'approved',
      create_time: db.serverDate()
    };
    
    // 如果有分组信息，添加到报名记录中
    if (groupInfo) {
      Object.assign(registrationData, groupInfo);
    }
    
    const registrationResult = await db.collection('competition_registrations').add({
      data: registrationData
    });
    
    // 如果启用自动分组，更新子组统计
    if (groupInfo) {
      await updateSubGroupStats(competition_id, groupInfo.sub_group_id, groupInfo);
    }
    
    // 更新比赛的报名人数和参赛人数
    const updateData = {
      registration_count: _.inc(1),
      update_time: db.serverDate()
    };
    
    if (groupInfo) {
      updateData.participant_count = _.inc(1);  // 自动分组模式下报名即参赛
    }
    
    await db.collection('competitions')
      .doc(competition_id)
      .update({
        data: updateData
      });
    
    return {
      success: true,
      message: '报名成功',
      registration_id: registrationResult._id,
      groupInfo: groupInfo  // 返回分组信息
    };
  } catch (error) {
    console.error('报名失败:', error);
    throw error;
  }
}

/**
 * 检查用户是否已报名
 * @param {Object} event - { competition_id, openid }
 */
async function checkRegistration(event) {
  const { competition_id } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  
  if (!competition_id) {
    return {
      success: false,
      message: '缺少比赛ID'
    };
  }
  
  try {
    const result = await db.collection('competition_registrations')
      .where({
        competition_id,
        openid
      })
      .get();
    
    return {
      success: true,
      registered: result.data.length > 0,
      registration: result.data.length > 0 ? result.data[0] : null
    };
  } catch (error) {
    console.error('检查报名状态失败:', error);
    throw error;
  }
}

/**
 * 获取比赛报名列表（管理端）
 * @param {Object} event - { competition_id }
 */
async function getRegistrations(event) {
  const { competition_id } = event;
  
  if (!competition_id) {
    return {
      success: false,
      message: '缺少比赛ID'
    };
  }
  
  try {
    const result = await db.collection('competition_registrations')
      .where({ competition_id })
      .orderBy('registration_time', 'desc')
      .get();
    
    return {
      success: true,
      data: result.data,
      total: result.data.length
    };
  } catch (error) {
    console.error('获取报名列表失败:', error);
    throw error;
  }
}

/**
 * 更新报名信息（管理端）
 * @param {Object} event - { registration_id, student_name, weight }
 * 注意: age 和 gender 由身份证号自动计算，不允许单独修改
 */
async function updateRegistration(event) {
  const { registration_id, student_name, weight, contact, organization } = event;

  if (!registration_id) {
    return {
      success: false,
      message: '缺少报名ID'
    };
  }

  try {
    const updateData = {};
    if (student_name) updateData.student_name = student_name;
    if (weight) updateData.weight = parseFloat(weight);
    if (contact !== undefined) updateData.contact = (contact || '').trim();
    if (organization !== undefined) updateData.organization = (organization || '').trim();
    
    await db.collection('competition_registrations')
      .doc(registration_id)
      .update({ data: updateData });
    
    return {
      success: true,
      message: '更新成功'
    };
  } catch (error) {
    console.error('更新报名信息失败:', error);
    throw error;
  }
}

/**
 * 选择参赛学生（管理端）
 * @param {Object} event - { competition_id, registration_ids: [] }
 */
async function selectParticipants(event) {
  const { competition_id, registration_ids } = event;
  
  if (!competition_id || !Array.isArray(registration_ids)) {
    return {
      success: false,
      message: '参数错误'
    };
  }
  
  try {
    // 先将该比赛所有报名设为未选中
    await db.collection('competition_registrations')
      .where({ competition_id })
      .update({
        data: {
          is_selected: false
        }
      });
    
    // 将选中的报名设为已选中
    if (registration_ids.length > 0) {
      await Promise.all(
        registration_ids.map(id =>
          db.collection('competition_registrations')
            .doc(id)
            .update({
              data: {
                is_selected: true,
                status: 'selected'
              }
            })
        )
      );
    }
    
    // 更新比赛的参赛人数
    await db.collection('competitions')
      .doc(competition_id)
      .update({
        data: {
          participant_count: registration_ids.length,
          update_time: db.serverDate()
        }
      });
    
    return {
      success: true,
      message: '选择成功',
      count: registration_ids.length
    };
  } catch (error) {
    console.error('选择参赛学生失败:', error);
    throw error;
  }
}

/**
 * 移除报名学生（管理端）
 * @param {Object} event - { competition_id, registration_id }
 */
async function removeRegistration(event) {
  const { competition_id, registration_id } = event;

  if (!competition_id || !registration_id) {
    return {
      success: false,
      message: '缺少必填参数'
    };
  }

  try {
    // 获取比赛信息，已生成对战表时禁止移除，避免数据不一致
    const competitionResult = await db.collection('competitions')
      .doc(competition_id)
      .get();

    if (!competitionResult.data) {
      return {
        success: false,
        message: '比赛不存在'
      };
    }

    if (competitionResult.data.bracket_generated || competitionResult.data.brackets_generated) {
      return {
        success: false,
        message: '该比赛已生成对战表，禁止移除参赛人员。请先清空对战表与结果后再操作。'
      };
    }

    // 获取报名信息
    const registrationResult = await db.collection('competition_registrations')
      .doc(registration_id)
      .get();

    if (!registrationResult.data) {
      return {
        success: false,
        message: '报名记录不存在'
      };
    }

    const registration = registrationResult.data;
    if (registration.competition_id !== competition_id) {
      return {
        success: false,
        message: '报名记录与比赛不匹配'
      };
    }

    // 删除报名记录
    await db.collection('competition_registrations')
      .doc(registration_id)
      .remove();

    // 更新比赛统计
    const competitionUpdateData = {
      registration_count: _.inc(-1),
      update_time: db.serverDate()
    };

    if (registration.is_selected) {
      competitionUpdateData.participant_count = _.inc(-1);
    }

    await db.collection('competitions')
      .doc(competition_id)
      .update({
        data: competitionUpdateData
      });

    // 如有子组信息，回写子组人数
    if (registration.sub_group_id) {
      const subGroupCount = await db.collection('competition_registrations')
        .where({
          competition_id,
          sub_group_id: registration.sub_group_id
        })
        .count();

      await db.collection('competition_sub_groups')
        .where({
          competition_id,
          sub_group_id: registration.sub_group_id
        })
        .update({
          data: {
            participant_count: subGroupCount.total || 0,
            update_time: db.serverDate()
          }
        });
    }

    return {
      success: true,
      message: '移除成功'
    };
  } catch (error) {
    console.error('移除报名学生失败:', error);
    throw error;
  }
}

/**
 * 变更学生分组（管理端）
 * @param {Object} event - { registration_id, competition_id, new_sub_group_id }
 */
async function changeRegistrationGroup(event) {
  const { registration_id, competition_id, new_sub_group_id } = event;

  if (!registration_id || !competition_id || !new_sub_group_id) {
    return { success: false, message: '缺少必填参数' };
  }

  try {
    const regResult = await db.collection('competition_registrations')
      .doc(registration_id)
      .get();
    if (!regResult.data) {
      return { success: false, message: '报名记录不存在' };
    }
    const registration = regResult.data;
    const old_sub_group_id = registration.sub_group_id;

    if (old_sub_group_id === new_sub_group_id) {
      return { success: true, message: '分组未变更' };
    }

    // 检查原分组的对战表是否已生成
    if (old_sub_group_id) {
      const oldSubGroups = await db.collection('competition_sub_groups')
        .where({ competition_id, sub_group_id: old_sub_group_id })
        .get();
      if (oldSubGroups.data.length > 0 && oldSubGroups.data[0].bracket_generated) {
        return {
          success: false,
          message: '原分组已生成对战表，无法修改分组。请先清空该分组的对战表后再操作。'
        };
      }
    }

    // 检查目标分组是否存在以及是否已生成对战表
    const newSubGroups = await db.collection('competition_sub_groups')
      .where({ competition_id, sub_group_id: new_sub_group_id })
      .get();
    if (newSubGroups.data.length === 0) {
      return { success: false, message: '目标分组不存在' };
    }
    if (newSubGroups.data[0].bracket_generated) {
      return {
        success: false,
        message: '目标分组已生成对战表，无法移入学生。请先清空该分组的对战表后再操作。'
      };
    }

    // 从目标分组记录派生分组字段
    const target = newSubGroups.data[0];
    const groupUpdateData = {
      sub_group_id: target.sub_group_id,
      sub_group_name: target.sub_group_name,
      age_group_code: target.age_group_code,
      age_group_name: target.age_group_name,
      gender_group: target.gender_group,
      weight_category_code: target.weight_category_code,
      weight_category_label: target.weight_category_label
    };

    // 更新报名记录的分组字段
    await db.collection('competition_registrations')
      .doc(registration_id)
      .update({ data: groupUpdateData });

    // 重算新旧分组的参赛人数
    if (old_sub_group_id) {
      await updateSubGroupStats(competition_id, old_sub_group_id, null);
    }
    await updateSubGroupStats(competition_id, new_sub_group_id, null);

    return {
      success: true,
      message: '分组变更成功',
      data: groupUpdateData
    };
  } catch (error) {
    console.error('变更分组失败:', error);
    throw error;
  }
}

/**
 * 获取展示名次配置
 */
async function getDisplayRankCount(event) {
  try {
    const result = await db.collection('configs')
      .where({ type: 'competition_display_rank' })
      .get();
    
    const count = result.data.length > 0 ? result.data[0].value : 3;
    
    return {
      success: true,
      count: count
    };
  } catch (error) {
    console.error('获取展示名次配置失败:', error);
    return {
      success: true,
      count: 3  // 默认值
    };
  }
}

// ==================== 新增：分组规则配置功能 ====================

/**
 * 自动分组算法
 * @param {Number} age - 年龄
 * @param {String} gender - 性别 (male/female)
 * @param {Number} weight - 体重
 * @param {Array} ageGroups - 年龄组配置
 * @returns {Object} 分组信息
 */
function calculateGroup(age, gender, weight, ageGroups) {
  // 1. 根据年龄找到年龄组
  const ageGroup = ageGroups.find(g => age >= g.age_min && age <= g.age_max);
  if (!ageGroup) {
    throw new Error(`年龄${age}岁不在任何分组范围内`);
  }
  
  // 2. 确定性别组
  let genderGroup = 'mixed';
  let weightCategories = ageGroup.weight_categories.mixed || [];
  
  if (ageGroup.gender_separated) {
    genderGroup = gender;
    weightCategories = ageGroup.weight_categories[gender] || [];
  }
  
  if (weightCategories.length === 0) {
    throw new Error('该年龄组没有配置体重级别');
  }
  
  // 3. 根据体重找到级别（找到第一个 max >= weight 的级别）
  const weightCategory = weightCategories.find(w => weight <= w.max);
  if (!weightCategory) {
    throw new Error(`体重${weight}kg超出所有级别范围`);
  }
  
  // 4. 生成子组标识
  const sub_group_id = `${ageGroup.code}_${genderGroup}_${weightCategory.code}`;
  
  // 5. 生成子组名称
  let sub_group_name = ageGroup.name;
  if (ageGroup.gender_separated) {
    sub_group_name += gender === 'male' ? '男子组' : '女子组';
  }
  sub_group_name += weightCategory.label + 'kg级';
  
  return {
    age_group_code: ageGroup.code,
    age_group_name: ageGroup.name,
    gender_group: genderGroup,
    weight_category_code: weightCategory.code,
    weight_category_label: weightCategory.label,
    sub_group_id,
    sub_group_name
  };
}

/**
 * 更新或创建子组统计
 */
async function updateSubGroupStats(competition_id, sub_group_id, groupInfo) {
  try {
    // 查询该子组的报名数量
    const registrations = await db.collection('competition_registrations')
      .where({ competition_id, sub_group_id })
      .count();
    
    const participant_count = registrations.total;
    
    // 查找是否已存在该子组记录
    const existing = await db.collection('competition_sub_groups')
      .where({ competition_id, sub_group_id })
      .get();
    
    if (existing.data.length > 0) {
      // 更新
      await db.collection('competition_sub_groups')
        .doc(existing.data[0]._id)
        .update({
          data: {
            participant_count,
            update_time: db.serverDate()
          }
        });
    } else {
      // 创建
      await db.collection('competition_sub_groups').add({
        data: {
          competition_id,
          sub_group_id,
          sub_group_name: groupInfo.sub_group_name,
          age_group_code: groupInfo.age_group_code,
          age_group_name: groupInfo.age_group_name,
          gender_group: groupInfo.gender_group,
          weight_category_code: groupInfo.weight_category_code,
          weight_category_label: groupInfo.weight_category_label,
          participant_count,
          bracket_generated: false,
          create_time: db.serverDate(),
          update_time: db.serverDate()
        }
      });
    }
  } catch (error) {
    console.error('更新子组统计失败:', error);
  }
}

/**
 * 获取分组规则列表
 */
async function getGroupConfigs(event) {
  try {
    const result = await db.collection('competition_group_configs')
      .orderBy('create_time', 'desc')
      .get();
    
    return {
      success: true,
      data: result.data || []
    };
  } catch (error) {
    console.error('获取分组规则列表失败:', error);
    throw error;
  }
}

/**
 * 获取分组规则详情
 */
async function getGroupConfigDetail(event) {
  const { config_id } = event;
  
  if (!config_id) {
    return {
      success: false,
      message: '缺少配置ID'
    };
  }
  
  try {
    const result = await db.collection('competition_group_configs')
      .doc(config_id)
      .get();
    
    if (!result.data) {
      return {
        success: false,
        message: '配置不存在'
      };
    }
    
    return {
      success: true,
      data: result.data
    };
  } catch (error) {
    console.error('获取分组规则详情失败:', error);
    throw error;
  }
}

/**
 * 创建分组规则
 */
async function createGroupConfig(event) {
  const { name, description, age_groups } = event;
  
  if (!name || !age_groups || !Array.isArray(age_groups)) {
    return {
      success: false,
      message: '缺少必填字段'
    };
  }
  
  try {
    const result = await db.collection('competition_group_configs').add({
      data: {
        name,
        description: description || '',
        age_groups,
        is_default: false,
        create_time: db.serverDate(),
        update_time: db.serverDate()
      }
    });
    
    return {
      success: true,
      message: '创建成功',
      config_id: result._id
    };
  } catch (error) {
    console.error('创建分组规则失败:', error);
    throw error;
  }
}

/**
 * 更新分组规则
 */
async function updateGroupConfig(event) {
  const { config_id, name, description, age_groups } = event;
  
  if (!config_id) {
    return {
      success: false,
      message: '缺少配置ID'
    };
  }
  
  try {
    const updateData = {
      update_time: db.serverDate()
    };
    
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (age_groups) updateData.age_groups = age_groups;
    
    await db.collection('competition_group_configs')
      .doc(config_id)
      .update({
        data: updateData
      });
    
    return {
      success: true,
      message: '更新成功'
    };
  } catch (error) {
    console.error('更新分组规则失败:', error);
    throw error;
  }
}

/**
 * 获取比赛的所有子组
 */
async function getSubGroups(event) {
  const { competition_id, flat = false } = event;
  
  if (!competition_id) {
    return {
      success: false,
      message: '缺少比赛ID'
    };
  }
  
  try {
    const result = await db.collection('competition_sub_groups')
      .where({ competition_id })
      .orderBy('age_group_code', 'asc')
      .get();
    
    // 如果需要扁平列表，直接返回
    if (flat) {
      return {
        success: true,
        data: result.data
      };
    }
    
    // 按年龄组分组
    const grouped = {};
    result.data.forEach(subGroup => {
      const key = subGroup.age_group_name;
      if (!grouped[key]) {
        grouped[key] = {
          age_group_name: key,
          age_group_code: subGroup.age_group_code,
          sub_groups: []
        };
      }
      grouped[key].sub_groups.push(subGroup);
    });
    
    return {
      success: true,
      data: Object.values(grouped)
    };
  } catch (error) {
    console.error('获取子组列表失败:', error);
    throw error;
  }
}

/**
 * 获取子组详情（含参赛者）
 */
async function getSubGroupDetail(event) {
  const { competition_id, sub_group_id } = event;
  
  if (!competition_id || !sub_group_id) {
    return {
      success: false,
      message: '缺少必填参数'
    };
  }
  
  try {
    // 获取子组信息
    const subGroup = await db.collection('competition_sub_groups')
      .where({ competition_id, sub_group_id })
      .get();
    
    if (subGroup.data.length === 0) {
      return {
        success: false,
        message: '子组不存在'
      };
    }
    
    // 获取该子组的参赛者
    const registrations = await db.collection('competition_registrations')
      .where({ competition_id, sub_group_id })
      .get();
    
    return {
      success: true,
      data: {
        sub_group: subGroup.data[0],
        participants: registrations.data || []
      }
    };
  } catch (error) {
    console.error('获取子组详情失败:', error);
    throw error;
  }
}

/**
 * 为所有子组生成对战表
 */
async function generateAllBrackets(event) {
  const { competition_id } = event;
  
  if (!competition_id) {
    return {
      success: false,
      message: '缺少比赛ID'
    };
  }
  
  try {
    // 获取所有子组
    const subGroups = await db.collection('competition_sub_groups')
      .where({ competition_id })
      .get();
    
    const results = [];
    const errors = [];
    
    for (const subGroup of subGroups.data) {
      if (subGroup.participant_count >= 2) {
        try {
          const result = await generateSubGroupBracketInternal(
            competition_id,
            subGroup.sub_group_id,
            subGroup.sub_group_name
          );
          results.push({
            sub_group_id: subGroup.sub_group_id,
            sub_group_name: subGroup.sub_group_name,
            success: true,
            ...result
          });
        } catch (error) {
          errors.push({
            sub_group_id: subGroup.sub_group_id,
            sub_group_name: subGroup.sub_group_name,
            error: error.message
          });
        }
      } else {
        errors.push({
          sub_group_id: subGroup.sub_group_id,
          sub_group_name: subGroup.sub_group_name,
          error: '参赛人数不足（至少2人）'
        });
      }
    }
    
    // 更新比赛状态
    if (results.length > 0) {
      await db.collection('competitions')
        .doc(competition_id)
        .update({
          data: {
            bracket_generated: true,
            brackets_generated: true,
            update_time: db.serverDate()
          }
        });
    }
    
    return {
      success: true,
      message: `成功生成${results.length}个子组的对战表`,
      data: {
        success_count: results.length,
        error_count: errors.length,
        results,
        errors
      }
    };
  } catch (error) {
    console.error('批量生成对战表失败:', error);
    throw error;
  }
}

/**
 * 为单个子组生成对战表（内部方法）
 */
async function generateSubGroupBracketInternal(competition_id, sub_group_id, sub_group_name) {
  // 1. 获取该子组的所有参赛者
  const registrations = await db.collection('competition_registrations')
    .where({ competition_id, sub_group_id })
    .get();
  
  const students = registrations.data.map(reg => ({
    _id: reg._id,
    name: reg.student_name,
    avatar: null,
    age: reg.age,
    gender: reg.gender,
    weight: reg.weight
  }));
  
  if (students.length < 2) {
    throw new Error('参赛学员不足（至少需要2人）');
  }
  
  if (students.length > 64) {
    throw new Error('参赛学员过多（最多64人）');
  }
  
  // 2. 随机打乱学员顺序
  const shuffled = students.sort(() => Math.random() - 0.5);
  
  // 3. 计算轮次数
  const rounds = Math.ceil(Math.log2(students.length));
  const totalSlots = Math.pow(2, rounds);
  
  // 4. 生成对战表
  const brackets = [];
  let matchNo = 1;
  
  // 第一轮对战
  for (let i = 0; i < totalSlots; i += 2) {
    const student1 = shuffled[i] || null;
    const student2 = shuffled[i + 1] || null;
    
    const match = {
      competition_id,
      sub_group_id,
      sub_group_name,
      round: 1,
      match_no: matchNo,
      position: `${sub_group_id}_R1_M${matchNo}`,
      student1_id: student1 ? student1._id : null,
      student1_name: student1 ? student1.name : null,
      student1_avatar: student1 ? student1.avatar : null,
      student2_id: student2 ? student2._id : null,
      student2_name: student2 ? student2.name : null,
      student2_avatar: student2 ? student2.avatar : null,
      winner_id: student2 ? null : (student1 ? student1._id : null),
      winner_name: student2 ? null : (student1 ? student1.name : null),
      score: student2 ? null : '轮空',
      create_time: db.serverDate()
    };
    
    brackets.push(match);
    matchNo++;
  }
  
  // 生成后续轮次
  for (let round = 2; round <= rounds; round++) {
    const matchesInRound = Math.pow(2, rounds - round);
    for (let i = 0; i < matchesInRound; i++) {
      const prevMatch1Index = i * 2;
      const prevMatch2Index = i * 2 + 1;
      const prevRoundStartIndex = brackets.findIndex(m => m.round === round - 1);
      
      const prevMatch1 = prevRoundStartIndex >= 0 ? brackets[prevRoundStartIndex + prevMatch1Index] : null;
      const prevMatch2 = prevRoundStartIndex >= 0 ? brackets[prevRoundStartIndex + prevMatch2Index] : null;
      
      const student1 = prevMatch1 && prevMatch1.winner_id ? {
        _id: prevMatch1.winner_id,
        name: prevMatch1.winner_name,
        avatar: prevMatch1.student1_id === prevMatch1.winner_id ? prevMatch1.student1_avatar : prevMatch1.student2_avatar
      } : null;
      
      const student2 = prevMatch2 && prevMatch2.winner_id ? {
        _id: prevMatch2.winner_id,
        name: prevMatch2.winner_name,
        avatar: prevMatch2.student1_id === prevMatch2.winner_id ? prevMatch2.student1_avatar : prevMatch2.student2_avatar
      } : null;
      
      const match = {
        competition_id,
        sub_group_id,
        sub_group_name,
        round: round,
        match_no: matchNo,
        position: `${sub_group_id}_R${round}_M${i + 1}`,
        student1_id: student1 ? student1._id : null,
        student1_name: student1 ? student1.name : '待定',
        student1_avatar: student1 ? student1.avatar : null,
        student2_id: student2 ? student2._id : null,
        student2_name: student2 ? student2.name : '待定',
        student2_avatar: student2 ? student2.avatar : null,
        winner_id: null,
        winner_name: null,
        score: null,
        create_time: db.serverDate()
      };
      
      brackets.push(match);
      matchNo++;
    }
  }
  
  // 5. 批量插入对战表
  const batchSize = 20;
  for (let i = 0; i < brackets.length; i += batchSize) {
    const batch = brackets.slice(i, i + batchSize);
    await Promise.all(
      batch.map(match => 
        db.collection('competition_brackets').add({ data: match })
      )
    );
  }
  
  // 6. 更新子组状态
  await db.collection('competition_sub_groups')
    .where({ competition_id, sub_group_id })
    .update({
      data: {
        bracket_generated: true,
        update_time: db.serverDate()
      }
    });
  
  return {
    participant_count: students.length,
    rounds: rounds,
    total_matches: brackets.length
  };
}

/**
 * 为单个子组生成对战表（外部接口）
 */
async function generateSubGroupBracket(event) {
  const { competition_id, sub_group_id, sub_group_name } = event;
  
  if (!competition_id || !sub_group_id) {
    return {
      success: false,
      message: '缺少必填参数'
    };
  }
  
  try {
    const result = await generateSubGroupBracketInternal(competition_id, sub_group_id, sub_group_name);
    
    return {
      success: true,
      message: '对战表生成成功',
      data: result
    };
  } catch (error) {
    console.error('生成对战表失败:', error);
    return {
      success: false,
      message: error.message || '生成对战表失败'
    };
  }
}

/**
 * 清空子组对战表及结果
 * @param {Object} event - { competition_id, sub_group_id }
 */
async function clearSubGroupBracket(event) {
  const { competition_id, sub_group_id } = event;

  if (!competition_id || !sub_group_id) {
    return { success: false, message: '缺少必填参数' };
  }

  try {
    const bracketResult = await db.collection('competition_brackets')
      .where({ competition_id, sub_group_id })
      .get();
    if (bracketResult.data.length > 0) {
      await Promise.all(
        bracketResult.data.map(doc =>
          db.collection('competition_brackets').doc(doc._id).remove()
        )
      );
    }

    const resultResult = await db.collection('competition_results')
      .where({ competition_id, sub_group_id })
      .get();
    if (resultResult.data.length > 0) {
      await Promise.all(
        resultResult.data.map(doc =>
          db.collection('competition_results').doc(doc._id).remove()
        )
      );
    }

    await db.collection('competition_sub_groups')
      .where({ competition_id, sub_group_id })
      .update({
        data: {
          bracket_generated: false,
          update_time: db.serverDate()
        }
      });

    return {
      success: true,
      message: '对战表已清空',
      data: {
        deleted_brackets: bracketResult.data.length,
        deleted_results: resultResult.data.length
      }
    };
  } catch (error) {
    console.error('清空对战表失败:', error);
    throw error;
  }
}

/**
 * 一键清空比赛所有子组对战表及结果
 * @param {Object} event - { competition_id }
 */
async function clearAllBrackets(event) {
  const { competition_id } = event;

  if (!competition_id) {
    return { success: false, message: '缺少比赛ID' };
  }

  try {
    const bracketResult = await db.collection('competition_brackets')
      .where({ competition_id })
      .get();
    if (bracketResult.data.length > 0) {
      await Promise.all(
        bracketResult.data.map(doc =>
          db.collection('competition_brackets').doc(doc._id).remove()
        )
      );
    }

    const resultResult = await db.collection('competition_results')
      .where({ competition_id })
      .get();
    if (resultResult.data.length > 0) {
      await Promise.all(
        resultResult.data.map(doc =>
          db.collection('competition_results').doc(doc._id).remove()
        )
      );
    }

    await db.collection('competition_sub_groups')
      .where({ competition_id })
      .update({
        data: {
          bracket_generated: false,
          update_time: db.serverDate()
        }
      });

    await db.collection('competitions')
      .doc(competition_id)
      .update({
        data: {
          bracket_generated: false,
          brackets_generated: false,
          update_time: db.serverDate()
        }
      });

    return {
      success: true,
      message: '所有对战表已清空',
      data: {
        deleted_brackets: bracketResult.data.length,
        deleted_results: resultResult.data.length
      }
    };
  } catch (error) {
    console.error('一键清空对战表失败:', error);
    throw error;
  }
}
