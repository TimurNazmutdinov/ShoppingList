# Рисует иконки приложения (знак «пакет с галочкой», «Янтарь») в assets\images без сторонних пакетов (System.Drawing).
# Запуск: powershell -ExecutionPolicy Bypass -File scripts\make-icons.ps1
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Set-Location (Split-Path $PSScriptRoot -Parent)
$out = 'assets\images'

# Точка сетки 120x120 -> пиксели: центр знака (60;58) попадает в центр картинки.
function P([double]$x, [double]$y, [double]$s, [double]$half) {
    [System.Drawing.PointF]::new([single]($half + ($x - 60) * $s), [single]($half + ($y - 58) * $s))
}
# Квадратичная кривая Безье -> кубическая.
function Quad($path, $p0, $c, $p1) {
    $c1 = [System.Drawing.PointF]::new([single]($p0.X + 2 / 3 * ($c.X - $p0.X)), [single]($p0.Y + 2 / 3 * ($c.Y - $p0.Y)))
    $c2 = [System.Drawing.PointF]::new([single]($p1.X + 2 / 3 * ($c.X - $p1.X)), [single]($p1.Y + 2 / 3 * ($c.Y - $p1.Y)))
    $path.AddBezier($p0, $c1, $c2, $p1)
}

function Body($s, $h) {
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddLine((P 27 40 $s $h), (P 93 40 $s $h))
    Quad $path (P 93 40 $s $h) (P 95 40 $s $h) (P 95.5 43 $s $h)
    $path.AddLine((P 95.5 43 $s $h), (P 90.5 94 $s $h))
    Quad $path (P 90.5 94 $s $h) (P 90 101 $s $h) (P 83 101 $s $h)
    $path.AddLine((P 83 101 $s $h), (P 37 101 $s $h))
    Quad $path (P 37 101 $s $h) (P 30 101 $s $h) (P 29.5 94 $s $h)
    $path.AddLine((P 29.5 94 $s $h), (P 24.5 43 $s $h))
    Quad $path (P 24.5 43 $s $h) (P 25 40 $s $h) (P 27 40 $s $h)
    $path.CloseFigure()
    $path
}

# Рисует знак на прозрачной картинке size x size. mode: 'color' или 'mono' (белый силуэт).
function Mark($size, $s, $mode, [double]$checkW = 9, $from = '#FFC83D', $to = '#F0702A') {
    $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = 'AntiAlias'
    $g.Clear([System.Drawing.Color]::Transparent)
    $h = $size / 2
    $body = Body $s $h
    $rect = $body.GetBounds()
    if ($mode -eq 'color') {
        $c1 = [System.Drawing.ColorTranslator]::FromHtml($from)
        $c2 = [System.Drawing.ColorTranslator]::FromHtml($to)
        $handleRect = [System.Drawing.RectangleF]::new($rect.X, [single]((P 0 12 $s $h).Y), $rect.Width, [single]($rect.Bottom - (P 0 12 $s $h).Y))
        $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($handleRect, $c1, $c2, 45.0)
    } else {
        $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    }
    # ручка
    $pen = New-Object System.Drawing.Pen($brush, [single](7 * $s))
    $pen.StartCap = 'Round'; $pen.EndCap = 'Round'
    $g.DrawBezier($pen, (P 45 47 $s $h), (P 45 12 $s $h), (P 75 12 $s $h), (P 75 47 $s $h))
    # корпус
    $g.FillPath($brush, $body)
    if ($mode -eq 'color') {
        # блик сверху: белый 45% -> 0 на верхней половине корпуса
        $g.SetClip($body)
        $top = (P 0 40 $s $h).Y; $bottom = (P 0 74 $s $h).Y
        $shine = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
            [System.Drawing.PointF]::new(0, $top), [System.Drawing.PointF]::new(0, $bottom),
            [System.Drawing.Color]::FromArgb(115, 255, 255, 255), [System.Drawing.Color]::FromArgb(0, 255, 255, 255))
        $g.FillRectangle($shine, [single]0, [single]$top, [single]$size, [single]($bottom - $top))
        $g.ResetClip()
    }
    # галочка вырезается (прозрачная)
    $g.CompositingMode = 'SourceCopy'
    $cut = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(0, 0, 0, 0), [single]($checkW * $s))
    $cut.StartCap = 'Round'; $cut.EndCap = 'Round'; $cut.LineJoin = 'Round'
    $g.DrawLines($cut, @((P 44 71 $s $h), (P 55.5 82.5 $s $h), (P 77 58 $s $h)))
    $g.Dispose()
    $bmp
}

