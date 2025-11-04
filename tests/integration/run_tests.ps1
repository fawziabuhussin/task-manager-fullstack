# tests/integration/run_tests.ps1
# E2E: health -> signup -> mailbox -> verify -> login -> me -> create task -> list -> logout
# Usage: powershell -ExecutionPolicy Bypass -File tests/integration/run_tests.ps1
param(
  [string]$API = $(if ($env:API) { $env:API } else { "http://localhost:3000" }),
  [int]$TimeoutSec = 60,
  [int]$MailboxWaitSec = 90
)

$ErrorActionPreference = 'Stop'
Write-Host "Starting integration tests against $API"

function Wait-Healthy {
  param([string]$Url, [int]$Seconds)
  $deadline = (Get-Date).AddSeconds($Seconds)
  while ((Get-Date) -lt $deadline) {
    try {
      $resp = Invoke-RestMethod -Uri "$Url/health" -Method GET -UseBasicParsing -TimeoutSec 5
      if ($resp -and $resp.ok -eq $true) { return $true }
    } catch {}
    Start-Sleep -Milliseconds 500
  }
  throw "Server not healthy at $Url/health within $Seconds seconds"
}

function Get-CsrfFromSession {
  param($Session, [string]$BaseUrl)
  try {
    $cookies = $Session.Cookies.GetCookies($BaseUrl)
    foreach ($c in $cookies) {
      if ($c.Name -eq 'csrfToken') { return $c.Value }
    }
  } catch {}
  return $null
}

function Try-GetMailbox {
  param([Microsoft.PowerShell.Commands.WebRequestSession]$Session, [string]$BaseUrl, [string]$Email)
  $paths = @(
    "/api/dev/mailbox?to=$([uri]::EscapeDataString($Email))",
    "/dev/mailbox?to=$([uri]::EscapeDataString($Email))",
    "/api/dev/mailbox",
    "/dev/mailbox"
  )
  foreach ($p in $paths) {
    try {
      $u = "$BaseUrl$p"
      $r = Invoke-WebRequest -Uri $u -Method GET -WebSession $Session -UseBasicParsing -TimeoutSec 10
      if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 300) {
        return @{ Url = $u; Content = $r.Content }
      }
    } catch {}
  }
  return $null
}

