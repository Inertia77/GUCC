// 部署前修改这里。这个文件会被浏览器公开读取，只能放公开配置。
// 位置：Supabase Dashboard → Project Settings → API。
// 不要把 service_role key、database password 或 JWT secret 写进这个文件。
export const CONFIG = {
  SUPABASE_URL: "https://rubjeqnuxuvupjwyksmo.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1YmplcW51eHV2dXBqd3lrc21vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MTI3MzYsImV4cCI6MjA5NzE4ODczNn0.wkepivscs96lZAsG82LI0DF3Pvi2TDue6hwuYeQXIgU",
  EDGE_FUNCTION_NAME: "gameup-api"
};
