package timeutil

import (
	"fmt"
	"strings"
	"time"
)

// LoadLocationBestEffort attempts to parse and load an IANA timezone.
// It also supports a few "friendly" inputs that can slip into the database from UI.
//
// It returns the loaded location plus a normalized IANA timezone string that should be stored.
func LoadLocationBestEffort(raw string) (*time.Location, string, error) {
	s := strings.TrimSpace(raw)
	if s == "" {
		return nil, "", fmt.Errorf("missing timezone")
	}

	// Extract likely IANA portions from common UI labels like:
	// "Pacific Time — America/Los_Angeles" or "Pacific Time (America/Los_Angeles)".
	cands := []string{s}
	if i := strings.LastIndex(s, "—"); i >= 0 {
		cands = append(cands, strings.TrimSpace(s[i+len("—"):]))
	}
	if i := strings.LastIndex(s, "-"); i >= 0 {
		// Only use the tail if the head looks like a label (contains spaces).
		if strings.Contains(s[:i], " ") {
			cands = append(cands, strings.TrimSpace(s[i+1:]))
		}
	}
	if i := strings.LastIndex(s, "("); i >= 0 {
		if j := strings.LastIndex(s, ")"); j > i {
			cands = append(cands, strings.TrimSpace(s[i+1:j]))
		}
	}

	// Map common abbreviations / friendly names to stable IANA zones.
	alias := func(v string) string {
		k := strings.ToUpper(strings.TrimSpace(v))
		k = strings.ReplaceAll(k, " ", "")
		k = strings.ReplaceAll(k, "_", "")
		k = strings.ReplaceAll(k, "-", "")
		switch k {
		case "PST", "PDT", "PT", "PACIFIC", "PACIFICTIME":
			return "America/Los_Angeles"
		case "MST", "MDT", "MT", "MOUNTAIN", "MOUNTAINTIME":
			return "America/Denver"
		case "CST", "CDT", "CT", "CENTRAL", "CENTRALTIME":
			return "America/Chicago"
		case "EST", "EDT", "ET", "EASTERN", "EASTERNTIME":
			return "America/New_York"
		case "AKST", "AKDT", "ALASKA", "ALASKATIME":
			return "America/Anchorage"
		case "HST", "HAWAII", "HAWAIITIME":
			return "Pacific/Honolulu"
		default:
			return v
		}
	}

	var lastErr error
	for _, c := range cands {
		c = strings.TrimSpace(c)
		if c == "" {
			continue
		}
		c = alias(c)
		loc, err := time.LoadLocation(c)
		if err == nil {
			return loc, c, nil
		}
		lastErr = err
	}
	if lastErr == nil {
		lastErr = fmt.Errorf("invalid timezone")
	}
	return nil, "", lastErr
}

