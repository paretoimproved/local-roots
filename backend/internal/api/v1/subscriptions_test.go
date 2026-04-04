package v1

import (
	"testing"
	"time"
)

func TestAddCadence(t *testing.T) {
	loc := time.UTC

	t.Run("weekly adds 7 days", func(t *testing.T) {
		start := time.Date(2026, 2, 14, 10, 0, 0, 0, time.UTC)
		got := addCadence(start, "weekly", loc)
		want := time.Date(2026, 2, 21, 10, 0, 0, 0, time.UTC)
		if !got.Equal(want) {
			t.Fatalf("got %s want %s", got.Format(time.RFC3339), want.Format(time.RFC3339))
		}
	})

	t.Run("biweekly adds 14 days", func(t *testing.T) {
		start := time.Date(2026, 2, 1, 12, 0, 0, 0, time.UTC)
		got := addCadence(start, "biweekly", loc)
		want := time.Date(2026, 2, 15, 12, 0, 0, 0, time.UTC)
		if !got.Equal(want) {
			t.Fatalf("got %s want %s", got.Format(time.RFC3339), want.Format(time.RFC3339))
		}
	})

	t.Run("monthly adds 1 month", func(t *testing.T) {
		start := time.Date(2026, 1, 15, 10, 0, 0, 0, time.UTC)
		got := addCadence(start, "monthly", loc)
		want := time.Date(2026, 2, 15, 10, 0, 0, 0, time.UTC)
		if !got.Equal(want) {
			t.Fatalf("got %s want %s", got.Format(time.RFC3339), want.Format(time.RFC3339))
		}
	})

	t.Run("monthly end-of-month overflow", func(t *testing.T) {
		start := time.Date(2026, 1, 31, 10, 0, 0, 0, time.UTC)
		got := addCadence(start, "monthly", loc)
		// Go's AddDate: Jan 31 + 1 month = March 3 (2026 is not a leap year)
		want := time.Date(2026, 3, 3, 10, 0, 0, 0, time.UTC)
		if !got.Equal(want) {
			t.Fatalf("got %s want %s", got.Format(time.RFC3339), want.Format(time.RFC3339))
		}
	})

	t.Run("unknown cadence defaults to weekly", func(t *testing.T) {
		start := time.Date(2026, 2, 14, 10, 0, 0, 0, time.UTC)
		got := addCadence(start, "daily", loc)
		want := time.Date(2026, 2, 21, 10, 0, 0, 0, time.UTC)
		if !got.Equal(want) {
			t.Fatalf("got %s want %s", got.Format(time.RFC3339), want.Format(time.RFC3339))
		}
	})

	t.Run("DST spring forward", func(t *testing.T) {
		chi, err := time.LoadLocation("America/Chicago")
		if err != nil {
			t.Skip("America/Chicago timezone not available")
		}
		// March 8 2026 is DST spring-forward in US Central
		start := time.Date(2026, 3, 7, 10, 0, 0, 0, chi).UTC()
		got := addCadence(start, "weekly", chi)
		// Should keep wall-clock time 10:00 local, even though UTC offset changes
		gotLocal := got.In(chi)
		if gotLocal.Hour() != 10 || gotLocal.Minute() != 0 {
			t.Fatalf("expected 10:00 local, got %s", gotLocal.Format(time.RFC3339))
		}
		if gotLocal.Day() != 14 {
			t.Fatalf("expected day 14, got %d", gotLocal.Day())
		}
	})

	t.Run("DST fall back", func(t *testing.T) {
		chi, err := time.LoadLocation("America/Chicago")
		if err != nil {
			t.Skip("America/Chicago timezone not available")
		}
		// Nov 1 2026 is DST fall-back in US Central
		start := time.Date(2026, 10, 31, 10, 0, 0, 0, chi).UTC()
		got := addCadence(start, "weekly", chi)
		gotLocal := got.In(chi)
		if gotLocal.Hour() != 10 || gotLocal.Minute() != 0 {
			t.Fatalf("expected 10:00 local, got %s", gotLocal.Format(time.RFC3339))
		}
		if gotLocal.Day() != 7 {
			t.Fatalf("expected day 7, got %d", gotLocal.Day())
		}
	})
}

func TestComputeBuyerFee(t *testing.T) {
	cases := []struct {
		name    string
		bps     int
		flat    int
		sub     int
		wantFee int
		wantTot int
	}{
		{
			name: "zero subtotal",
			bps:  500, flat: 50, sub: 0,
			wantFee: 50, wantTot: 50,
		},
		{
			name: "normal 5% on 1000 cents",
			bps:  500, flat: 0, sub: 1000,
			wantFee: 50, wantTot: 1050,
		},
		{
			name: "flat only",
			bps:  0, flat: 100, sub: 2000,
			wantFee: 100, wantTot: 2100,
		},
		{
			name: "combined bps and flat",
			bps:  250, flat: 50, sub: 2000,
			wantFee: 100, wantTot: 2100,
		},
		{
			name: "negative subtotal clamped to zero",
			bps:  500, flat: 50, sub: -100,
			wantFee: 50, wantTot: 50,
		},
		{
			name: "negative bps clamped to zero",
			bps:  -100, flat: 50, sub: 1000,
			wantFee: 50, wantTot: 1050,
		},
		{
			name: "negative flat clamped to zero",
			bps:  500, flat: -50, sub: 1000,
			wantFee: 50, wantTot: 1050,
		},
		{
			name: "all zeros",
			bps:  0, flat: 0, sub: 0,
			wantFee: 0, wantTot: 0,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			gotFee, gotTot := computeBuyerFee(tc.sub, tc.bps, tc.flat)
			if gotFee != tc.wantFee {
				t.Errorf("fee: got %d want %d", gotFee, tc.wantFee)
			}
			if gotTot != tc.wantTot {
				t.Errorf("total: got %d want %d", gotTot, tc.wantTot)
			}
		})
	}
}

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
