# Generates build/icon.ico — a gold coin with a star — using System.Drawing.
# Multi-size ICO with PNG-compressed entries (256/128/64/48/32/16).
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $PSScriptRoot
$buildDir = Join-Path $root 'build'
New-Item -ItemType Directory -Force $buildDir | Out-Null

function Draw-CoinPng([int]$size) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = 'AntiAlias'
    $pad = [Math]::Max(1, $size * 0.03)
    $d = $size - 2 * $pad

    # base coin disc with radial-ish gradient
    $rect = New-Object System.Drawing.RectangleF($pad, $pad, $d, $d)
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddEllipse($rect)
    $pgb = New-Object System.Drawing.Drawing2D.PathGradientBrush($path)
    $pgb.CenterColor = [System.Drawing.Color]::FromArgb(255, 250, 227, 148)
    $pgb.SurroundColors = @([System.Drawing.Color]::FromArgb(255, 160, 118, 32))
    $pgb.CenterPoint = New-Object System.Drawing.PointF(($size * 0.38), ($size * 0.36))
    $g.FillEllipse($pgb, $rect)

    # rim
    $rimW = [Math]::Max(1, $size * 0.045)
    $rimPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 110, 79, 18), $rimW)
    $g.DrawEllipse($rimPen, $pad + $rimW/2, $pad + $rimW/2, $d - $rimW, $d - $rimW)

    # inner ring
    if ($size -ge 32) {
        $innerPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(200, 122, 88, 22), [Math]::Max(1, $size * 0.02))
        $inset = $size * 0.16
        $g.DrawEllipse($innerPen, $pad + $inset, $pad + $inset, $d - 2*$inset, $d - 2*$inset)
    }

    # eternity mark (pre-rendered glyph — build/eternity-glyph.png)
    $glyphPath = Join-Path (Split-Path -Parent $PSScriptRoot) 'build\eternity-glyph.png'
    if (Test-Path $glyphPath) {
        $glyph = [System.Drawing.Image]::FromFile($glyphPath)
        $gs = $size * 0.62
        $gx = ($size - $gs) / 2.0
        $g.DrawImage($glyph, [single]$gx, [single]$gx, [single]$gs, [single]$gs)
        $glyph.Dispose()
    }

    $g.Dispose()
    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Output -NoEnumerate ([byte[]]$ms.ToArray())
}

$sizes = @(256, 128, 64, 48, 32, 16)
$pngs = @()
foreach ($s in $sizes) { $pngs += ,(Draw-CoinPng $s) }

# assemble ICO (PNG payloads)
$count = $sizes.Count
$ms = New-Object System.IO.MemoryStream
$bw = New-Object System.IO.BinaryWriter($ms)
$bw.Write([UInt16]0); $bw.Write([UInt16]1); $bw.Write([UInt16]$count)
$offset = 6 + 16 * $count
for ($i = 0; $i -lt $count; $i++) {
    $s = $sizes[$i]
    $bw.Write([Byte]($(if ($s -ge 256) { 0 } else { $s })))
    $bw.Write([Byte]($(if ($s -ge 256) { 0 } else { $s })))
    $bw.Write([Byte]0); $bw.Write([Byte]0)
    $bw.Write([UInt16]1); $bw.Write([UInt16]32)
    $bw.Write([UInt32]$pngs[$i].Length)
    $bw.Write([UInt32]$offset)
    $offset += $pngs[$i].Length
}
foreach ($p in $pngs) { $bw.Write([byte[]]$p) }
$bw.Flush()
[IO.File]::WriteAllBytes((Join-Path $buildDir 'icon.ico'), $ms.ToArray())
# also a plain 256 png (useful for docs/readme)
[IO.File]::WriteAllBytes((Join-Path $buildDir 'icon-256.png'), $pngs[0])
Write-Host "icon.ico written ($([math]::Round(($ms.Length)/1kb)) KB)"