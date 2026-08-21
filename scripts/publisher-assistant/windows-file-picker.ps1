param(
  [ValidateSet('video', 'image')]
  [string]$Kind = 'video'
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms

$dialog = New-Object System.Windows.Forms.OpenFileDialog
$dialog.Multiselect = $false
$dialog.CheckFileExists = $true
$dialog.CheckPathExists = $true
$dialog.RestoreDirectory = $true

if ($Kind -eq 'image') {
  $dialog.Title = '选择母版封面'
  $dialog.Filter = '图片文件 (*.png;*.jpg;*.jpeg;*.webp)|*.png;*.jpg;*.jpeg;*.webp|所有文件 (*.*)|*.*'
} else {
  $dialog.Title = '选择最终完整成片'
  $dialog.Filter = '视频文件 (*.mp4;*.mov;*.webm;*.mkv)|*.mp4;*.mov;*.webm;*.mkv|所有文件 (*.*)|*.*'
}

if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
  [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
  Write-Output $dialog.FileName
}

$dialog.Dispose()
