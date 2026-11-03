# PowerShell ANSI color codes
$Red = "`e[31m"      # Red for errors
$Green = "`e[32m"    # Green for success messages
$Yellow = "`e[33m"   # Yellow for warnings or process info
$Reset = "`e[0m"     # Reset color

# Display a banner
function Display-Banner {
    Write-Host "${Green}"
    Write-Host "############################################################"
    Write-Host "#                                                          #"
    Write-Host "#                       SITMUN setup                       #"
    Write-Host "#                                                          #"
    Write-Host "############################################################"
    Write-Host "${Reset}"
}

# Check if the current directory is a Git repository
function Check-GitRepository {
    Write-Host "${Yellow}Checking if the current directory is a Git repository...${Reset}"
    if (-Not (Test-Path ".git")) {
        Write-Host "${Red}Error: The current directory is not a Git repository.${Reset}"
        exit 1
    }
}

function Add-ComposeSecretIfMissing {
    param([string]$Key)
    $present = $false
    foreach ($line in Get-Content -Path ".env") {
        if ($line -like "$Key=*") {
            $present = $true
            break
        }
    }
    if (-not $present) {
        $bytes = New-Object byte[] 32
        $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
        try {
            $rng.GetBytes($bytes)
        } finally {
            $rng.Dispose()
        }
        $hex = -join ($bytes | ForEach-Object { $_.ToString("x2") })
        Add-Content -Path ".env" -Value "$Key=$hex"
    }
}

# Copy default development profile to .env if .env does not exist.
# Profile files do not store secrets. Generate any of the three that are absent.
function Copy-EnvFileIfMissing {
    if (-Not (Test-Path ".env")) {
        Write-Host "${Yellow}.env file is missing. Copying profiles/development-postgres.env to .env...${Reset}"
        Copy-Item -Path "profiles/development-postgres.env" -Destination ".env"
        Add-ComposeSecretIfMissing -Key "SITMUN_USER_SECRET"
        Add-ComposeSecretIfMissing -Key "MIDDLEWARE_SECRET"
        Add-ComposeSecretIfMissing -Key "SITMUN_MBTILES_JOB_HANDLE_SECRET"
        Write-Host "${Green}.env file created from profiles/development-postgres.env.${Reset}"
    }
}

# Main logic
Display-Banner
Check-GitRepository
Copy-EnvFileIfMissing
