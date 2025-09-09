FROM golang:1.22-alpine AS builder
WORKDIR /src
COPY . .
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags "-s -w" -o /out/proxy ./

FROM gcr.io/distroless/static-debian12
ENV PROXY_ADDR=:8081
COPY --from=builder /out/proxy /proxy
USER 65532:65532
EXPOSE 8081
ENTRYPOINT ["/proxy"]


