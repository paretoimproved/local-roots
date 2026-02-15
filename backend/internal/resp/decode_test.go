package resp

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestDecodeJSON_Valid(t *testing.T) {
	type payload struct {
		Name string `json:"name"`
		Age  int    `json:"age"`
	}

	body := `{"name":"Alice","age":30}`
	r := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(body))
	w := httptest.NewRecorder()

	var got payload
	if err := DecodeJSON(w, r, &got); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.Name != "Alice" || got.Age != 30 {
		t.Fatalf("got %+v", got)
	}
}

func TestDecodeJSON_InvalidJSON(t *testing.T) {
	body := `{invalid`
	r := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(body))
	w := httptest.NewRecorder()

	var got struct{}
	if err := DecodeJSON(w, r, &got); err == nil {
		t.Fatal("expected error for invalid JSON")
	}
}

func TestDecodeJSON_OversizedBody(t *testing.T) {
	// Create a body larger than 1 MiB
	big := strings.Repeat("x", 1<<20+1)
	body := `{"data":"` + big + `"}`
	r := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(body))
	w := httptest.NewRecorder()

	var got struct {
		Data string `json:"data"`
	}
	if err := DecodeJSON(w, r, &got); err == nil {
		t.Fatal("expected error for oversized body")
	}
}

func TestDecodeJSON_TrailingGarbage(t *testing.T) {
	body := `{"name":"ok"}{"extra":"bad"}`
	r := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(body))
	w := httptest.NewRecorder()

	var got struct {
		Name string `json:"name"`
	}
	if err := DecodeJSON(w, r, &got); err == nil {
		t.Fatal("expected error for trailing garbage")
	}
}

func TestDecodeJSON_EmptyBody(t *testing.T) {
	r := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(""))
	w := httptest.NewRecorder()

	var got struct{}
	if err := DecodeJSON(w, r, &got); err == nil {
		t.Fatal("expected error for empty body")
	}
}
