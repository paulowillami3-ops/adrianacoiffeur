$port = 3001
$processes = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($processes) { 
    foreach($p in $processes) {
        Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
        Write-Host "Killed process $p on port $port"
    }
} else {
    Write-Host "No process found on port $port"
}
Write-Host "Starting server..."
node server/index.js
