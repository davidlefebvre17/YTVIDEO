# Installe la tache Windows qui lance run-generate.ps1 quotidiennement,
# y compris quand le PC est en veille.
#
# A LANCER UNE FOIS depuis une console PowerShell EN ADMIN:
#   powershell -File scripts\install-scheduled-task.ps1
#
# === MODE PAR DEFAUT: Interactive (recommande) ===
#  - Pas besoin de mot de passe
#  - Fonctionne tant que ta session reste OUVERTE (meme verrouillee par veille)
#  - Le wake-from-sleep marche
#  - Si tu fais "Sign out" volontaire, la tache ne tournera pas (utilise -LoggedOff)
#
# Veille Windows = session ouverte + ecran verrouille = OK.
# Sign out / Reboot / Shutdown = session fermee = KO sans -LoggedOff.
#
# === MODE -LoggedOff (avance) ===
#  - Demande ton mot de passe Windows une fois
#  - Fonctionne meme apres sign out
#  - Echoue souvent avec les comptes Microsoft (Hello/PIN)
#  - Utilise SI tu fais reellement sign-out chaque soir
#
# Pour tester sans attendre 4h:
#   schtasks /Run /TN OwlStreetJournal-Generate
#
# Pour voir le statut:
#   Get-ScheduledTask OwlStreetJournal-Generate | Get-ScheduledTaskInfo
#
# Pour supprimer:
#   Unregister-ScheduledTask OwlStreetJournal-Generate -Confirm:$false

param(
    [string]$TaskName = "OwlStreetJournal-Generate",
    [string]$StartTime = "04:00",
    [string[]]$DaysOfWeek = @("Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"),
    [string]$Privacy = "unlisted",  # unlisted : permet le pinned comment auto (private bloque)
    [switch]$LoggedOff  # Si specifie, mode Password (run quand sign-out). Sinon Interactive.
)

$ErrorActionPreference = "Stop"