# icon.png: непрозрачная, белый фон, без скруглений (систему скруглит сама)
$m = Mark 1024 7.0 'color'
$icon = New-Object System.Drawing.Bitmap(1024, 1024, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($icon)
$g.Clear([System.Drawing.Color]::White)
$g.DrawImage($m, 0, 0)
$g.Dispose()
$icon.Save((Join-Path $out 'icon.png'), [System.Drawing.Imaging.ImageFormat]::Png)

# adaptive-icon-foreground.png: прозрачный, знак внутри круга безопасной зоны (радиус 313 px)
(Mark 1024 5.2 'color').Save((Join-Path $out 'adaptive-icon-foreground.png'), [System.Drawing.Imaging.ImageFormat]::Png)
# adaptive-icon-monochrome.png: белый силуэт для тематических иконок Android 13+
(Mark 1024 5.2 'mono').Save((Join-Path $out 'adaptive-icon-monochrome.png'), [System.Drawing.Imaging.ImageFormat]::Png)
# notification-icon.png: 96x96 белый силуэт, галочка шире (крупнее зазор)
(Mark 96 0.82 'mono' 11).Save((Join-Path $out 'notification-icon.png'), [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host 'Icons ready: assets\images' -ForegroundColor Green

# Icons per accent colour (launcher icon follows the accent when "apply to everything" is on), 0.7.5.
# The brand accent (amber) uses the main icon; every other accent gets a foreground (the adaptive icon background is white)
# and a legacy icon with a white background; the mark gradient is accents.<key>.light.mark from src/theme/themes.json.
$themes = Get-Content 'src/theme/themes.json' -Raw -Encoding UTF8 | ConvertFrom-Json
$schemeDir = 'assets/icons/schemes'
New-Item -ItemType Directory -Force $schemeDir | Out-Null
# icons of the old colour profiles (before 0.7.5) are no longer used
Get-ChildItem $schemeDir -Filter 'ic_scheme_*' -ErrorAction SilentlyContinue | Remove-Item -Force
$png = [System.Drawing.Imaging.ImageFormat]::Png
foreach ($p in $themes.accents.PSObject.Properties) {
    $key = $p.Name
    if ($key -eq $themes.brandAccent) { continue }
    $m = $p.Value.light.mark
    (Mark 432 2.3 'color' 9 $m.from $m.to).Save((Join-Path $schemeDir "ic_accent_$($key)_fg.png"), $png)
    $legacy = New-Object System.Drawing.Bitmap(192, 192, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $lg = [System.Drawing.Graphics]::FromImage($legacy)
    $lg.Clear([System.Drawing.Color]::White)
    $lg.DrawImage((Mark 192 1.3 'color' 9 $m.from $m.to), 0, 0)
    $lg.Dispose()
    $legacy.Save((Join-Path $schemeDir "ic_accent_$($key)_legacy.png"), $png)
}

# Preview for visual check: design\icons-preview.png
$pv = New-Object System.Drawing.Bitmap(1100, 300, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($pv)
$g.SmoothingMode = 'AntiAlias'; $g.InterpolationMode = 'HighQualityBicubic'
$g.Clear([System.Drawing.ColorTranslator]::FromHtml('#BFD9E8'))
$img = [System.Drawing.Image]::FromFile((Resolve-Path (Join-Path $out 'icon.png')))
$g.DrawImage($img, 20, 20, 260, 260)
$fg = [System.Drawing.Image]::FromFile((Resolve-Path (Join-Path $out 'adaptive-icon-foreground.png')))
$g.FillEllipse([System.Drawing.Brushes]::White, 300, 20, 260, 260)
$g.DrawImage($fg, 300, 20, 260, 260)
$mono = [System.Drawing.Image]::FromFile((Resolve-Path (Join-Path $out 'adaptive-icon-monochrome.png')))
$g.FillEllipse((New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#FFEBB8'))), 580, 20, 260, 260)
$tint = New-Object System.Drawing.Imaging.ImageAttributes
$cm = New-Object System.Drawing.Imaging.ColorMatrix
$cm.Matrix00 = 0.42; $cm.Matrix11 = 0.23; $cm.Matrix22 = 0.02
$tint.SetColorMatrix($cm)
$g.DrawImage($mono, [System.Drawing.Rectangle]::new(580, 20, 260, 260), 0, 0, 1024, 1024, [System.Drawing.GraphicsUnit]::Pixel, $tint)
$g.FillRectangle((New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#2A2A30'))), 860, 20, 220, 260)
$nt = [System.Drawing.Image]::FromFile((Resolve-Path (Join-Path $out 'notification-icon.png')))
$g.DrawImage($nt, 880, 40, 96, 96)
$g.DrawImage($nt, 880, 160, 48, 48)
$g.Dispose()
New-Item -ItemType Directory -Force design | Out-Null
$pv.Save((Join-Path (Get-Location) 'design\icons-preview.png'), [System.Drawing.Imaging.ImageFormat]::Png)
