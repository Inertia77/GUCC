# Fill these public/test values before running.
$ProjectUrl = "https://YOUR_PROJECT_REF.supabase.co"
$AnonKey = "YOUR_ANON_OR_PUBLISHABLE_KEY"
$AccessToken = "YOUR_USER_ACCESS_TOKEN"

$headers = @{
  apikey = $AnonKey
  Authorization = "Bearer $AccessToken"
}

$body = @{
  action = "ping"
  payload = @{}
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri "$ProjectUrl/functions/v1/gameup-api" `
  -ContentType "application/json" `
  -Headers $headers `
  -Body $body
