/**
 * X浏览器书签同步 - 配置文件
 *
 * 使用说明：
 * 1. 开发环境：设置 ENV.isDevelopment = true
 * 2. 生产环境：设置 ENV.isDevelopment = false
 * 3. API地址会根据浏览器语言自动选择
 * 4. 用户可在弹窗的“自定义服务器”面板中覆盖 API 地址（存储优先级最高）
 */

// 自定义服务器在 storage.local 中的键（由 popup 设置面板读写）
const CUSTOM_API_URL_KEY = 'customApiUrl';

// 环境配置
const ENV = {
  // 开发模式开关：true=开发环境，false=生产环境
  isDevelopment: false,
  
  // 开发环境API地址
  development: {
    apiUrl: 'http://localhost:3000'
  },
  
  // 生产环境API地址（根据语言）
  production: {
    // 中文环境（zh-CN, zh-TW, zh-HK等）
    zh: 'https://www.xbext.com',
    
    // 英文及其他语言环境
    en: 'https://en.xbext.com',
    
    // 可以添加更多语言的专属服务器
    // ja: 'https://api.xbrowser.jp',  // 日语
    // ko: 'https://api.xbrowser.kr',  // 韩语
  }
};

/**
 * 获取默认API基础URL（不含自定义服务器覆盖）
 * @returns {string} API服务器地址
 */
function getApiBaseUrl() {
  // 使用兼容性 API
  const chromeAPI = typeof browserAPI !== 'undefined' ? browserAPI : (typeof browser !== 'undefined' ? browser : chrome);
  
  // 开发环境：使用本地测试服务器
  if (ENV.isDevelopment) {
    console.log('[环境] 开发模式 - API地址:', ENV.development.apiUrl);
    return ENV.development.apiUrl;
  }
  
  // 生产环境：根据浏览器语言选择API服务器
  const browserLanguage = chromeAPI.i18n.getUILanguage(); // 例如: "zh-CN", "en-US", "ja"
  console.log('[环境] 生产模式 - 浏览器语言:', browserLanguage);
  
  // 提取主语言代码（zh-CN -> zh）
  const primaryLanguage = browserLanguage.split('-')[0].toLowerCase();
  
  // 根据语言选择服务器
  let apiUrl;
  if (primaryLanguage === 'zh') {
    // 中文环境使用中国服务器
    apiUrl = ENV.production.zh;
  } else if (primaryLanguage === 'en') {
    // 英文环境使用国际服务器
    apiUrl = ENV.production.en;
  } else if (ENV.production[primaryLanguage]) {
    // 其他已配置的语言使用专属服务器
    apiUrl = ENV.production[primaryLanguage];
  } else {
    // 未配置的语言默认使用英文服务器
    apiUrl = ENV.production.en;
  }
  
  console.log('[环境] API地址:', apiUrl);
  return apiUrl;
}

/**
 * 规范化自定义服务器地址
 * 规则：协议可省略（默认补 https://），仅接受 http/https，
 * 返回 origin 形式（协议+主机+端口），忽略路径部分。
 * @param {string} raw 用户输入
 * @returns {string|null} 规范化地址，无效时返回 null
 */
function normalizeApiUrl(raw) {
  if (typeof raw !== 'string') return null;
  let value = raw.trim();
  if (!value) return null;
  // 已带协议时仅接受 http/https，其余（ftp: 等）直接拒绝
  const schemeMatch = value.match(/^([a-z][a-z0-9+.-]*):\/\//i);
  if (schemeMatch && !/^https?$/i.test(schemeMatch[1])) return null;
  if (!schemeMatch) {
    value = 'https://' + value;
  }
  try {
    const parsed = new URL(value);
    // localhost（含端口）或含点号的主机名才视为有效
    if (!parsed.hostname) return null;
    const host = parsed.hostname.toLowerCase();
    if (host !== 'localhost' && !host.includes('.') && !/^\d+\.\d+\.\d+\.\d+$/.test(host)) return null;
    return parsed.origin;
  } catch (error) {
    return null;
  }
}

/**
 * 读取用户配置的自定义服务器（未配置时返回 null）
 * @returns {Promise<string|null>}
 */
async function getCustomApiUrl() {
  const chromeAPI = typeof browserAPI !== 'undefined' ? browserAPI : (typeof browser !== 'undefined' ? browser : chrome);
  try {
    const result = await chromeAPI.storage.local.get(CUSTOM_API_URL_KEY);
    return normalizeApiUrl(result && result[CUSTOM_API_URL_KEY]) || null;
  } catch (error) {
    console.warn('读取自定义服务器配置失败:', error);
    return null;
  }
}

/**
 * 解析实际使用的 API 地址：自定义服务器优先，否则使用默认地址
 * @returns {Promise<string>}
 */
async function resolveApiBaseUrl() {
  const custom = await getCustomApiUrl();
  if (custom) {
    console.log('[环境] 自定义服务器 - API地址:', custom);
    return custom;
  }
  return getApiBaseUrl();
}

/**
 * 获取当前环境信息（用于调试）
 * @returns {object} 环境信息
 */
function getEnvironmentInfo() {
  const chromeAPI = typeof browserAPI !== 'undefined' ? browserAPI : (typeof browser !== 'undefined' ? browser : chrome);
  
  return {
    isDevelopment: ENV.isDevelopment,
    language: chromeAPI.i18n.getUILanguage(),
    apiUrl: getApiBaseUrl(),
    version: chromeAPI.runtime.getManifest().version
  };
}
