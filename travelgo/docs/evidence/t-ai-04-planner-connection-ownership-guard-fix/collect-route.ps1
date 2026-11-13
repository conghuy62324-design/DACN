param([string]$OutputName='route-observation.json')
$ErrorActionPreference='Stop'
if ($OutputName -notmatch '^route-[a-z-]+\.json$') { throw 'INVALID_ROUTE_OUTPUT' }
$taskRoot=$PSScriptRoot
$target=Join-Path $taskRoot $OutputName
if (Test-Path -LiteralPath $target) { throw 'WRITE_ONCE_ROUTE' }
function DockerValue([string]$format) { $value=& docker inspect --format $format travelgo_postgres; if ($LASTEXITCODE -ne 0) { throw 'DOCKER_INSPECT_FAILED' }; return $value }
$ports=(DockerValue '{{json .NetworkSettings.Ports}}') | ConvertFrom-Json
$networks=(DockerValue '{{json .NetworkSettings.Networks}}') | ConvertFrom-Json
$containerId=DockerValue '{{.Id}}'
$running=(DockerValue '{{json .State.Running}}') | ConvertFrom-Json
$image=DockerValue '{{.Config.Image}}'
$listeners=@(Get-NetTCPConnection -LocalPort 5432 -State Listen | ForEach-Object {
 $owner=Get-CimInstance Win32_Process -Filter ('ProcessId = '+$_.OwningProcess)
 $signature=Get-AuthenticodeSignature -LiteralPath $owner.ExecutablePath
 [pscustomobject]@{address=$_.LocalAddress;port=$_.LocalPort;pid=$_.OwningProcess;path=$owner.ExecutablePath;commandLine=$owner.CommandLine;signatureStatus=[string]$signature.Status;signer=$signature.SignerCertificate.Subject}
})
$wsl=((& wsl.exe --list --verbose) -join "`n").Replace([string][char]0,'')
if ($LASTEXITCODE -ne 0) { throw 'WSL_INSPECT_FAILED' }
$result=[ordered]@{at=[DateTime]::UtcNow.ToString('o');source='INDEPENDENT_OS_AND_DOCKER_INSPECTION_NO_PG_CONNECTION';endpoint=@{host='127.0.0.1';port=5432};containerId=$containerId;running=$running;image=$image;ports=$ports;networks=$networks;listeners=$listeners;wsl=$wsl;databaseConnections=0}
$utf8=New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($target,($result|ConvertTo-Json -Depth 12)+"`n",$utf8)
Write-Output ('ROUTE_METADATA_WRITTEN '+$OutputName)
