package v1

import (
	"net/http"
	"regexp"
	"strings"
)

var uuidRe = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)

func validUUID(s string) bool {
	return uuidRe.MatchString(s)
}

func extractBuyerToken(r *http.Request) string {
	authz := strings.TrimSpace(r.Header.Get("Authorization"))
	parts := strings.SplitN(authz, " ", 2)
	if len(parts) == 2 && strings.EqualFold(parts[0], "bearer") {
		return strings.TrimSpace(parts[1])
	}
	return ""
}
