import { CONFIG } from './config.js';

export function getConfigState() {
  const issues = [];
  let url = '';

  try {
    const parsed = new URL(CONFIG.SUPABASE_URL);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
    url = parsed.origin;
    if (CONFIG.SUPABASE_URL.includes('YOUR_')) {
      issues.push('SUPABASE_URL 尚未配置');
    }
  } catch {
    issues.push('SUPABASE_URL 不是有效的 HTTP(S) 地址');
  }

  if (!CONFIG.SUPABASE_ANON_KEY || CONFIG.SUPABASE_ANON_KEY.includes('YOUR_')) {
    issues.push('SUPABASE_ANON_KEY 尚未配置');
  }
  if (!CONFIG.EDGE_FUNCTION_NAME?.trim()) {
    issues.push('EDGE_FUNCTION_NAME 不能为空');
  }

  return {
    ready: issues.length === 0,
    issues,
    publicConfig: {
      SUPABASE_URL: url || CONFIG.SUPABASE_URL,
      EDGE_FUNCTION_NAME: CONFIG.EDGE_FUNCTION_NAME,
      ANON_KEY_SET: Boolean(CONFIG.SUPABASE_ANON_KEY && !CONFIG.SUPABASE_ANON_KEY.includes('YOUR_'))
    }
  };
}

export function assertConfigured() {
  const state = getConfigState();
  if (!state.ready) {
    throw new Error(`前端配置未完成：${state.issues.join('；')}`);
  }
  return state;
}
