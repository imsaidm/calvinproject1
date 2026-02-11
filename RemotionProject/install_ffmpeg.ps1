$ffmpegUrl = "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"
$zipPath = "ffmpeg.zip"
$destPath = "ffmpeg_extracted"

Write-Host "Downloading FFMPEG from $ffmpegUrl..."
Invoke-WebRequest -Uri $ffmpegUrl -OutFile $zipPath

Write-Host "Extracting..."
Expand-Archive -Path $zipPath -DestinationPath $destPath -Force

$binPath = Get-ChildItem -Path $destPath -Recurse -Filter "ffmpeg.exe" | Select-Object -ExpandProperty FullName
Write-Host "FFMPEG found at: $binPath"

# Move to a simpler location
Move-Item -Path $binPath -Destination "ffmpeg.exe" -Force

# Cleanup
Remove-Item $zipPath -Force
Remove-Item $destPath -Recurse -Force

Write-Host "Done. ffmpeg.exe is in the root."
