package main

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"
)

type xtreamUserInfo struct {
	Auth           int    `json:"auth"`
	Status         string `json:"status"`
	ExpDate        any    `json:"exp_date"`
	MaxConnections any    `json:"max_connections"`
}

type xtreamWhoAmI struct {
	UserInfo   xtreamUserInfo `json:"user_info"`
	ServerInfo map[string]any `json:"server_info"`
}

type proxyResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data"`
}

var httpClient = &http.Client{
	Timeout: 15 * time.Second,
	Transport: &http.Transport{
		MaxIdleConns:        100,
		MaxIdleConnsPerHost: 100,
		IdleConnTimeout:     90 * time.Second,
	},
}

func buildPlayerURL(base, username, password string, params map[string]string) (string, error) {
	if base == "" || username == "" || password == "" {
		return "", errors.New("missing base_url, username or password")
	}
	// Ensure base has scheme
	if !strings.HasPrefix(base, "http://") && !strings.HasPrefix(base, "https://") {
		base = "http://" + base
	}
	u, err := url.Parse(base)
	if err != nil {
		return "", err
	}
	// Normalize to player_api.php path
	if !strings.HasSuffix(u.Path, "/player_api.php") {
		if !strings.HasSuffix(u.Path, "/") {
			u.Path += "/"
		}
		u.Path += "player_api.php"
	}
	q := u.Query()
	q.Set("username", username)
	q.Set("password", password)
	for k, v := range params {
		q.Set(k, v)
	}
	u.RawQuery = q.Encode()
	return u.String(), nil
}

func fetchJSON(ctx context.Context, fullURL string, target any) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, fullURL, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Accept", "application/json")
	resp, err := httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return errors.New("upstream status: " + resp.Status)
	}
	dec := json.NewDecoder(resp.Body)
	dec.UseNumber()
	return dec.Decode(target)
}

func proxyHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	base := strings.TrimSpace(r.URL.Query().Get("base_url"))
	username := strings.TrimSpace(r.URL.Query().Get("username"))
	password := strings.TrimSpace(r.URL.Query().Get("password"))

	if base == "" || username == "" || password == "" {
		writeJSON(w, http.StatusBadRequest, proxyResponse{Success: false, Message: "Missing base_url, username or password", Data: nil})
		return
	}

	// Step 1: authenticate via player_api root call
	whoURL, err := buildPlayerURL(base, username, password, nil)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, proxyResponse{Success: false, Message: err.Error(), Data: nil})
		return
	}

	// Use a short timeout for auth
	authCtx, cancel := context.WithTimeout(ctx, 8*time.Second)
	defer cancel()

	var who xtreamWhoAmI
	if err := fetchJSON(authCtx, whoURL, &who); err != nil {
		writeJSON(w, http.StatusUnauthorized, proxyResponse{Success: false, Message: "Authentication failed: " + err.Error(), Data: nil})
		return
	}

	if who.UserInfo.Auth != 1 && !strings.EqualFold(who.UserInfo.Status, "Active") {
		writeJSON(w, http.StatusUnauthorized, proxyResponse{Success: false, Message: "Invalid credentials or inactive account", Data: nil})
		return
	}

	// Step 2: concurrently fetch datasets with a wider timeout
	fetchCtx, cancelFetch := context.WithTimeout(ctx, 20*time.Second)
	defer cancelFetch()

	type result struct {
		key string
		val any
		err error
	}

	jobs := []struct {
		key    string
		params map[string]string
	}{
		{key: "live_categories", params: map[string]string{"action": "get_live_categories"}},
		{key: "live_streams", params: map[string]string{"action": "get_live_streams"}},
		{key: "vod_categories", params: map[string]string{"action": "get_vod_categories"}},
		{key: "vod_streams", params: map[string]string{"action": "get_vod_streams"}},
		{key: "series_categories", params: map[string]string{"action": "get_series_categories"}},
		{key: "series", params: map[string]string{"action": "get_series"}},
	}

	resCh := make(chan result, len(jobs))
	var wg sync.WaitGroup
	wg.Add(len(jobs))

	for _, job := range jobs {
		job := job
		go func() {
			defer wg.Done()
			u, err := buildPlayerURL(base, username, password, job.params)
			if err != nil {
				resCh <- result{key: job.key, err: err}
				return
			}
			var payload any
			if err := fetchJSON(fetchCtx, u, &payload); err != nil {
				resCh <- result{key: job.key, err: err}
				return
			}
			resCh <- result{key: job.key, val: payload}
		}()
	}

	wg.Wait()
	close(resCh)

	// Aggregate
	aggregated := map[string]any{
		"user_info":   who.UserInfo,
		"server_info": who.ServerInfo,
		"live":        map[string]any{},
		"vod":         map[string]any{},
		"series":      map[string]any{},
	}

	var firstErr error
	for res := range resCh {
		if res.err != nil && firstErr == nil {
			firstErr = res.err
		}
		switch res.key {
		case "live_categories":
			aggregated["live"].(map[string]any)["categories"] = res.val
		case "live_streams":
			aggregated["live"].(map[string]any)["streams"] = res.val
		case "vod_categories":
			aggregated["vod"].(map[string]any)["categories"] = res.val
		case "vod_streams":
			aggregated["vod"].(map[string]any)["streams"] = res.val
		case "series_categories":
			aggregated["series"].(map[string]any)["categories"] = res.val
		case "series":
			aggregated["series"].(map[string]any)["items"] = res.val
		}
	}

	if firstErr != nil {
		// Partial failure: still return what we got with 206
		writeJSONWithStatus(w, http.StatusPartialContent, proxyResponse{Success: true, Message: "Partial data: " + firstErr.Error(), Data: aggregated})
		return
	}

	writeJSON(w, http.StatusOK, proxyResponse{Success: true, Data: aggregated})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	writeJSONWithStatus(w, status, v)
}

func writeJSONWithStatus(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	// Basic CORS for convenience; adjust if needed
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.WriteHeader(status)
	enc := json.NewEncoder(w)
	enc.SetEscapeHTML(true)
	_ = enc.Encode(v)
}

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/get", proxyHandler)

	addr := os.Getenv("PROXY_ADDR")
	if strings.TrimSpace(addr) == "" {
		addr = ":8081"
	}

	log.Printf("proxy listening on %s", addr)
	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatal(err)
	}
}
