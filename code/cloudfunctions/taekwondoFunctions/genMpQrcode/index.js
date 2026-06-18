// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

// 生成小程序码云函数入口函数
exports.main = async (event, context) => {
  try {
    const { page = 'pages/taekwondo/register/index', scene = 'register', width = 400 } = event;
    
    // 调用接口获取小程序码，这里可以自定义参数（如scene场景值）
    const result = await cloud.openapi.wxacode.getUnlimited({
      scene: scene,
      page: page,
      width: width,
      isHyaline: false,
      lineColor: { r: 26, g: 35, b: 126 }, // 二维码主色调，深蓝色(#1A237E)
      autoColor: false
    });
    
    // 将图片上传到云存储
    const timestamp = Date.now();
    const upload = await cloud.uploadFile({
      cloudPath: `qrcodes/${timestamp}.jpg`,
      fileContent: result.buffer,
    });
    
    return {
      success: true,
      fileID: upload.fileID
    };
  } catch (e) {
    console.error('生成小程序码失败', e);
    return {
      success: false,
      message: '生成小程序码失败',
      error: e
    };
  }
}; 