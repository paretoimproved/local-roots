package v1

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/paretoimproved/local-roots/backend/internal/resp"
)

// GeoAPI proxies Google Places requests server-side so we don't expose API keys
// to the browser. These endpoints are seller-auth protected.
type GeoAPI struct {
	GooglePlacesAPIKey string
}

func (a GeoAPI) requireSeller(u AuthUser, w http.ResponseWriter) bool {
	if u.Role != "seller" && u.Role != "admin" {
		resp.Forbidden(w, "seller access required")
		return false
	}
	return true
}

type placesAutocompleteRequest struct {
	Input        string `json:"input"`
	SessionToken string `json:"session_token"`
}

type placesAutocompletePrediction struct {
	PlaceID       string `json:"place_id"`
	MainText      string `json:"main_text"`
	SecondaryText string `json:"secondary_text"`
	FullText      string `json:"full_text"`
}

type placesAutocompleteResponse struct {
	Predictions []placesAutocompletePrediction `json:"predictions"`
}

func (a GeoAPI) PlacesAutocomplete(w http.ResponseWriter, r *http.Request, u AuthUser) {
	if !a.requireSeller(u, w) {
		return
	}
	if strings.TrimSpace(a.GooglePlacesAPIKey) == "" {
		resp.ServiceUnavailable(w, "google places is not configured")
		return
	}

	var in placesAutocompleteRequest
	if err := resp.DecodeJSON(w, r, &in); err != nil {
		resp.BadRequest(w, "invalid json")
		return
	}
	in.Input = strings.TrimSpace(in.Input)
	in.SessionToken = strings.TrimSpace(in.SessionToken)
	if len(in.Input) < 3 {
		resp.BadRequest(w, "input must be at least 3 characters")
		return
	}
	if in.SessionToken == "" {
		resp.BadRequest(w, "session_token is required")
		return
	}

	// Google Places API (New): Autocomplete
	type googleAutocompleteReq struct {
		Input               string   `json:"input"`
		SessionToken        string   `json:"sessionToken"`
		RegionCode          string   `json:"regionCode,omitempty"`
		IncludedRegionCodes []string `json:"includedRegionCodes,omitempty"`
		LanguageCode        string   `json:"languageCode,omitempty"`
	}

	reqBody, _ := json.Marshal(googleAutocompleteReq{
		Input:               in.Input,
		SessionToken:        in.SessionToken,
		RegionCode:          "us",
		IncludedRegionCodes: []string{"us"},
		LanguageCode:        "en",
	})

	req, err := http.NewRequestWithContext(r.Context(), http.MethodPost, "https://places.googleapis.com/v1/places:autocomplete", bytes.NewReader(reqBody))
	if err != nil {
		resp.Internal(w, err)
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Goog-Api-Key", a.GooglePlacesAPIKey)
	// Keep response small and predictable to control cost.
	req.Header.Set("X-Goog-FieldMask", "suggestions.placePrediction.placeId,suggestions.placePrediction.structuredFormat,suggestions.placePrediction.text")

	client := &http.Client{Timeout: 6 * time.Second}
	res, err := client.Do(req)
	if err != nil {
		resp.BadRequest(w, "google places request failed")
		return
	}
	defer res.Body.Close()

	raw, _ := io.ReadAll(io.LimitReader(res.Body, 1<<20))
	if res.StatusCode != http.StatusOK {
		// Best-effort: surface a safe error message.
		type gErr struct {
			Error struct {
				Message string `json:"message"`
			} `json:"error"`
		}
		var ge gErr
		_ = json.Unmarshal(raw, &ge)
		msg := strings.TrimSpace(ge.Error.Message)
		if msg == "" {
			msg = "google places request failed"
		}
		resp.BadRequest(w, msg)
		return
	}

	type googleAutocompleteResp struct {
		Suggestions []struct {
			PlacePrediction *struct {
				PlaceID string `json:"placeId"`
				Text    *struct {
					Text string `json:"text"`
				} `json:"text"`
				StructuredFormat *struct {
					MainText *struct {
						Text string `json:"text"`
					} `json:"mainText"`
					SecondaryText *struct {
						Text string `json:"text"`
					} `json:"secondaryText"`
				} `json:"structuredFormat"`
			} `json:"placePrediction"`
		} `json:"suggestions"`
	}

	var gout googleAutocompleteResp
	if err := json.Unmarshal(raw, &gout); err != nil {
		resp.BadRequest(w, "unexpected google places response")
		return
	}

	out := make([]placesAutocompletePrediction, 0, len(gout.Suggestions))
	for _, s := range gout.Suggestions {
		if s.PlacePrediction == nil {
			continue
		}
		p := s.PlacePrediction
		main := ""
		secondary := ""
		full := ""
		if p.StructuredFormat != nil {
			if p.StructuredFormat.MainText != nil {
				main = p.StructuredFormat.MainText.Text
			}
			if p.StructuredFormat.SecondaryText != nil {
				secondary = p.StructuredFormat.SecondaryText.Text
			}
		}
		if p.Text != nil {
			full = p.Text.Text
		}
		if strings.TrimSpace(full) == "" {
			if strings.TrimSpace(secondary) != "" {
				full = strings.TrimSpace(main + ", " + secondary)
			} else {
				full = strings.TrimSpace(main)
			}
		}
		if strings.TrimSpace(p.PlaceID) == "" {
			continue
		}
		out = append(out, placesAutocompletePrediction{
			PlaceID:       p.PlaceID,
			MainText:      main,
			SecondaryText: secondary,
			FullText:      full,
		})
	}

	resp.OK(w, placesAutocompleteResponse{Predictions: out})
}

type placesDetailsRequest struct {
	PlaceID      string `json:"place_id"`
	SessionToken string `json:"session_token"`
}

type placesDetailsResponse struct {
	Address1         string   `json:"address1"`
	City             string   `json:"city"`
	Region           string   `json:"region"`
	PostalCode       string   `json:"postal_code"`
	Country          string   `json:"country"`
	FormattedAddress string   `json:"formatted_address"`
	Lat              *float64 `json:"lat"`
	Lng              *float64 `json:"lng"`
}

func (a GeoAPI) PlacesDetails(w http.ResponseWriter, r *http.Request, u AuthUser) {
	if !a.requireSeller(u, w) {
		return
	}
	if strings.TrimSpace(a.GooglePlacesAPIKey) == "" {
		resp.ServiceUnavailable(w, "google places is not configured")
		return
	}

	var in placesDetailsRequest
	if err := resp.DecodeJSON(w, r, &in); err != nil {
		resp.BadRequest(w, "invalid json")
		return
	}
	in.PlaceID = strings.TrimSpace(in.PlaceID)
	in.SessionToken = strings.TrimSpace(in.SessionToken)
	if in.PlaceID == "" {
		resp.BadRequest(w, "place_id is required")
		return
	}
	if in.SessionToken == "" {
		resp.BadRequest(w, "session_token is required")
		return
	}

	url := "https://places.googleapis.com/v1/places/" + in.PlaceID
	req, err := http.NewRequestWithContext(r.Context(), http.MethodGet, url, nil)
	if err != nil {
		resp.Internal(w, err)
		return
	}
	req.Header.Set("X-Goog-Api-Key", a.GooglePlacesAPIKey)
	req.Header.Set("X-Goog-FieldMask", "formattedAddress,addressComponents,location")
	// The session token is passed via query for Place Details (New).
	q := req.URL.Query()
	q.Set("sessionToken", in.SessionToken)
	req.URL.RawQuery = q.Encode()

	client := &http.Client{Timeout: 6 * time.Second}
	res, err := client.Do(req)
	if err != nil {
		resp.BadRequest(w, "google places request failed")
		return
	}
	defer res.Body.Close()

	raw, _ := io.ReadAll(io.LimitReader(res.Body, 1<<20))
	if res.StatusCode != http.StatusOK {
		type gErr struct {
			Error struct {
				Message string `json:"message"`
			} `json:"error"`
		}
		var ge gErr
		_ = json.Unmarshal(raw, &ge)
		msg := strings.TrimSpace(ge.Error.Message)
		if msg == "" {
			msg = "google places request failed"
		}
		resp.BadRequest(w, msg)
		return
	}

	type googlePlaceDetailsResp struct {
		FormattedAddress  string `json:"formattedAddress"`
		AddressComponents []struct {
			Types     []string `json:"types"`
			ShortText string   `json:"shortText"`
			LongText  string   `json:"longText"`
		} `json:"addressComponents"`
		Location *struct {
			Latitude  float64 `json:"latitude"`
			Longitude float64 `json:"longitude"`
		} `json:"location"`
	}

	var gout googlePlaceDetailsResp
	if err := json.Unmarshal(raw, &gout); err != nil {
		resp.BadRequest(w, "unexpected google places response")
		return
	}

	// Parse address components into our MVP fields.
	get := func(typ string, wantShort bool) string {
		for _, c := range gout.AddressComponents {
			for _, t := range c.Types {
				if t == typ {
					if wantShort && strings.TrimSpace(c.ShortText) != "" {
						return strings.TrimSpace(c.ShortText)
					}
					if strings.TrimSpace(c.LongText) != "" {
						return strings.TrimSpace(c.LongText)
					}
					if strings.TrimSpace(c.ShortText) != "" {
						return strings.TrimSpace(c.ShortText)
					}
					return ""
				}
			}
		}
		return ""
	}

	streetNumber := get("street_number", false)
	route := get("route", false)
	address1 := strings.TrimSpace(strings.TrimSpace(streetNumber + " " + route))
	if address1 == "" {
		// Some places (farms/markets) may be returned without a street number.
		address1 = get("premise", false)
	}

	city := get("locality", false)
	if city == "" {
		city = get("postal_town", false)
	}
	if city == "" {
		// Fallback for rural addresses.
		city = get("administrative_area_level_2", false)
	}

	region := get("administrative_area_level_1", true) // short state code (e.g. "CA")
	postal := get("postal_code", false)
	country := get("country", true)
	if country == "" {
		country = "US"
	}

	var lat *float64
	var lng *float64
	if gout.Location != nil {
		lat = &gout.Location.Latitude
		lng = &gout.Location.Longitude
	}

	resp.OK(w, placesDetailsResponse{
		Address1:         address1,
		City:             city,
		Region:           region,
		PostalCode:       postal,
		Country:          country,
		FormattedAddress: gout.FormattedAddress,
		Lat:              lat,
		Lng:              lng,
	})
}
