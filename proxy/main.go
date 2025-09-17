package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"
)

// Configuration holds server configuration
type Config struct {
	Addr            string
	ReadTimeout     time.Duration
	WriteTimeout    time.Duration
	IdleTimeout     time.Duration
	ShutdownTimeout time.Duration
	MaxConcurrent   int
	MaxRetries      int
	RetryDelay      time.Duration
}

// DefaultConfig returns sensible defaults for production
func DefaultConfig() *Config {
	return &Config{
		Addr:            getEnv("PROXY_ADDR", ":8081"),
		ReadTimeout:     60 * time.Second,
		WriteTimeout:    60 * time.Second, // Increased for large JSON payloads
		IdleTimeout:     120 * time.Second,
		ShutdownTimeout: 30 * time.Second,
		MaxConcurrent:   500,
		MaxRetries:      3, // Back to original for faster retries
		RetryDelay:      2 * time.Second,
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// XtreamUserInfo represents user authentication info from Xtream
type XtreamUserInfo struct {
	Auth           int    `json:"auth"`
	Status         string `json:"status"`
	ExpDate        any    `json:"exp_date"`
	MaxConnections any    `json:"max_connections"`
}

// XtreamWhoAmI represents the initial authentication response
type XtreamWhoAmI struct {
	UserInfo   XtreamUserInfo `json:"user_info"`
	ServerInfo map[string]any `json:"server_info"`
}

// ProxyResponse represents the standardized response format
type ProxyResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data"`
}

// NormalizedData represents the frontend-expected data structure
type NormalizedData struct {
	UserInfo           XtreamUserInfo     `json:"userInfo"`
	Categories         Categories         `json:"categories"`         // For metadata/filters
	CategorizedStreams CategorizedStreams `json:"categorizedStreams"` // Streams grouped by category
	Statistics         Statistics         `json:"statistics"`
	FetchedAt          int64              `json:"fetchedAt"`
}

type Statistics struct {
	TotalLive   int `json:"totalLive"`
	TotalVOD    int `json:"totalVod"`
	TotalSeries int `json:"totalSeries"`
	TotalItems  int `json:"totalItems"`
}

type Categories struct {
	Live   []CategoryInfo `json:"live"`
	VOD    []CategoryInfo `json:"vod"`
	Series []CategoryInfo `json:"series"`
}

type CategoryInfo struct {
	CategoryID   string `json:"category_id"`
	CategoryName string `json:"category_name"`
}

// New structure: streams grouped by category for efficient frontend display
type CategorizedStreams struct {
	Live   []CategoryWithStreams `json:"live"`
	VOD    []CategoryWithStreams `json:"vod"`
	Series []CategoryWithStreams `json:"series"`
}

type CategoryWithStreams struct {
	CategoryID   string       `json:"category_id"`
	CategoryName string       `json:"category_name"`
	Streams      []StreamInfo `json:"streams"`
	StreamCount  int          `json:"stream_count"`
}

type StreamInfo struct {
	Num          interface{} `json:"num,omitempty"`
	Name         string      `json:"name"`
	CategoryName string      `json:"category_name"`
	CategoryID   string      `json:"category_id"`
	StreamIcon   string      `json:"stream_icon,omitempty"`
	// Common fields
	StreamType string      `json:"stream_type,omitempty"`
	StreamID   interface{} `json:"stream_id,omitempty"`
	SeriesID   interface{} `json:"series_id,omitempty"`
	Added      string      `json:"added,omitempty"`
	Rating     string      `json:"rating,omitempty"`
	// VOD/Series specific fields that actually exist
	Cover       string `json:"cover,omitempty"`
	Plot        string `json:"plot,omitempty"`
	Cast        string `json:"cast,omitempty"`
	Director    string `json:"director,omitempty"`
	Genre       string `json:"genre,omitempty"`
	ReleaseDate string `json:"releaseDate,omitempty"`
}

// Server wraps the HTTP server with configuration
type Server struct {
	config     *Config
	httpServer *http.Server
	client     *http.Client
	semaphore  chan struct{}
}

// NewServer creates a new proxy server instance
func NewServer(config *Config) *Server {
	if config == nil {
		config = DefaultConfig()
	}

	// Create HTTP client with sensible defaults for upstream requests
	client := &http.Client{
		Timeout: 15 * time.Second,
		Transport: &http.Transport{
			MaxIdleConns:        100,
			MaxIdleConnsPerHost: 10,
			IdleConnTimeout:     90 * time.Second,
			DisableKeepAlives:   false,
			DialContext: (&net.Dialer{
				Timeout:   5 * time.Second,
				KeepAlive: 30 * time.Second,
			}).DialContext,
		},
	}

	s := &Server{
		config:    config,
		client:    client,
		semaphore: make(chan struct{}, config.MaxConcurrent),
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/get", s.handleProxy)
	mux.HandleFunc("/test", s.handleTest)
	mux.HandleFunc("/health", s.handleHealth)

	s.httpServer = &http.Server{
		Addr:         config.Addr,
		Handler:      s.loggingMiddleware(s.corsMiddleware(mux)),
		ReadTimeout:  config.ReadTimeout,
		WriteTimeout: config.WriteTimeout,
		IdleTimeout:  config.IdleTimeout,
	}

	return s
}

// Start starts the server
func (s *Server) Start() error {
	log.Printf("Starting proxy server on %s", s.config.Addr)
	return s.httpServer.ListenAndServe()
}

// Shutdown gracefully shuts down the server
func (s *Server) Shutdown(ctx context.Context) error {
	log.Println("Shutting down proxy server...")
	return s.httpServer.Shutdown(ctx)
}

// Middleware for CORS headers
func (s *Server) corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// Middleware for request logging
func (s *Server) loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Wrap ResponseWriter to capture status code
		wrapped := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}

		next.ServeHTTP(wrapped, r)

		log.Printf("%s %s %d %v", r.Method, r.URL.Path, wrapped.statusCode, time.Since(start))
	})
}

