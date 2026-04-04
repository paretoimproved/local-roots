package resp

import (
	"encoding/json"
	"log"
	"net/http"
)

type errorResponse struct {
	Error string `json:"error"`
}

func JSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func OK(w http.ResponseWriter, v any) { JSON(w, http.StatusOK, v) }

func BadRequest(w http.ResponseWriter, msg string) {
	JSON(w, http.StatusBadRequest, errorResponse{Error: msg})
}

func Unauthorized(w http.ResponseWriter, msg string) {
	JSON(w, http.StatusUnauthorized, errorResponse{Error: msg})
}

func Forbidden(w http.ResponseWriter, msg string) {
	JSON(w, http.StatusForbidden, errorResponse{Error: msg})
}

func NotFound(w http.ResponseWriter, msg string) {
	JSON(w, http.StatusNotFound, errorResponse{Error: msg})
}

func ServiceUnavailable(w http.ResponseWriter, msg string) {
	JSON(w, http.StatusServiceUnavailable, errorResponse{Error: msg})
}

func Internal(w http.ResponseWriter, err error) {
	log.Printf("internal error: %v", err)
	JSON(w, http.StatusInternalServerError, errorResponse{Error: "internal server error"})
}