function Extract-Code {
  param([string]$Html)
  if (-not $Html) { return $null }

  # Try JSON shape first (in case server returns JSON accidentally)
  try {
    $asJson = $Html | ConvertFrom-Json -ErrorAction Stop
    if ($asJson -is [System.Array]) {
      foreach ($x in $asJson) {
        foreach ($k in $x.PSObject.Properties.Name) {
          $v = [string]$x.$k
          if ($v -match '\b\d{6}\b') { return ($v -replace '.*?(\d{6}).*','$1') }
        }
      }
    } elseif ($asJson -ne $null) {
      foreach ($k in $asJson.PSObject.Properties.Name) {
        $v = [string]$asJson.$k
        if ($v -match '\b\d{6}\b') { return ($v -replace '.*?(\d{6}).*','$1') }
      }
    }
  } catch {}

  # HTML regex attempts
  $patterns = @(
    'Your code is:\s*([0-9]{6})',
    'Code:\s*([0-9]{6})',
    'data-code\s*=\s*["''](\d{6})["'']',
    '<td[^>]*>\s*([0-9]{6})\s*</td>',
    '\b([0-9]{6})\b'
  )
  foreach ($rx in $patterns) {
    $m = [regex]::Match($Html, $rx, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
    if ($m.Success) { return $m.Groups[1].Value }
  }
  return $null
}

# 0) Health
Wait-Healthy -Url $API -Seconds $TimeoutSec

# Session + pre-mint CSRF via GET
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
try { Invoke-WebRequest -Uri "$API/api/auth/me" -Method GET -WebSession $session -UseBasicParsing | Out-Null } catch {}

# unique email
$ts = [int](Get-Date -UFormat %s)
$email = "testuser+$ts@example.com"
$password = "password123"

Write-Host "[1/8] Signup $email"
$signupBody = @{ email = $email; password = $password } | ConvertTo-Json
$signup = Invoke-RestMethod -Uri "$API/api/auth/signup" -Method POST -ContentType 'application/json' -Body $signupBody -WebSession $session -UseBasicParsing
Write-Host "Signup: $($signup | ConvertTo-Json -Depth 5)"

# 2) Mailbox (retry up to $MailboxWaitSec)
Write-Host "[2/8] Fetch Dev Mailbox -> code"
$code = $null
$deadline = (Get-Date).AddSeconds($MailboxWaitSec)
do {
  $resp = Try-GetMailbox -Session $session -BaseUrl $API -Email $email
  if ($resp -ne $null) {
    $code = Extract-Code -Html $resp.Content
    if ($code) { Write-Host "Found code ($($resp.Url)): $code"; break }
  }
  Start-Sleep -Seconds 1
} until ((Get-Date) -ge $deadline)

if (-not $code) { throw "Could not find verification code in mailbox after ${MailboxWaitSec}s" }

# 3) Verify
Write-Host "[3/8] Verify"
$verifyBody = @{ email = $email; code = $code } | ConvertTo-Json
$verify = Invoke-RestMethod -Uri "$API/api/auth/verify" -Method POST -ContentType 'application/json' -Body $verifyBody -WebSession $session -UseBasicParsing
Write-Host "Verify: $($verify | ConvertTo-Json -Depth 5)"

# 4) Login
Write-Host "[4/8] Login"
$loginBody = @{ email = $email; password = $password } | ConvertTo-Json
$login = Invoke-RestMethod -Uri "$API/api/auth/login" -Method POST -ContentType 'application/json' -Body $loginBody -WebSession $session -UseBasicParsing -Headers @{ 'x-forwarded-for' = '127.0.0.1' }
Write-Host "Login: $($login | ConvertTo-Json -Depth 5)"

# Ensure CSRF cookie
$csrf = Get-CsrfFromSession -Session $session -BaseUrl $API
if (-not $csrf) {
  try { Invoke-WebRequest -Uri "$API/api/auth/me" -Method GET -WebSession $session -UseBasicParsing | Out-Null } catch {}
  $csrf = Get-CsrfFromSession -Session $session -BaseUrl $API
}
if (-not $csrf) { throw "CSRF token cookie not found" }
Write-Host "csrf: $csrf"

# 5) Me
Write-Host "[5/8] GET /api/auth/me"
$me = Invoke-RestMethod -Uri "$API/api/auth/me" -Method GET -WebSession $session -UseBasicParsing
Write-Host "Me: $($me | ConvertTo-Json -Depth 5)"

# 6) Create task
Write-Host "[6/8] Create task"
$taskBody = @{ title = "Integration Test Task $ts"; description = "Created by automated test" } | ConvertTo-Json
$task = Invoke-RestMethod -Uri "$API/api/tasks" -Method POST -ContentType 'application/json' -Body $taskBody -WebSession $session -UseBasicParsing -Headers @{ 'x-csrf-token' = $csrf }
Write-Host "Task created: $($task.id)"

# 7) List tasks
Write-Host "[7/8] List tasks"
$tasks = Invoke-RestMethod -Uri "$API/api/tasks" -Method GET -WebSession $session -UseBasicParsing
Write-Host "Total: $($tasks.total)"
if ($tasks.total -lt 1) { throw "Expected at least one task" }

# 8) Logout
Write-Host "[8/8] Logout"
Invoke-RestMethod -Uri "$API/api/auth/logout" -Method POST -WebSession $session -UseBasicParsing -Headers @{ 'x-csrf-token' = $csrf } | Out-Null

Write-Host "✅ Integration tests completed successfully."
exit 0
