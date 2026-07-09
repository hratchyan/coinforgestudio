# Downloads the AI background-removal assets:
#  - u2netp.onnx  (small U^2-Net portrait/salient-object model, ~4.6 MB, Apache-2.0, from the rembg project)
#  - onnxruntime-web runtime (ort.min.js + wasm binaries, MIT)
# All stored locally in app/vendor + app/assets/models so the app never needs the internet.
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$root = Split-Path -Parent $PSScriptRoot
$modelDir = Join-Path $root 'app\assets\models'
$vendorDir = Join-Path $root 'app\vendor'
New-Item -ItemType Directory -Force $modelDir, $vendorDir | Out-Null

try {
    Invoke-WebRequest -Uri 'https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2netp.onnx' -OutFile (Join-Path $modelDir 'u2netp.onnx') -UseBasicParsing
    Write-Host "OK model u2netp.onnx ($([math]::Round((Get-Item (Join-Path $modelDir 'u2netp.onnx')).Length/1mb,1)) MB)"
} catch { Write-Host "SKIP model: $($_.Exception.Message)" }

$ortVer = '1.19.2'
$files = @('ort.min.js', 'ort-wasm.wasm', 'ort-wasm-simd.wasm')
foreach ($f in $files) {
    try {
        Invoke-WebRequest -Uri "https://cdn.jsdelivr.net/npm/onnxruntime-web@$ortVer/dist/$f" -OutFile (Join-Path $vendorDir $f) -UseBasicParsing
        Write-Host "OK vendor $f"
    } catch { Write-Host "SKIP $f : $($_.Exception.Message)" }
}
Write-Host 'Done.'