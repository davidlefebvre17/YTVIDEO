# Wrapper d'execution `npm run generate -- --publish` pour le Planificateur
# de taches Windows (Task Scheduler).
#
# Usage manuel:
#   powershell -File scripts\run-generate.ps1
#   powershell -File scripts\run-generate.ps1 -Privacy unlisted
#   powershell -File scripts\run-generate.ps1 -Date 2026-05-04 -Privacy private
#
# Usage Task Scheduler: voir scripts\install-scheduled-task.ps1
#
# Notes Windows:
#  - npm est un .cmd sous Windows. Les splats (@args) avec PS 5.1 corrompent
#    le 1er argument ("Unknown command pm" au lieu de npm). On construit donc
#    la commande en chaine et on appelle via cmd.exe /c.
#  - .env est charge par dotenv cote Node, pas besoin de toucher au profil PS.

param(
    [string]$Privacy = "private",
    [string]$Date = "",
    [switch]$NoPublish
)

# Note: pas de "Stop" pour eviter que la stderr de npm fasse planter le wrapper.
$ErrorActionPreference = "Continue"

# Console UTF-8 (sinon les box-drawing chars du pipeline s'affichent en mojibake)
try {
    chcp 65001 *>$null
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    [Console]::InputEncoding = [System.Text.Encoding]::UTF8
} catch {}

# Repo = parent du dossier ou ce script est range.
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

# Dossier logs/
$LogDir = Join-Path $RepoRoot "logs"
if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir | Out-Null
}

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$LogFile = Join-Path $LogDir "generate-$Stamp.log"

# Header du log
"=== run-generate.ps1 START $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz') ===" | Out-File -FilePath $LogFile -Encoding utf8
"Repo: $RepoRoot" | Out-File -FilePath $LogFile -Encoding utf8 -Append
"User: $env:USERNAME on $env:COMPUTERNAME" | Out-File -FilePath $LogFile -Encoding utf8 -Append

try {
    $nodeVersion = (& node --version) 2>&1
    $npmVersion = (& npm --version) 2>&1
    "Node: $nodeVersion / npm: $npmVersion" | Out-File -FilePath $LogFile -Encoding utf8 -Append
} catch {
    "WARN: node/npm introuvable dans le PATH du compte" | Out-File -FilePath $LogFile -Encoding utf8 -Append
}

# Construction de la commande en chaine (evite le bug splat + .cmd sous PS 5.1)
$cmdLine = "npm run generate --"
if (-not $NoPublish) { $cmdLine += " --publish" }
if ($Privacy)        { $cmdLine += " --privacy $Privacy" }
if ($Date)           { $cmdLine += " --date $Date" }

"Cmd:  $cmdLine" | Out-File -FilePath $LogFile -Encoding utf8 -Append
"" | Out-File -FilePath $LogFile -Encoding utf8 -Append

# Heap node bumpe
$env:NODE_OPTIONS = "--max-old-space-size=8192"

# Run via cmd.exe /c pour bypass le parsing PowerShell des args sur .cmd files
$exitCode = 0
try {
    & cmd.exe /c $cmdLine 2>&1 | Tee-Object -FilePath $LogFile -Append
    $exitCode = $LASTEXITCODE
} catch {
    "FATAL: $($_.Exception.Message)" | Out-File -FilePath $LogFile -Encoding utf8 -Append
    $exitCode = 99
}

"" | Out-File -FilePath $LogFile -Encoding utf8 -Append
"=== run-generate.ps1 END $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz') exit=$exitCode ===" | Out-File -FilePath $LogFile -Encoding utf8 -Append

exit $exitCode
