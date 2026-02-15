package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
	_ "time/tzdata"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/paretoimproved/local-roots/backend/internal/config"
	"github.com/paretoimproved/local-roots/backend/internal/db"
	"github.com/paretoimproved/local-roots/backend/internal/httpx"
)

func main() {
	cfg := config.FromEnv()

	var pool *pgxpool.Pool
	if cfg.DatabaseURL != "" {
		p, err := db.Connect(context.Background(), cfg.DatabaseURL)
		if err != nil {
			log.Fatalf("db connect: %v", err)
		}
		pool = p
		defer pool.Close()
	}

	srv := &http.Server{
		Addr:              cfg.Addr,
		Handler:           httpx.NewHandler(httpx.Deps{Config: cfg, DB: pool}),
		ReadHeaderTimeout: 5 * time.Second,
	}

	go func() {
		log.Printf("api listening on %s", cfg.Addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	log.Printf("shutting down")
	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("shutdown: %v", err)
	}
}