# ----- 1. Check admin -----
$currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
$isAdmin = (New-Object Security.Principal.WindowsPrincipal $currentUser).IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator
)
if (-not $isAdmin) {
    Write-Host ""
    Write-Host "ERREUR: ce script doit etre lance EN ADMIN."
    Write-Host ""
    Write-Host "Pour configurer une tache qui reveille le PC depuis la veille,"
    Write-Host "Windows exige des privileges admin pour la creation."
    Write-Host ""
    Write-Host "Solution :"
    Write-Host "  1. Ferme cette console."
    Write-Host "  2. Cherche 'PowerShell' dans le menu Demarrer."
    Write-Host "  3. Clic droit -> 'Executer en tant qu'administrateur'."
    Write-Host "  4. cd `"$PWD`""
    Write-Host "  5. Relance ce script."
    Write-Host ""
    exit 1
}

# ----- 2. Resolve paths -----
$RepoRoot = Split-Path -Parent $PSScriptRoot
$WrapperScript = Join-Path $RepoRoot "scripts\run-generate.ps1"

if (-not (Test-Path $WrapperScript)) {
    Write-Error "Wrapper introuvable: $WrapperScript"
    exit 1
}

$pwshCmd = Get-Command pwsh -ErrorAction SilentlyContinue
if ($pwshCmd) {
    $PwshExe = $pwshCmd.Source
} else {
    $PwshExe = (Get-Command powershell.exe).Source
    Write-Warning "PowerShell 7 (pwsh) introuvable - fallback sur powershell.exe (PS 5.1)."
}

$User = "$env:USERDOMAIN\$env:USERNAME"

$mode = if ($LoggedOff) { "Password (run apres sign-out)" } else { "Interactive (session ouverte requise)" }

Write-Host "-----------------------------------------"
Write-Host "Tache planifiee : $TaskName"
Write-Host "Heure de start  : $StartTime"
Write-Host "Jours           : $($DaysOfWeek -join ', ')"
Write-Host "Privacy         : $Privacy"
Write-Host "Compte          : $User"
Write-Host "Exec            : $PwshExe"
Write-Host "Wrapper         : $WrapperScript"
Write-Host "Mode            : $mode"
Write-Host "Wake from sleep : YES"
Write-Host "-----------------------------------------"
Write-Host ""

# ----- 3. (LoggedOff only) Ask for Windows password -----
$plainPassword = $null
if ($LoggedOff) {
    Write-Host "MODE LoggedOff - Mot de passe Windows requis."
    Write-Host "Si compte Microsoft : utilise ton vrai mdp Microsoft (pas le PIN)."
    Write-Host "Si l'erreur 'mot de passe incorrect' persiste, retire -LoggedOff"
    Write-Host "et compte sur la session verrouillee a la place."
    Write-Host ""
    $cred = Get-Credential -UserName $User -Message "Mot de passe Windows pour $User"
    if (-not $cred) {
        Write-Error "Annule par l'utilisateur."
        exit 1
    }
    $plainPassword = $cred.GetNetworkCredential().Password
}

# ----- 4. Idempotent: remove existing task -----
$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "Tache existante - suppression..."
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

# ----- 5. Build task components -----

$action = New-ScheduledTaskAction `
    -Execute $PwshExe `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$WrapperScript`" -Privacy $Privacy" `
    -WorkingDirectory $RepoRoot

$trigger = New-ScheduledTaskTrigger `
    -Weekly `
    -DaysOfWeek $DaysOfWeek `
    -At $StartTime

$settings = New-ScheduledTaskSettingsSet `
    -WakeToRun `
    -StartWhenAvailable `
    -DontStopIfGoingOnBatteries `
    -AllowStartIfOnBatteries `
    -ExecutionTimeLimit (New-TimeSpan -Hours 2) `
    -RestartCount 2 `
    -RestartInterval (New-TimeSpan -Minutes 30) `
    -MultipleInstances IgnoreNew

# ----- 6. Register the task -----
Write-Host ""
Write-Host "Creation de la tache..."

try {
    if ($LoggedOff) {
        # Mode Password: registers with stored credentials
        Register-ScheduledTask `
            -TaskName $TaskName `
            -Action $action `
            -Trigger $trigger `
            -Settings $settings `
            -User $User `
            -Password $plainPassword `
            -Force | Out-Null
    } else {
        # Mode Interactive: principal explicit, pas de password
        $principal = New-ScheduledTaskPrincipal `
            -UserId $User `
            -LogonType Interactive `
            -RunLevel Limited

        Register-ScheduledTask `
            -TaskName $TaskName `
            -Action $action `
            -Trigger $trigger `
            -Settings $settings `
            -Principal $principal `
            -Force | Out-Null
    }
} catch {
    Write-Host ""
    Write-Host "ECHEC Register-ScheduledTask:"
    Write-Host "  $($_.Exception.Message)"
    Write-Host ""
    if ($LoggedOff) {
        Write-Host "Probable cause : mot de passe Microsoft refuse par Windows."
        Write-Host "Solution simple : retire -LoggedOff de la commande."
        Write-Host "  powershell -File scripts\install-scheduled-task.ps1"
        Write-Host "Ca marche tant que tu ne fais pas Sign Out (juste sleep/lock OK)."
    }
    exit 1
} finally {
    if ($plainPassword) {
        $plainPassword = $null
        [System.GC]::Collect()
    }
}

# ----- 7. Activate Wake Timers in Power Options -----
Write-Host "Activation des Wake Timers (sur secteur ET sur batterie)..."
try {
    powercfg /setacvalueindex SCHEME_CURRENT SUB_SLEEP RTCWAKE 1 | Out-Null
    powercfg /setdcvalueindex SCHEME_CURRENT SUB_SLEEP RTCWAKE 1 | Out-Null
    powercfg /setactive SCHEME_CURRENT | Out-Null
    Write-Host "  OK - Wake Timers actives sur le power plan courant."
} catch {
    Write-Warning "powercfg a echoue: $($_.Exception.Message)"
    Write-Host "  Fais-le a la main: Panneau de config > Options d'alimentation"
    Write-Host "  > Modifier les parametres avances > Veille > Autoriser les minuteurs"
}

Write-Host ""
Write-Host "OK - Tache creee avec succes."
Write-Host ""
Write-Host "Verifications recommandees:"
Write-Host ""
Write-Host "  1. Test immediat (sans attendre 4h):"
Write-Host "     schtasks /Run /TN $TaskName"
Write-Host ""
Write-Host "  2. Voir le statut:"
Write-Host "     Get-ScheduledTask $TaskName | Get-ScheduledTaskInfo"
Write-Host ""
Write-Host "  3. Voir le dernier log:"
Write-Host "     Get-Content (Get-ChildItem `"$RepoRoot\logs\generate-*.log`" | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName -Tail 50"
Write-Host ""
if ($LoggedOff) {
    Write-Host "Mode Password actif: la tache tournera meme apres sign-out."
} else {
    Write-Host "Mode Interactive actif:"
    Write-Host "  - Veille / verrouillage = OK, la tache tournera"
    Write-Host "  - Sign out volontaire = KO, relance avec -LoggedOff dans ce cas"
}
Write-Host ""
Write-Host "Notes wake-from-sleep:"
Write-Host "  - BIOS doit autoriser 'Wake on Timer' (souvent OK par defaut)"
Write-Host "  - Sur laptop: branche le PC la nuit pour fiabilite"
Write-Host ""
Write-Host "Pour supprimer:"
Write-Host "  Unregister-ScheduledTask $TaskName -Confirm:`$false"