type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

// Health check endpoint
func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	s.writeJSON(w, http.StatusOK, map[string]any{
		"status": "healthy",
		"time":   time.Now().Unix(),
	})
}

// Test connection endpoint - lightweight credential validation
func (s *Server) handleTest(w http.ResponseWriter, r *http.Request) {
	// Limit concurrent requests
	select {
	case s.semaphore <- struct{}{}:
		defer func() { <-s.semaphore }()
	default:
		s.writeJSON(w, http.StatusTooManyRequests, ProxyResponse{
			Success: false,
			Message: "Server too busy, please try again later",
			Data:    nil,
		})
		return
	}

	ctx := r.Context()
	baseURL := strings.TrimSpace(r.URL.Query().Get("base_url"))
	username := strings.TrimSpace(r.URL.Query().Get("username"))
	password := strings.TrimSpace(r.URL.Query().Get("password"))

	if baseURL == "" || username == "" || password == "" {
		s.writeJSON(w, http.StatusBadRequest, ProxyResponse{
			Success: false,
			Message: "Missing required parameters: base_url, username, password",
			Data:    nil,
		})
		return
	}

	// Validate base URL
	if _, err := url.Parse(baseURL); err != nil {
		s.writeJSON(w, http.StatusBadRequest, ProxyResponse{
			Success: false,
			Message: "Invalid base_url format",
			Data:    nil,
		})
		return
	}

	// Only authenticate - don't fetch all data
	authURL, err := s.buildPlayerURL(baseURL, username, password, nil)
	if err != nil {
		s.writeJSON(w, http.StatusBadRequest, ProxyResponse{
			Success: false,
			Message: fmt.Sprintf("Failed to build auth URL: %v", err),
			Data:    nil,
		})
		return
	}

	// Use shorter timeout for test requests
	authCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var whoAmI XtreamWhoAmI
	if err := s.fetchJSON(authCtx, authURL, &whoAmI); err != nil {
		s.writeJSON(w, http.StatusUnauthorized, ProxyResponse{
			Success: false,
			Message: fmt.Sprintf("Authentication failed: %v", err),
			Data:    nil,
		})
		return
	}

	if whoAmI.UserInfo.Auth != 1 || !strings.EqualFold(whoAmI.UserInfo.Status, "Active") {
		s.writeJSON(w, http.StatusUnauthorized, ProxyResponse{
			Success: false,
			Message: "Invalid credentials or inactive account",
			Data:    nil,
		})
		return
	}

	// Return only user info for test
	s.writeJSON(w, http.StatusOK, ProxyResponse{
		Success: true,
		Message: "Connection test successful",
		Data: map[string]any{
			"userInfo": whoAmI.UserInfo,
			"testedAt": time.Now().UnixMilli(),
		},
	})
}

