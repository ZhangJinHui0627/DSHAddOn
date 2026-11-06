param(
  [string]$Apk = "dsh-go-arm64.apk",
  [int]$Minutes = 30
)

# Watches for an adb device and installs the DSH Go APK as soon as one appears.
# Resolves the APK relative to this script, so the folder can be moved freely.

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$apkPath = if ([System.IO.Path]::IsPathRooted($Apk)) { $Apk } else { Join-Path $here $Apk }

if (-not (Test-Path -LiteralPath $apkPath)) {
  Write-Output "APK not found: $apkPath"
  Write-Output "Pass -Apk <path> or place the APK next to this script."
  exit 1
}

$deadline = (Get-Date).AddMinutes($Minutes)
Write-Output "DSH_GO_ADB_WATCHER_READY deadline=$($deadline.ToString('o'))"

while ((Get-Date) -lt $deadline) {
  $devs = @(adb devices 2>$null | Select-Object -Skip 1 | Where-Object { $_ -match '\sdevice\s*$' })
  if ($devs.Count -gt 0) {
    Write-Output "DEVICE_FOUND $($devs[0])"
    adb install -r $apkPath 2>&1 | ForEach-Object { Write-Output "ADB> $_" }
    Write-Output "INSTALL_EXIT=$LASTEXITCODE"
    Write-Output "PACKAGES:"
    adb shell pm list packages 2>&1 | Select-String -Pattern "dsh" | ForEach-Object { Write-Output "PKG> $_" }
    break
  }
  Start-Sleep -Seconds 5
}

Write-Output "DSH_GO_ADB_WATCHER_DONE"
