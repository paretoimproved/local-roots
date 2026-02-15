package httpx

import (
	"log"
	"net/http"
	"time"
)

type statusWriter struct {
	http.ResponseWriter
	status int
	bytes  int
}

func (w *statusWriter) WriteHeader(code int) {
	w.status = code
	w.ResponseWriter.WriteHeader(code)
}

func (w *statusWriter) Write(p []byte) (int, error) {
	if w.status == 0 {
		w.status = http.StatusOK
	}
	n, err := w.ResponseWriter.Write(p)
	w.bytes += n
	return n, err
}

func withLogging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Keep noise low.
		if r.URL.Path == "/health" {
			next.ServeHTTP(w, r)
			return
		}

		start := time.Now()
		sw := &statusWriter{ResponseWriter: w}
		next.ServeHTTP(sw, r)
		dur := time.Since(start)

		// Railway adds this header when present; useful for correlating edge logs.
		reqID := r.Header.Get("X-Railway-Request-Id")
		if reqID == "" {
			reqID = r.Header.Get("X-Request-Id")
		}

		if reqID != "" {
			log.Printf("%s %s -> %d (%dB) %s rid=%s", r.Method, r.URL.Path, sw.status, sw.bytes, dur, reqID)
		} else {
			log.Printf("%s %s -> %d (%dB) %s", r.Method, r.URL.Path, sw.status, sw.bytes, dur)
		}
	})
}

