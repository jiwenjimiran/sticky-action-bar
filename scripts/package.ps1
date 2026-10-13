param([switch]$NoRestore)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$project = Join-Path $root 'src/StickyActionBar/StickyActionBar.csproj'
$manifest = Get-Content (Join-Path $root 'src/StickyActionBar/extension.json') -Raw | ConvertFrom-Json
$artifacts = Join-Path $root 'artifacts'
$stage = Join-Path $artifacts ([Guid]::NewGuid().ToString('N'))
$zip = Join-Path $artifacts "io.github.jiwenjimiran.sticky-action-bar-$($manifest.version).zip"
$arguments = @('publish', $project, '-c', 'Release', '-o', $stage)
if ($NoRestore) { $arguments += '--no-restore' }
& dotnet @arguments
if ($LASTEXITCODE -ne 0) { throw 'Extension publish failed.' }
# Only the extension and its static assets belong in the archive; Cove provides its contracts.
$allowed = @('Cove.StickyActionBar.dll', 'Cove.StickyActionBar.deps.json', 'Cove.StickyActionBar.runtimeconfig.json', 'extension.json', 'assets')
$unexpected = Get-ChildItem -LiteralPath $stage | Where-Object { $_.Name -notin $allowed -and $_.Extension -ne '.pdb' }
if ($unexpected) { throw "Unexpected publish files: $($unexpected.Name -join ', ')" }
$files = $allowed | ForEach-Object { Join-Path $stage $_ }
foreach ($file in $files) { if (!(Test-Path -LiteralPath $file)) { throw "Missing package file: $file" } }
# Explicit forward-slash ZIP paths also install correctly on Linux and macOS.
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$buffer = New-Object System.IO.MemoryStream
$archive = [IO.Compression.ZipArchive]::new($buffer, [IO.Compression.ZipArchiveMode]::Create, $true)
try {
    foreach ($file in $files) {
        foreach ($item in Get-ChildItem -LiteralPath $file -File -Recurse) {
            $entry = $item.FullName.Substring($stage.Length + 1).Replace('\', '/')
            [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $item.FullName, $entry, [IO.Compression.CompressionLevel]::Optimal) | Out-Null
        }
    }
} finally { $archive.Dispose() }
try { [IO.File]::WriteAllBytes($zip, $buffer.ToArray()) } finally { $buffer.Dispose() }
Get-FileHash -LiteralPath $zip -Algorithm SHA256
Write-Output "Package: $zip"
