package timeutil

import (
	"fmt"
	"strconv"
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

	parseUTCOffsetMinutes := func(v string) (int, bool) {
		t := strings.ToUpper(strings.TrimSpace(v))
		t = strings.ReplaceAll(t, " ", "")
		if !(strings.HasPrefix(t, "UTC") || strings.HasPrefix(t, "GMT")) {
			return 0, false
		}
		t = strings.TrimPrefix(t, "UTC")
		t = strings.TrimPrefix(t, "GMT")
		if t == "" {
			return 0, true
		}
		sign := 1
		switch t[0] {
		case '+':
			sign = 1
			t = t[1:]
		case '-':
			sign = -1
			t = t[1:]
		default:
			return 0, false
		}
		if t == "" {
			return 0, false
		}

		var hh, mm int
		if strings.Contains(t, ":") {
			parts := strings.SplitN(t, ":", 3)
			if len(parts) != 2 {
				return 0, false
			}
			h, err := strconv.Atoi(parts[0])
			if err != nil {
				return 0, false
			}
			m, err := strconv.Atoi(parts[1])
			if err != nil {
				return 0, false
			}
			hh, mm = h, m
		} else {
			// Support "HH", "H", or "HHMM" forms.
			if len(t) <= 2 {
				h, err := strconv.Atoi(t)
				if err != nil {
					return 0, false
				}
				hh, mm = h, 0
			} else if len(t) == 4 {
				h, err := strconv.Atoi(t[:2])
				if err != nil {
					return 0, false
				}
				m, err := strconv.Atoi(t[2:])
				if err != nil {
					return 0, false
				}
				hh, mm = h, m
			} else {
				return 0, false
			}
		}
		if hh < 0 || hh > 14 || mm < 0 || mm >= 60 {
			return 0, false
		}
		return sign * (hh*60 + mm), true
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
		v = strings.TrimSpace(v)
		if v == "" {
			return v
		}
		// If it already looks like an IANA zone, preserve it.
		if strings.Contains(v, "/") {
			// Some legacy values can accidentally include spaces.
			return strings.ReplaceAll(v, " ", "_")
		}

		// Support offsets like "UTC-08:00" by mapping whole-hour offsets to Etc/GMT±H.
		if mins, ok := parseUTCOffsetMinutes(v); ok && mins%60 == 0 {
			h := mins / 60
			if h == 0 {
				return "UTC"
			}
			// Note: "Etc/GMT+8" means UTC-8 (sign is inverted).
			return fmt.Sprintf("Etc/GMT%+d", -h)
		}

		// Keep only letters for robust matching against values like
		// "Pacific Time (US & Canada)".
		key := strings.Map(func(r rune) rune {
			if r >= 'a' && r <= 'z' {
				return r - ('a' - 'A')
			}
			if r >= 'A' && r <= 'Z' {
				return r
			}
			return -1
		}, v)

		switch key {
		case "PST", "PDT", "PT", "PACIFIC", "PACIFICTIME", "PACIFICTIMEUSCANADA", "PACIFICTIMEUSANDCANADA":
			return "America/Los_Angeles"
		case "MST", "MDT", "MT", "MOUNTAIN", "MOUNTAINTIME", "MOUNTAINTIMEUSCANADA", "MOUNTAINTIMEUSANDCANADA":
			return "America/Denver"
		case "CST", "CDT", "CT", "CENTRAL", "CENTRALTIME", "CENTRALTIMEUSCANADA", "CENTRALTIMEUSANDCANADA":
			return "America/Chicago"
		case "EST", "EDT", "ET", "EASTERN", "EASTERNTIME", "EASTERNTIMEUSCANADA", "EASTERNTIMEUSANDCANADA":
			return "America/New_York"
		case "AKST", "AKDT", "ALASKA", "ALASKATIME", "ALASKATIMEUSCANADA", "ALASKATIMEUSANDCANADA":
			return "America/Anchorage"
		case "HST", "HAWAII", "HAWAIITIME":
			return "Pacific/Honolulu"
		default:
			// Last resort: keyword match for verbose labels without IANA content.
			l := strings.ToLower(v)
			if strings.Contains(l, "pacific") && strings.Contains(l, "time") {
				return "America/Los_Angeles"
			}
			if strings.Contains(l, "mountain") && strings.Contains(l, "time") {
				return "America/Denver"
			}
			if strings.Contains(l, "central") && strings.Contains(l, "time") {
				return "America/Chicago"
			}
			if strings.Contains(l, "eastern") && strings.Contains(l, "time") {
				return "America/New_York"
			}
			if strings.Contains(l, "alaska") && strings.Contains(l, "time") {
				return "America/Anchorage"
			}
			if strings.Contains(l, "hawai") && strings.Contains(l, "time") {
				return "Pacific/Honolulu"
			}
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
