# Windows.Media.Ocr helper. One crop at a time.
# stdin:  <id> <width> <height> <base64 rgba>
# stdout: {"id":"...","text":"...","ms":1.2}

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Storage.Streams.DataWriter, Windows.Storage.Streams, ContentType = WindowsRuntime]
$null = [Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics.Imaging, ContentType = WindowsRuntime]
$null = [Windows.Media.Ocr.OcrEngine, Windows.Media.Ocr, ContentType = WindowsRuntime]

$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
if ($null -eq $engine) {
  [Console]::Error.WriteLine('ocr engine missing')
  exit 2
}

function Await($op) {
  $task = [System.WindowsRuntimeSystemExtensions]::AsTask($op)
  $task.Wait()
  return $task.Result
}

while ($true) {
  $line = [Console]::In.ReadLine()
  if ($null -eq $line) { break }
  $parts = $line.Split(' ', 4)
  if ($parts.Length -lt 4) { continue }
  $id = $parts[0]
  $w = [int]$parts[1]
  $h = [int]$parts[2]
  $sw = [Diagnostics.Stopwatch]::StartNew()
  try {
    $bytes = [Convert]::FromBase64String($parts[3])
    $stream = New-Object System.IO.MemoryStream(,$bytes)
    # The page sends raw RGBA. Wrap it as a BMP the decoder accepts.
    $bmp = New-Object System.IO.MemoryStream
    $bw = New-Object System.IO.BinaryWriter($bmp)
    $pixelBytes = $w * $h * 4
    $fileSize = 54 + $pixelBytes
    $bw.Write([byte[]](0x42, 0x4D))
    $bw.Write([int]$fileSize)
    $bw.Write([int]0)
    $bw.Write([int]54)
    $bw.Write([int]40)
    $bw.Write([int]$w)
    $bw.Write([int](-$h))
    $bw.Write([int16]1)
    $bw.Write([int16]32)
    $bw.Write([int]0)
    $bw.Write([int]$pixelBytes)
    $bw.Write([int]2835)
    $bw.Write([int]2835)
    $bw.Write([int]0)
    $bw.Write([int]0)
    $bw.Write($bytes)
    $bw.Flush()
    $bmp.Position = 0
    $ras = [Windows.Storage.Streams.InMemoryRandomAccessStream]::new()
    $writer = New-Object Windows.Storage.Streams.DataWriter($ras)
    $writer.WriteBytes($bmp.ToArray())
    Await ($writer.StoreAsync()) | Out-Null
    $ras.Seek(0)
    $decoder = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($ras))
    $bitmap = Await ($decoder.GetSoftwareBitmapAsync())
    $result = Await ($engine.RecognizeAsync($bitmap))
    $text = $result.Text
    $sw.Stop()
    $obj = @{ id = $id; text = $text; ms = [math]::Round($sw.Elapsed.TotalMilliseconds, 1) }
    [Console]::Out.WriteLine(($obj | ConvertTo-Json -Compress))
    [Console]::Out.Flush()
  } catch {
    $sw.Stop()
    $obj = @{ id = $id; text = ''; ms = [math]::Round($sw.Elapsed.TotalMilliseconds, 1); error = $_.Exception.Message }
    [Console]::Out.WriteLine(($obj | ConvertTo-Json -Compress))
    [Console]::Out.Flush()
  }
}
