const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const got = require('got')

exports.main = async (event, context) => {
  const { url } = event
  if (!url) return { success: false, msg: '缺少url参数' }
  try {
    let realUrl = url
    if (url.startsWith('cloud://')) {
      // 获取临时链接
      const res = await cloud.getTempFileURL({ fileList: [url] })
      if (!res.fileList[0].tempFileURL) return { success: false, msg: '获取临时链接失败' }
      realUrl = res.fileList[0].tempFileURL
    }
    // 下载图片为 buffer
    const imgRes = await got(realUrl, { responseType: 'buffer' })
    return {
      success: true,
      buffer: imgRes.body.toString('base64')
    }
  } catch (e) {
    return { success: false, msg: e.message }
  }
} 