// Main proxy handler with concurrency limiting
func (s *Server) handleProxy(w http.ResponseWriter, r *http.Request) {
	// Limit concurrent requests
	select {
	case s.semaphore <- struct{}{}:
		defer func() { <-s.semaphore }()
	default:
		s.writeJSON(w, http.StatusTooManyRequests, ProxyResponse{
			Success: false,
			Message: "Server too busy, please try again later",
			Data:    nil,
		})
		return
	}

	ctx := r.Context()
	baseURL := strings.TrimSpace(r.URL.Query().Get("base_url"))
	username := strings.TrimSpace(r.URL.Query().Get("username"))
	password := strings.TrimSpace(r.URL.Query().Get("password"))

	if baseURL == "" || username == "" || password == "" {
		s.writeJSON(w, http.StatusBadRequest, ProxyResponse{
			Success: false,
			Message: "Missing required parameters: base_url, username, password",
			Data:    nil,
		})
		return
	}

	// Validate base URL
	if _, err := url.Parse(baseURL); err != nil {
		s.writeJSON(w, http.StatusBadRequest, ProxyResponse{
			Success: false,
			Message: "Invalid base_url format",
			Data:    nil,
		})
		return
	}

	// Step 1: Authenticate
	authURL, err := s.buildPlayerURL(baseURL, username, password, nil)
	if err != nil {
		s.writeJSON(w, http.StatusBadRequest, ProxyResponse{
			Success: false,
			Message: fmt.Sprintf("Failed to build auth URL: %v", err),
			Data:    nil,
		})
		return
	}

	authCtx, cancel := context.WithTimeout(ctx, 8*time.Second)
	defer cancel()

	var whoAmI XtreamWhoAmI
	if err := s.fetchJSON(authCtx, authURL, &whoAmI); err != nil {
		s.writeJSON(w, http.StatusUnauthorized, ProxyResponse{
			Success: false,
			Message: fmt.Sprintf("Authentication failed: %v", err),
			Data:    nil,
		})
		return
	}

	if whoAmI.UserInfo.Auth != 1 || !strings.EqualFold(whoAmI.UserInfo.Status, "Active") {
		s.writeJSON(w, http.StatusUnauthorized, ProxyResponse{
			Success: false,
			Message: "Invalid credentials or inactive account",
			Data:    nil,
		})
		return
	}

	// Step 2: Fetch all data concurrently with reasonable timeout
	fetchCtx, cancelFetch := context.WithTimeout(ctx, 30*time.Second) // Balanced timeout
	defer cancelFetch()

	normalized, err := s.fetchAllData(fetchCtx, baseURL, username, password, whoAmI.UserInfo)
	if err != nil {
		// Even if there's an error, check if we got partial data
		if normalized != nil {
			// Return partial data with a warning message
			s.writeJSON(w, http.StatusPartialContent, ProxyResponse{
				Success: true,
				Message: fmt.Sprintf("Partial data retrieved due to some errors: %v", err),
				Data:    normalized,
			})
			return
		}

		// No data at all - return error
		s.writeJSON(w, http.StatusInternalServerError, ProxyResponse{
			Success: false,
			Message: fmt.Sprintf("Failed to fetch any data: %v", err),
			Data:    nil,
		})
		return
	}

	s.writeJSON(w, http.StatusOK, ProxyResponse{
		Success: true,
		Data:    normalized,
	})
}

