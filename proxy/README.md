Proxy Service

Single-route high-performance proxy that authenticates to Xtream Codes and fetches data concurrently.

## Features

- **Retry Mechanism**: Automatically retries failed requests up to 3 times for 404 errors (rate limiting)
- **Exponential Backoff**: Uses progressive delays between retry attempts (2s, 4s, 6s)
- **Concurrent Data Fetching**: Fetches all categories and streams in parallel for optimal performance
- **Rate Limiting Protection**: Built-in handling for upstream rate limits with intelligent retry logic

Run locally

```
# Windows PowerShell
$env:PROXY_ADDR=":8081"
go run ./proxy

# or Linux/macOS
PROXY_ADDR=":8081" go run ./proxy
```

## Endpoints

### GET /get - Full Data Fetch
Authenticates and fetches all categories and streams (live, VOD, series):
```
GET /get?base_url=http://HOST:PORT&username=USER&password=PASS
```

### GET /test - Connection Test
Lightweight endpoint that only validates credentials (no data fetching):
```
GET /test?base_url=http://HOST:PORT&username=USER&password=PASS
```

### GET /health - Health Check
Simple health check endpoint:
```
GET /health
```

## Configuration

The proxy server supports the following environment variables:

- `PROXY_ADDR`: Server listen address (default: ":8081")
- Default retry settings: 3 attempts with 2-second base delay
- Exponential backoff for 404 errors (rate limiting): 2s, 4s, 6s delays

Docker

```
docker build -t syncstream-proxy:latest ./proxy
docker run -p 8081:8081 -e PROXY_ADDR=":8081" syncstream-proxy:latest
```

Release builds

Windows (PowerShell):
```
./proxy/scripts/build-all.ps1 -Version 1.0.0
```

Linux/macOS:
```
sh ./proxy/scripts/build-all.sh 1.0.0
```

Artifacts are placed in `proxy/dist/`.


