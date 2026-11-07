$ErrorActionPreference = "Stop"
$root = [System.IO.Path]::GetFullPath($PSScriptRoot)
$rootPrefix = $root.TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
$address = "http://localhost:8000/"
$contentTypes = @{
  ".css" = "text/css; charset=utf-8"
  ".html" = "text/html; charset=utf-8"
  ".ico" = "image/x-icon"
  ".js" = "text/javascript; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".svg" = "image/svg+xml"
}
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add($address)

try {
  $listener.Start()
} catch {
  Write-Error "Could not start the local site server at $address. Close any other server using port 8000 and try again. $($_.Exception.Message)"
  exit 1
}

Write-Host "Site running at $address"
Write-Host "Keep this window open while you use the site. Press Ctrl+C to stop."
Start-Process $address

try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $response = $context.Response

    try {
      if ($context.Request.HttpMethod -notin @("GET", "HEAD")) {
        $response.StatusCode = 405
        $response.Headers.Add("Allow", "GET, HEAD")
        continue
      }

      $requestPath = [System.Uri]::UnescapeDataString($context.Request.Url.AbsolutePath.TrimStart("/"))
      if (-not $requestPath) {
        $requestPath = "index.html"
      }

      $filePath = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($root, $requestPath))
      if (
        -not $filePath.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase) -or
        -not [System.IO.File]::Exists($filePath)
      ) {
        $response.StatusCode = 404
        continue
      }

      $extension = [System.IO.Path]::GetExtension($filePath).ToLowerInvariant()
      if ($contentTypes.ContainsKey($extension)) {
        $response.ContentType = $contentTypes[$extension]
      } else {
        $response.ContentType = "application/octet-stream"
      }

      $bytes = [System.IO.File]::ReadAllBytes($filePath)
      $response.StatusCode = 200
      $response.ContentLength64 = $bytes.Length
      if ($context.Request.HttpMethod -eq "GET") {
        $response.OutputStream.Write($bytes, 0, $bytes.Length)
      }
    } catch {
      Write-Error "Could not serve a request. $($_.Exception.Message)"
      $response.StatusCode = 500
    } finally {
      $response.Close()
    }
  }
} finally {
  $listener.Stop()
  $listener.Close()
}
