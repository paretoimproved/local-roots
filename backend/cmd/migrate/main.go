package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
)

func main() {
	if len(os.Args) < 2 {
		usage()
		os.Exit(2)
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatalf("DATABASE_URL is required")
	}

	cmd := os.Args[1]
	args := os.Args[2:]

	db, err := sql.Open("pgx", dbURL)
	if err != nil {
		log.Fatalf("open db: %v", err)
	}
	defer db.Close()

	if err := goose.SetDialect("postgres"); err != nil {
		log.Fatalf("goose dialect: %v", err)
	}

	dir := "migrations"
	switch cmd {
	case "up":
		err = goose.Up(db, dir)
	case "down":
		err = goose.Down(db, dir)
	case "status":
		err = goose.Status(db, dir)
	case "reset":
		err = goose.Reset(db, dir)
	case "version":
		err = goose.Version(db, dir)
	default:
		usage()
		os.Exit(2)
	}
	if err != nil {
		log.Fatalf("migrate %s: %v", cmd, err)
	}

	_ = args // reserved for future (e.g. up-to N)
}

func usage() {
	fmt.Fprintln(os.Stderr, "usage: go run ./cmd/migrate <up|down|status|reset|version>")
}

