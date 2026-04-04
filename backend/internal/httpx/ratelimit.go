package httpx

import (
	"context"
	"encoding/json"
	"net"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"golang.org/x/time/rate"
)

// disableRateLimit is evaluated once at startup.
var disableRateLimit = os.Getenv("DISABLE_RATE_LIMIT") == "true"

// RateLimitTier defines the rate and burst for a category of endpoints.
type RateLimitTier struct {
	Rate  rate.Limit
	Burst int
}

var tiers = map[string]RateLimitTier{
	"auth":     {Rate: rate.Every(time.Minute / 5), Burst: 5},
	"checkout": {Rate: rate.Every(time.Minute / 10), Burst: 10},
	"geo":      {Rate: rate.Every(time.Minute / 20), Burst: 20},
	"pickup":   {Rate: rate.Every(time.Minute / 5), Burst: 5},
	"webhook":  {Rate: rate.Every(time.Minute / 100), Burst: 100},
	"default":  {Rate: rate.Every(time.Minute / 60), Burst: 60},
}

type ipLimiter struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

type tierLimiters struct {
	mu       sync.Mutex
	limiters map[string]*ipLimiter
	tier     RateLimitTier
}

func newTierLimiters(ctx context.Context, tier RateLimitTier) *tierLimiters {
	tl := &tierLimiters{
		limiters: make(map[string]*ipLimiter),
		tier:     tier,
	}
	go tl.cleanup(ctx)
	return tl
}

func (tl *tierLimiters) get(ip string) *rate.Limiter {
	tl.mu.Lock()
	defer tl.mu.Unlock()

	entry, ok := tl.limiters[ip]
	if !ok {
		entry = &ipLimiter{
			limiter: rate.NewLimiter(tl.tier.Rate, tl.tier.Burst),
		}
		tl.limiters[ip] = entry
	}
	entry.lastSeen = time.Now()
	return entry.limiter
}

func (tl *tierLimiters) cleanup(ctx context.Context) {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			tl.mu.Lock()
			cutoff := time.Now().Add(-5 * time.Minute)
			for ip, entry := range tl.limiters {
				if entry.lastSeen.Before(cutoff) {
					delete(tl.limiters, ip)
				}
			}
			tl.mu.Unlock()
		case <-ctx.Done():
			return
		}
	}
}

var (
	tierMu       sync.Mutex
	tierInstances = map[string]*tierLimiters{}
)

func getTierLimiters(tierName string) *tierLimiters {
	tierMu.Lock()
	defer tierMu.Unlock()

	tl, ok := tierInstances[tierName]
	if !ok {
		tier, exists := tiers[tierName]
		if !exists {
			tier = tiers["default"]
		}
		tl = newTierLimiters(context.Background(), tier)
		tierInstances[tierName] = tl
	}
	return tl
}

// WithRateLimit wraps a handler with per-IP rate limiting for the given tier.
// Set DISABLE_RATE_LIMIT=true to skip all rate limiting (for E2E / local dev).
func WithRateLimit(tier string, next http.HandlerFunc) http.HandlerFunc {
	if disableRateLimit {
		return next
	}

	tl := getTierLimiters(tier)

	return func(w http.ResponseWriter, r *http.Request) {
		ip := clientIP(r)
		limiter := tl.get(ip)

		if !limiter.Allow() {
			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("Retry-After", strconv.Itoa(retryAfterSeconds(limiter)))
			w.WriteHeader(http.StatusTooManyRequests)
			_ = json.NewEncoder(w).Encode(map[string]string{
				"error": "rate limit exceeded",
			})
			return
		}

		next(w, r)
	}
}

func clientIP(r *http.Request) string {
	// Trust X-Forwarded-For when behind a reverse proxy.
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		// Take only the first address if there are multiples.
		for j := 0; j < len(xff); j++ {
			if xff[j] == ',' {
				return strings.TrimSpace(xff[:j])
			}
		}
		return strings.TrimSpace(xff)
	}

	if ip, _, err := net.SplitHostPort(r.RemoteAddr); err == nil {
		return ip
	}
	return r.RemoteAddr
}

func retryAfterSeconds(l *rate.Limiter) int {
	reservation := l.Reserve()
	delay := reservation.Delay()
	reservation.Cancel()
	seconds := int(delay.Seconds()) + 1
	if seconds < 1 {
		seconds = 1
	}
	return seconds
}
