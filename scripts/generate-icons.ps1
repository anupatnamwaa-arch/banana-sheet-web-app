Add-Type -AssemblyName System.Drawing

function Resize-Image {
    param (
        [string]$InputPath,
        [string]$OutputPath,
        [int]$Width,
        [int]$Height
    )
    $srcImg = [System.Drawing.Image]::FromFile($InputPath)
    $destImg = New-Object System.Drawing.Bitmap($Width, $Height)
    $graphics = [System.Drawing.Graphics]::FromImage($destImg)
    
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    
    $graphics.DrawImage($srcImg, 0, 0, $Width, $Height)
    
    $destImg.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    $graphics.Dispose()
    $destImg.Dispose()
    $srcImg.Dispose()
}

$logoPath = "c:\Users\DELL\Downloads\Side Project\banana-sheet-web-app\logo.png"

Resize-Image -InputPath $logoPath -OutputPath "c:\Users\DELL\Downloads\Side Project\banana-sheet-web-app\public\icon-192.png" -Width 192 -Height 192
Resize-Image -InputPath $logoPath -OutputPath "c:\Users\DELL\Downloads\Side Project\banana-sheet-web-app\public\icon-512.png" -Width 512 -Height 512
Resize-Image -InputPath $logoPath -OutputPath "c:\Users\DELL\Downloads\Side Project\banana-sheet-web-app\public\apple-touch-icon.png" -Width 180 -Height 180

Write-Output "PWA Icons generated successfully!"
