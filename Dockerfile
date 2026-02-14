FROM golang:1.24-alpine AS build

WORKDIR /src

# Build the Go backend from the monorepo root.
COPY backend/go.mod ./
# go.sum will appear once dependencies are added; keep the layer stable.
COPY backend/go.sum* ./

RUN go mod download || true

COPY backend/. .

RUN go build -trimpath -ldflags="-s -w" -o /out/api ./cmd/api
RUN go build -trimpath -ldflags="-s -w" -o /out/migrate ./cmd/migrate
RUN go build -trimpath -ldflags="-s -w" -o /out/seed ./cmd/seed

FROM alpine:3.20

RUN adduser -D -H app
USER app

WORKDIR /app

COPY --from=build /out/api /bin/api
COPY --from=build /out/migrate /bin/migrate
COPY --from=build /out/seed /bin/seed
COPY --from=build /src/migrations ./migrations

EXPOSE 8080
ENV ADDR=:8080
ENV ENV=prod

CMD ["/bin/api"]

