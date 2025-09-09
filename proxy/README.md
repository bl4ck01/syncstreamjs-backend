Proxy Service

Single-route high-performance proxy that authenticates to Xtream Codes and fetches data concurrently.

Run locally

```
# Windows PowerShell
$env:PROXY_ADDR=":8081"
go run ./proxy

# or Linux/macOS
PROXY_ADDR=":8081" go run ./proxy
```

Request example:
```
GET /proxy?base_url=http://HOST:PORT&username=USER&password=PASS
```

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


