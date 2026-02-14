package v1

import (
	"testing"
	"time"
)

func TestNextStartAt_Weekly_CutoffMatters(t *testing.T) {
	loc := time.UTC
	first := time.Date(2026, 2, 14, 10, 0, 0, 0, time.UTC)

	t.Run("returns first when now is before cutoff", func(t *testing.T) {
		now := time.Date(2026, 2, 14, 7, 0, 0, 0, time.UTC) // cutoff is 08:00
		got := nextStartAt(now, first, "weekly", loc, 2)
		if !got.Equal(first) {
			t.Fatalf("got %s want %s", got.Format(time.RFC3339), first.Format(time.RFC3339))
		}
	})

	t.Run("skips to next cycle when cutoff has passed", func(t *testing.T) {
		now := time.Date(2026, 2, 14, 9, 0, 0, 0, time.UTC) // cutoff is 08:00 (passed)
		want := time.Date(2026, 2, 21, 10, 0, 0, 0, time.UTC)
		got := nextStartAt(now, first, "weekly", loc, 2)
		if !got.Equal(want) {
			t.Fatalf("got %s want %s", got.Format(time.RFC3339), want.Format(time.RFC3339))
		}
	})
}

func TestNextStartAt_Biweekly(t *testing.T) {
	loc := time.UTC
	first := time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)
	now := time.Date(2026, 1, 20, 0, 0, 0, 0, time.UTC)

	// With a 1-hour cutoff, the next eligible start is 2026-01-29T12:00Z.
	want := time.Date(2026, 1, 29, 12, 0, 0, 0, time.UTC)
	got := nextStartAt(now, first, "biweekly", loc, 1)
	if !got.Equal(want) {
		t.Fatalf("got %s want %s", got.Format(time.RFC3339), want.Format(time.RFC3339))
	}
}

func TestNextStartAt_Monthly_EndOfMonth(t *testing.T) {
	loc := time.UTC
	first := time.Date(2026, 1, 31, 10, 0, 0, 0, time.UTC)
	now := time.Date(2026, 2, 1, 0, 0, 0, 0, time.UTC)

	// Go's AddDate month math applies; Jan 31 + 1 month normalizes to March 3 (non-leap year).
	want := time.Date(2026, 3, 3, 10, 0, 0, 0, time.UTC)
	got := nextStartAt(now, first, "monthly", loc, 1)
	if !got.Equal(want) {
		t.Fatalf("got %s want %s", got.Format(time.RFC3339), want.Format(time.RFC3339))
	}
}
