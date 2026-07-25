param(
  [string]$OutputDirectory = (Join-Path $PSScriptRoot "..\assets\icons")
)

Add-Type -AssemblyName System.Drawing

function New-RoundedRectanglePath {
  param(
    [System.Drawing.RectangleF]$Rectangle,
    [float]$Radius
  )

  $diameter = $Radius * 2
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $path.AddArc($Rectangle.X, $Rectangle.Y, $diameter, $diameter, 180, 90)
  $path.AddArc($Rectangle.Right - $diameter, $Rectangle.Y, $diameter, $diameter, 270, 90)
  $path.AddArc($Rectangle.Right - $diameter, $Rectangle.Bottom - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($Rectangle.X, $Rectangle.Bottom - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()
  return $path
}

function New-GuccPwaIcon {
  param(
    [int]$Size,
    [string]$OutputPath,
    [switch]$Maskable
  )

  $bitmap = [System.Drawing.Bitmap]::new($Size, $Size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml("#070a10"))

  $outerMargin = if ($Maskable) { [float]($Size * 0.13) } else { [float]($Size * 0.055) }
  $outerRect = [System.Drawing.RectangleF]::new(
    $outerMargin,
    $outerMargin,
    $Size - ($outerMargin * 2),
    $Size - ($outerMargin * 2)
  )
  $outerPath = New-RoundedRectanglePath -Rectangle $outerRect -Radius ($Size * 0.22)
  $gradient = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
    $outerRect,
    [System.Drawing.ColorTranslator]::FromHtml("#172033"),
    [System.Drawing.ColorTranslator]::FromHtml("#050812"),
    45
  )
  $graphics.FillPath($gradient, $outerPath)

  $borderPen = [System.Drawing.Pen]::new(
    [System.Drawing.ColorTranslator]::FromHtml("#38516f"),
    [Math]::Max(2, $Size * 0.012)
  )
  $graphics.DrawPath($borderPen, $outerPath)

  $font = [System.Drawing.Font]::new(
    "Segoe UI",
    $Size * $(if ($Maskable) { 0.47 } else { 0.52 }),
    [System.Drawing.FontStyle]::Bold,
    [System.Drawing.GraphicsUnit]::Pixel
  )
  $format = [System.Drawing.StringFormat]::new()
  $format.Alignment = [System.Drawing.StringAlignment]::Center
  $format.LineAlignment = [System.Drawing.StringAlignment]::Center
  $letterBrush = [System.Drawing.SolidBrush]::new(
    [System.Drawing.ColorTranslator]::FromHtml("#eef6ff")
  )
  $letterRect = [System.Drawing.RectangleF]::new(0, -$Size * 0.01, $Size, $Size)
  $graphics.DrawString("G", $font, $letterBrush, $letterRect, $format)

  $points = [System.Drawing.PointF[]]@(
    [System.Drawing.PointF]::new($Size * 0.58, $Size * 0.18),
    [System.Drawing.PointF]::new($Size * 0.35, $Size * 0.53),
    [System.Drawing.PointF]::new($Size * 0.49, $Size * 0.53),
    [System.Drawing.PointF]::new($Size * 0.42, $Size * 0.82),
    [System.Drawing.PointF]::new($Size * 0.69, $Size * 0.43),
    [System.Drawing.PointF]::new($Size * 0.53, $Size * 0.43)
  )
  $boltBounds = [System.Drawing.RectangleF]::new(
    $Size * 0.34,
    $Size * 0.18,
    $Size * 0.36,
    $Size * 0.64
  )
  $boltBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
    $boltBounds,
    [System.Drawing.ColorTranslator]::FromHtml("#9da9ff"),
    [System.Drawing.ColorTranslator]::FromHtml("#78ffba"),
    125
  )
  $graphics.FillPolygon($boltBrush, $points)

  $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)

  $boltBrush.Dispose()
  $letterBrush.Dispose()
  $format.Dispose()
  $font.Dispose()
  $borderPen.Dispose()
  $gradient.Dispose()
  $outerPath.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}

New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
New-GuccPwaIcon -Size 192 -OutputPath (Join-Path $OutputDirectory "gucc-icon-192.png")
New-GuccPwaIcon -Size 512 -OutputPath (Join-Path $OutputDirectory "gucc-icon-512.png")
New-GuccPwaIcon -Size 512 -OutputPath (Join-Path $OutputDirectory "gucc-icon-maskable-512.png") -Maskable

Write-Host "Generated GUCC PWA icons in $OutputDirectory"