// fetchAllData concurrently fetches all required data
func (s *Server) fetchAllData(ctx context.Context, baseURL, username, password string, userInfo XtreamUserInfo) (*NormalizedData, error) {
	var hasErrors bool
	type job struct {
		key    string
		params map[string]string
	}

	type result struct {
		key string
		val any
		err error
	}

	jobs := []job{
		{key: "live_categories", params: map[string]string{"action": "get_live_categories"}},
		{key: "live_streams", params: map[string]string{"action": "get_live_streams"}},
		{key: "vod_categories", params: map[string]string{"action": "get_vod_categories"}},
		{key: "vod_streams", params: map[string]string{"action": "get_vod_streams"}},
		{key: "series_categories", params: map[string]string{"action": "get_series_categories"}},
		{key: "series", params: map[string]string{"action": "get_series"}},
	}

	results := make(chan result, len(jobs))
	var wg sync.WaitGroup

	for _, j := range jobs {
		wg.Add(1)
		go func(job job) {
			defer wg.Done()

			url, err := s.buildPlayerURL(baseURL, username, password, job.params)
			if err != nil {
				results <- result{key: job.key, err: err}
				return
			}

			var payload any
			if err := s.fetchJSON(ctx, url, &payload); err != nil {
				results <- result{key: job.key, err: err}
				return
			}

			results <- result{key: job.key, val: payload}
		}(j)
	}

	wg.Wait()
	close(results)

	// Build normalized response
	normalized := &NormalizedData{
		UserInfo:           userInfo,
		Categories:         Categories{Live: []CategoryInfo{}, VOD: []CategoryInfo{}, Series: []CategoryInfo{}},
		CategorizedStreams: CategorizedStreams{Live: []CategoryWithStreams{}, VOD: []CategoryWithStreams{}, Series: []CategoryWithStreams{}},
		Statistics:         Statistics{},
		FetchedAt:          time.Now().UnixMilli(),
	}

	// Temporary storage for raw data
	rawData := make(map[string]interface{})

	// Process results with enhanced error handling
	successCount := 0
	totalJobs := len(jobs)
	for res := range results {
		if res.err != nil {
			log.Printf("Error fetching %s after all retries: %v", res.key, res.err)
			hasErrors = true
		} else {
			rawData[res.key] = res.val
			successCount++
			log.Printf("Successfully fetched %s", res.key)
		}
	}

	// Log summary of fetch results
	log.Printf("Fetch completed: %d/%d requests succeeded", successCount, totalJobs)

	// If we have very low success rate, log a warning but continue with partial data
	if successCount < totalJobs/2 {
		log.Printf("Warning: Low success rate (%d/%d), returning partial data", successCount, totalJobs)
	}

	// Process categories with error handling
	if val, ok := rawData["live_categories"]; ok && val != nil {
		if categories := normalizeCategories(val); len(categories) > 0 {
			normalized.Categories.Live = categories
			log.Printf("Processed %d live categories", len(categories))
		} else {
			log.Println("Warning: No valid live categories found")
		}
	}
	if val, ok := rawData["vod_categories"]; ok && val != nil {
		if categories := normalizeCategories(val); len(categories) > 0 {
			normalized.Categories.VOD = categories
			log.Printf("Processed %d VOD categories", len(categories))
		} else {
			log.Println("Warning: No valid VOD categories found")
		}
	}
	if val, ok := rawData["series_categories"]; ok && val != nil {
		if categories := normalizeCategories(val); len(categories) > 0 {
			normalized.Categories.Series = categories
			log.Printf("Processed %d series categories", len(categories))
		} else {
			log.Println("Warning: No valid series categories found")
		}
	}

	// Process streams and group by category for efficient frontend display
	if val, ok := rawData["live_streams"]; ok && val != nil {
		if categorizedStreams := categorizeStreams(val, normalized.Categories.Live, "live"); len(categorizedStreams) > 0 {
			normalized.CategorizedStreams.Live = categorizedStreams
			totalLive := 0
			for _, cat := range categorizedStreams {
				totalLive += cat.StreamCount
			}
			log.Printf("Processed %d live streams across %d categories", totalLive, len(categorizedStreams))
		} else {
			log.Println("Warning: No valid live streams found")
		}
	}
	if val, ok := rawData["vod_streams"]; ok && val != nil {
		if categorizedStreams := categorizeStreams(val, normalized.Categories.VOD, "vod"); len(categorizedStreams) > 0 {
			normalized.CategorizedStreams.VOD = categorizedStreams
			totalVod := 0
			for _, cat := range categorizedStreams {
				totalVod += cat.StreamCount
			}
			log.Printf("Processed %d VOD streams across %d categories", totalVod, len(categorizedStreams))
		} else {
			log.Println("Warning: No valid VOD streams found")
		}
	}
	if val, ok := rawData["series"]; ok && val != nil {
		if categorizedStreams := categorizeStreams(val, normalized.Categories.Series, "series"); len(categorizedStreams) > 0 {
			normalized.CategorizedStreams.Series = categorizedStreams
			totalSeries := 0
			for _, cat := range categorizedStreams {
				totalSeries += cat.StreamCount
			}
			log.Printf("Processed %d series streams across %d categories", totalSeries, len(categorizedStreams))
		} else {
			log.Println("Warning: No valid series streams found")
		}
	}

	// Calculate statistics for frontend tab buttons from categorized streams
	var totalLive, totalVod, totalSeries int
	for _, cat := range normalized.CategorizedStreams.Live {
		totalLive += cat.StreamCount
	}
	for _, cat := range normalized.CategorizedStreams.VOD {
		totalVod += cat.StreamCount
	}
	for _, cat := range normalized.CategorizedStreams.Series {
		totalSeries += cat.StreamCount
	}

	normalized.Statistics = Statistics{
		TotalLive:   totalLive,
		TotalVOD:    totalVod,
		TotalSeries: totalSeries,
		TotalItems:  totalLive + totalVod + totalSeries,
	}

	// Log processing summary
	log.Printf("Data processing complete - Live: %d, VOD: %d, Series: %d, Total: %d",
		normalized.Statistics.TotalLive,
		normalized.Statistics.TotalVOD,
		normalized.Statistics.TotalSeries,
		normalized.Statistics.TotalItems)

	log.Printf("Categories - Live: %d, VOD: %d, Series: %d",
		len(normalized.Categories.Live),
		len(normalized.Categories.VOD),
		len(normalized.Categories.Series))

	// Always return the normalized data, even if it's partial
	// The caller will decide whether to return it as partial data or error
	if hasErrors {
		return normalized, fmt.Errorf("partial data: %d/%d requests succeeded", successCount, totalJobs)
	}
	return normalized, nil
}

