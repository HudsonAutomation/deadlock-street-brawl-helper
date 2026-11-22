# Print one JSON object for the top-level window titled exactly Deadlock.
$ErrorActionPreference = 'Stop'
Add-Type @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public class DiaFind {
  public delegate bool EnumProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc lpEnumFunc, IntPtr lParam);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
  [DllImport("user32.dll")] public static extern int GetWindowLong(IntPtr hWnd, int nIndex);
  public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
}
"@
$found = $null
$proc = [DiaFind+EnumProc]{
  param($hWnd, $lParam)
  if (-not [DiaFind]::IsWindowVisible($hWnd)) { return $true }
  $sb = New-Object System.Text.StringBuilder 512
  [void][DiaFind]::GetWindowText($hWnd, $sb, $sb.Capacity)
  if ($sb.ToString() -ne 'Deadlock') { return $true }
  $rect = New-Object DiaFind+RECT
  [void][DiaFind]::GetWindowRect($hWnd, [ref]$rect)
  $style = [DiaFind]::GetWindowLong($hWnd, -16)
  $script:found = @{
    hwnd = [int64]$hWnd
    x = $rect.Left
    y = $rect.Top
    width = $rect.Right - $rect.Left
    height = $rect.Bottom - $rect.Top
    caption = (($style -band 0x00C00000) -ne 0)
  }
  return $false
}
[void][DiaFind]::EnumWindows($proc, [IntPtr]::Zero)
if ($null -eq $found) { '{}' } else { $found | ConvertTo-Json -Compress }
