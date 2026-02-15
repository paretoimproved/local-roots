package timeutil

import "testing"

func TestLoadLocationBestEffort_Normalizes(t *testing.T) {
	t.Parallel()

	cases := []struct {
		in   string
		want string
	}{
		{"America/Los_Angeles", "America/Los_Angeles"},
		{" Pacific Time — America/Los_Angeles ", "America/Los_Angeles"},
		{"Pacific Time (America/Los_Angeles)", "America/Los_Angeles"},
		{"Pacific Time", "America/Los_Angeles"},
		{"ET", "America/New_York"},
		{"HST", "Pacific/Honolulu"},
	}

	for _, tc := range cases {
		_, got, err := LoadLocationBestEffort(tc.in)
		if err != nil {
			t.Fatalf("LoadLocationBestEffort(%q) err=%v", tc.in, err)
		}
		if got != tc.want {
			t.Fatalf("LoadLocationBestEffort(%q) normalized=%q want=%q", tc.in, got, tc.want)
		}
	}
}