// normalizeCategories converts raw category data to structured CategoryInfo
func normalizeCategories(val interface{}) []CategoryInfo {
	if val == nil {
		return []CategoryInfo{}
	}

	slice := ensureSlice(val)
	categories := make([]CategoryInfo, 0, len(slice))

	for _, item := range slice {
		if itemMap, ok := item.(map[string]interface{}); ok {
			category := CategoryInfo{
				CategoryID:   getStringValue(itemMap, "category_id"),
				CategoryName: getStringValue(itemMap, "category_name"),
			}

			// Only add if we have essential fields
			if category.CategoryID != "" && category.CategoryName != "" {
				categories = append(categories, category)
			}
		}
	}

	return categories
}

// categorizeStreams converts raw stream data and groups by category for efficient frontend display
func categorizeStreams(val interface{}, categories []CategoryInfo, streamType string) []CategoryWithStreams {
	if val == nil {
		return []CategoryWithStreams{}
	}

	slice := ensureSlice(val)

	// Create category ID to name mapping and initialize category groups
	categoryMap := make(map[string]string)
	categoryGroups := make(map[string][]StreamInfo)

	for _, cat := range categories {
		categoryMap[cat.CategoryID] = cat.CategoryName
		categoryGroups[cat.CategoryID] = []StreamInfo{}
	}

	// Add "Uncategorized" category for streams without valid category
	categoryGroups["uncategorized"] = []StreamInfo{}

	// Process each stream and group by category
	for _, item := range slice {
		if itemMap, ok := item.(map[string]interface{}); ok {
			stream := StreamInfo{
				Num:        getInterfaceValue(itemMap, "num"),
				Name:       getStringValue(itemMap, "name"),
				CategoryID: getStringValue(itemMap, "category_id"),
				StreamIcon: getStringValue(itemMap, "stream_icon"),
				StreamType: getStringValue(itemMap, "stream_type"),
				StreamID:   getInterfaceValue(itemMap, "stream_id"),
				SeriesID:   getInterfaceValue(itemMap, "series_id"),
				Added:      getStringValue(itemMap, "added"),
				Rating:     getStringValue(itemMap, "rating"),
			}

			// Add VOD/Series specific fields that actually exist
			if streamType == "vod" || streamType == "series" {
				stream.Cover = getStringValue(itemMap, "cover")
				stream.Plot = getStringValue(itemMap, "plot")
				stream.Cast = getStringValue(itemMap, "cast")
				stream.Director = getStringValue(itemMap, "director")
				stream.Genre = getStringValue(itemMap, "genre")
				stream.ReleaseDate = getStringValue(itemMap, "releaseDate")
			}

			// Only process if we have essential fields
			if stream.Name == "" {
				continue
			}

			// Determine category and set category name
			categoryId := stream.CategoryID
			if categoryName, exists := categoryMap[categoryId]; exists {
				stream.CategoryName = categoryName
				categoryGroups[categoryId] = append(categoryGroups[categoryId], stream)
			} else {
				stream.CategoryName = "Uncategorized"
				categoryGroups["uncategorized"] = append(categoryGroups["uncategorized"], stream)
			}
		}
	}

	// Build the final categorized structure
	var result []CategoryWithStreams

	// Add categories that have streams
	for _, cat := range categories {
		streams := categoryGroups[cat.CategoryID]
		if len(streams) > 0 {
			result = append(result, CategoryWithStreams{
				CategoryID:   cat.CategoryID,
				CategoryName: cat.CategoryName,
				Streams:      streams,
				StreamCount:  len(streams),
			})
		}
	}

	// Add uncategorized streams if any
	uncategorizedStreams := categoryGroups["uncategorized"]
	if len(uncategorizedStreams) > 0 {
		result = append(result, CategoryWithStreams{
			CategoryID:   "uncategorized",
			CategoryName: "Uncategorized",
			Streams:      uncategorizedStreams,
			StreamCount:  len(uncategorizedStreams),
		})
	}

	return result
}

