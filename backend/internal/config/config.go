package config

import "os"

type Config struct {
	Addr string
	Env  string
}

func FromEnv() Config {
	addr := os.Getenv("ADDR")
	if addr == "" {
		addr = ":8080"
	}
	env := os.Getenv("ENV")
	if env == "" {
		env = "dev"
	}
	return Config{Addr: addr, Env: env}
}
