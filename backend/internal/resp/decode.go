package resp

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
)

const defaultMaxBodyBytes int64 = 1 << 20 // 1 MiB

// DecodeJSON decodes a JSON body into v and enforces a small maximum body size.
// It also rejects trailing non-whitespace content (e.g. multiple JSON objects).
func DecodeJSON(w http.ResponseWriter, r *http.Request, v any) error {
	r.Body = http.MaxBytesReader(w, r.Body, defaultMaxBodyBytes)

	dec := json.NewDecoder(r.Body)
	if err := dec.Decode(v); err != nil {
		return err
	}

	// Reject trailing garbage.
	if err := dec.Decode(&struct{}{}); err != io.EOF {
		return errors.New("invalid json")
	}

	return nil
}

