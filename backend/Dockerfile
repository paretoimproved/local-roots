FROM golang:1.24-alpine AS build

WORKDIR /src

COPY go.mod ./
# go.sum will appear once dependencies are added; keep the layer stable.
COPY go.sum* ./

RUN go mod download || true

COPY . .

RUN go build -trimpath -ldflags="-s -w" -o /out/api ./cmd/api

FROM alpine:3.20

RUN adduser -D -H app
USER app

COPY --from=build /out/api /bin/api

EXPOSE 8080
ENV ADDR=:8080
ENV ENV=prod

CMD ["/bin/api"]
