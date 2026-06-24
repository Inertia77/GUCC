// 部署前修改这里。这个文件会被浏览器公开读取，只能放公开配置。
// 位置：Supabase Dashboard → Project Settings → API。
// 不要把 service_role key、database password 或 JWT secret 写进这个文件。
export const CONFIG = {
  SUPABASE_URL: "https://YOUR_PROJECT_REF.supabase.co",
  SUPABASE_ANON_KEY: "YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY",
  EDGE_FUNCTION_NAME: "gameup-api"
};
