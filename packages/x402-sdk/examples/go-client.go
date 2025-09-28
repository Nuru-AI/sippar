package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// X402Config holds the configuration for the X402 client
type X402Config struct {
	Principal       string `json:"principal"`
	AlgorandAddress string `json:"algorandAddress"`
	BaseURL         string `json:"baseUrl"`
	Timeout         time.Duration
}

// X402PaymentRequest represents a payment creation request
type X402PaymentRequest struct {
	Service          string                 `json:"service"`
	Amount           float64                `json:"amount"`
	Principal        string                 `json:"principal"`
	AlgorandAddress  string                 `json:"algorandAddress"`
	Metadata         map[string]interface{} `json:"metadata,omitempty"`
}

// X402PaymentResponse represents the response from payment creation
type X402PaymentResponse struct {
	Success    bool `json:"success"`
	Payment    struct {
		TransactionID      string `json:"transactionId"`
		ServiceAccessToken string `json:"serviceAccessToken"`
		ExpiryTime         int64  `json:"expiryTime"`
	} `json:"payment"`
	Performance struct {
		ProcessingTime string `json:"processingTime"`
	} `json:"performance"`
}

// X402Client is the Go client for Sippar X402 payment protocol
type X402Client struct {
	config     X402Config
	httpClient *http.Client
}

// NewX402Client creates a new X402 client instance
func NewX402Client(config X402Config) *X402Client {
	if config.BaseURL == "" {
		config.BaseURL = "https://nuru.network/api/sippar/x402"
	}
	if config.Timeout == 0 {
		config.Timeout = 30 * time.Second
	}

	return &X402Client{
		config: config,
		httpClient: &http.Client{
			Timeout: config.Timeout,
		},
	}
}

// CreatePayment creates a new X402 payment for a service
func (c *X402Client) CreatePayment(service string, amount float64, metadata map[string]interface{}) (*X402PaymentResponse, error) {
	request := X402PaymentRequest{
		Service:         service,
		Amount:          amount,
		Principal:       c.config.Principal,
		AlgorandAddress: c.config.AlgorandAddress,
		Metadata:        metadata,
	}

	jsonData, err := json.Marshal(request)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	resp, err := c.httpClient.Post(
		c.config.BaseURL+"/create-payment",
		"application/json",
		bytes.NewBuffer(jsonData),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to make request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	var paymentResponse X402PaymentResponse
	if err := json.Unmarshal(body, &paymentResponse); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}

	if !paymentResponse.Success {
		return nil, fmt.Errorf("payment creation failed")
	}

	return &paymentResponse, nil
}

// QueryAIService queries an AI service using the X402 payment token
func (c *X402Client) QueryAIService(query, model, serviceToken string) (map[string]interface{}, error) {
	// In a real implementation, this would call the actual AI service
	// with the service token for authentication
	response := map[string]interface{}{
		"query":      query,
		"model":      model,
		"response":   fmt.Sprintf("AI response for: %s", query),
		"tokenUsed":  serviceToken[:20] + "...",
		"status":     "success",
		"timestamp":  time.Now().Unix(),
	}

	return response, nil
}

// GetMarketplace retrieves available services from the X402 marketplace
func (c *X402Client) GetMarketplace() (map[string]interface{}, error) {
	resp, err := c.httpClient.Get(c.config.BaseURL + "/agent-marketplace")
	if err != nil {
		return nil, fmt.Errorf("failed to get marketplace: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read marketplace response: %w", err)
	}

	var marketplace map[string]interface{}
	if err := json.Unmarshal(body, &marketplace); err != nil {
		return nil, fmt.Errorf("failed to unmarshal marketplace response: %w", err)
	}

	return marketplace, nil
}

// VerifyToken verifies if a service token is valid
func (c *X402Client) VerifyToken(token string) (bool, error) {
	request := map[string]string{"token": token}
	jsonData, err := json.Marshal(request)
	if err != nil {
		return false, err
	}

	resp, err := c.httpClient.Post(
		c.config.BaseURL+"/verify-token",
		"application/json",
		bytes.NewBuffer(jsonData),
	)
	if err != nil {
		return false, err
	}
	defer resp.Body.Close()

	return resp.StatusCode == 200, nil
}

func main() {
	fmt.Println("🐹 Sippar X402 Go Client Example")
	fmt.Println("=================================")

	// Initialize client
	config := X402Config{
		Principal:       "rdmx6-jaaaa-aaaah-qcaiq-cai",
		AlgorandAddress: "6W47GCLXWEIEZ2LRQCXF7HGLOYSXYCXOPXJ5YE55EULFHB7O4RWIM3JDCI",
	}
	client := NewX402Client(config)

	// 1. Get marketplace information
	fmt.Println("📊 Fetching marketplace...")
	marketplace, err := client.GetMarketplace()
	if err != nil {
		fmt.Printf("❌ Error getting marketplace: %v\n", err)
		return
	}

	if mp, ok := marketplace["marketplace"].(map[string]interface{}); ok {
		if totalServices, ok := mp["totalServices"].(float64); ok {
			fmt.Printf("Available services: %.0f\n", totalServices)
		}
	}

	// 2. Create payment for AI service
	fmt.Println("\n💳 Creating payment for AI service...")
	metadata := map[string]interface{}{
		"client":  "go",
		"version": "1.0",
	}

	payment, err := client.CreatePayment("ai-oracle-enhanced", 0.05, metadata)
	if err != nil {
		fmt.Printf("❌ Error creating payment: %v\n", err)
		return
	}

	fmt.Printf("✅ Payment created: %s\n", payment.Payment.TransactionID)
	fmt.Printf("⚡ Processing time: %s\n", payment.Performance.ProcessingTime)

	// 3. Use the service token
	fmt.Println("\n🤖 Querying AI service...")
	aiResponse, err := client.QueryAIService(
		"What are the benefits of blockchain technology?",
		"deepseek-r1",
		payment.Payment.ServiceAccessToken,
	)
	if err != nil {
		fmt.Printf("❌ Error querying AI service: %v\n", err)
		return
	}

	if response, ok := aiResponse["response"].(string); ok {
		fmt.Printf("🔮 AI Response: %s\n", response)
	}

	// 4. Verify token
	fmt.Println("\n🔐 Verifying token...")
	isValid, err := client.VerifyToken(payment.Payment.ServiceAccessToken)
	if err != nil {
		fmt.Printf("❌ Error verifying token: %v\n", err)
		return
	}

	fmt.Printf("Token valid: %t\n", isValid)
	fmt.Println("\n🎉 Go X402 integration successful!")
}