$ErrorActionPreference = 'Stop'
$taskOwnerName = Read-Host 'Tên owner (tài khoản thật, không dùng SYNTHETIC)'
$taskOwnerEmail = Read-Host 'Email đăng nhập do owner kiểm soát'
$taskOwnerSecret = Read-Host 'Mật khẩu riêng của owner (ít nhất 12 ký tự gồm chữ và số, không hiện ra màn hình)' -AsSecureString
$taskOwnerPointer = [IntPtr]::Zero
try {
    $taskOwnerPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($taskOwnerSecret)
    $taskOwnerPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($taskOwnerPointer)
    $taskOwnerPayload = @{ fullName=$taskOwnerName; email=$taskOwnerEmail; password=$taskOwnerPassword } | ConvertTo-Json -Compress
    $OutputEncoding = [System.Text.UTF8Encoding]::new($false)
    $taskOwnerPayload | & node (Join-Path $PSScriptRoot 'provision-owner.cjs')
    if ($LASTEXITCODE -ne 0) { throw 'Provisioning bị chặn; không gửi mật khẩu qua chat hoặc logs.' }
} finally {
    if ($taskOwnerPointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($taskOwnerPointer) }
    $taskOwnerPassword = $null
    $taskOwnerPayload = $null
    $taskOwnerSecret.Dispose()
}