// Helper functions for safe data extraction
func getStringValue(m map[string]interface{}, keys ...string) string {
	for _, key := range keys {
		if val, ok := m[key]; ok && val != nil {
			if str, ok := val.(string); ok {
				return str
			}
			// Convert number to string if needed
			if num, ok := val.(float64); ok {
				return fmt.Sprintf("%.0f", num)
			}
		}
	}
	return ""
}

func getInterfaceValue(m map[string]interface{}, keys ...string) interface{} {
	for _, key := range keys {
		if val, ok := m[key]; ok {
			return val
		}
	}
	return nil
}

// ensureSlice converts any value to a slice, handling nil and non-slice values
func ensureSlice(val any) []any {
	if val == nil {
		return []any{}
	}

	switch v := val.(type) {
	case []any:
		return v
	default:
		// If it's not a slice, wrap it in one
		return []any{v}
	}
}

// buildPlayerURL constructs Xtream player_api.php URLs
func (s *Server) buildPlayerURL(baseURL, username, password string, params map[string]string) (string, error) {
	if baseURL == "" || username == "" || password == "" {
		return "", errors.New("missing base_url, username or password")
	}

	// Ensure base has scheme
	if !strings.HasPrefix(baseURL, "http://") && !strings.HasPrefix(baseURL, "https://") {
		baseURL = "http://" + baseURL
	}

	u, err := url.Parse(baseURL)
	if err != nil {
		return "", fmt.Errorf("invalid base URL: %w", err)
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

// fetchJSON makes HTTP request and decodes JSON response with simple retry logic
func (s *Server) fetchJSON(ctx context.Context, url string, target any) (err error) {
	// Top-level recover to prevent server crash from any panic in this function
	defer func() {
		if r := recover(); r != nil {
			log.Printf("PANIC RECOVERED in fetchJSON for URL %s: %v", url, r)
			err = fmt.Errorf("unexpected internal error: %v", r)
		}
	}()

	var lastErr error
	for attempt := 0; attempt <= s.config.MaxRetries; attempt++ {
		if attempt > 0 {
			// Simple linear backoff delay
			delay := time.Duration(attempt) * s.config.RetryDelay
			log.Printf("Retrying request to %s after %v (attempt %d/%d)", url, delay, attempt, s.config.MaxRetries)

			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(delay):
				// Continue with retry
			}
		}

		req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
		if err != nil {
			return fmt.Errorf("failed to create request: %w", err)
		}

		req.Header.Set("Accept", "application/json")
		req.Header.Set("User-Agent", "SyncStream-Proxy/1.0")

		resp, err := s.client.Do(req)
		if err != nil {
			// Simple retry for network errors
			lastErr = fmt.Errorf("request failed: %w", err)
			if attempt == s.config.MaxRetries {
				return lastErr
			}
			continue
		}

		// Check if we should retry on 404 (rate limit indicator)
		if resp.StatusCode == http.StatusNotFound {
			resp.Body.Close()
			lastErr = fmt.Errorf("rate limited (404): %s", resp.Status)
			if attempt == s.config.MaxRetries {
				return lastErr
			}
			continue
		}

		// For other non-200 status codes, don't retry
		if resp.StatusCode != http.StatusOK {
			resp.Body.Close()
			return fmt.Errorf("upstream error: %s", resp.Status)
		}

		// Success - decode the response
		decoder := json.NewDecoder(resp.Body)
		decoder.UseNumber() // Preserve number precision

		if err := decoder.Decode(target); err != nil {
			resp.Body.Close()
			return fmt.Errorf("failed to decode JSON: %w", err)
		}

		resp.Body.Close()

		if attempt > 0 {
			log.Printf("Request to %s succeeded after %d retries", url, attempt)
		}

		return nil
	}

	return lastErr
}

// writeJSON writes JSON response with proper headers
func (s *Server) writeJSON(w http.ResponseWriter, statusCode int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)

	encoder := json.NewEncoder(w)
	encoder.SetEscapeHTML(false) // Don't escape HTML in JSON strings

	if err := encoder.Encode(data); err != nil {
		log.Printf("Failed to encode JSON response: %v", err)
	}
}

func main() {
	config := DefaultConfig()
	server := NewServer(config)

	// Graceful shutdown
	ctx, cancel := context.WithTimeout(context.Background(), config.ShutdownTimeout)
	defer cancel()

	// Start server
	if err := server.Start(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Server failed to start: %v", err)
	}

	// Wait for shutdown signal
	<-ctx.Done()
	if err := server.Shutdown(ctx); err != nil {
		log.Printf("Server shutdown error: %v", err)
	}
}
