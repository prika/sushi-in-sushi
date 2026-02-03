/**
 * Vendus POS API Client
 * Handles authentication, rate limiting, and retry logic
 */

import type { VendusConfig, VendusApiErrorResponse } from "./types";
import { VENDUS_DEFAULTS } from "./config";

// =============================================
// ERROR CLASS
// =============================================

export class VendusApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>,
    public statusCode?: number
  ) {
    super(message);
    this.name = "VendusApiError";
  }

  /**
   * Check if error is retryable (server errors or rate limiting)
   */
  isRetryable(): boolean {
    if (this.statusCode === 429) return true; // Rate limited
    if (this.statusCode && this.statusCode >= 500) return true; // Server error
    return false;
  }

  /**
   * Get user-friendly error message in Portuguese
   */
  getUserMessage(): string {
    switch (this.code) {
      case "TIMEOUT":
        return "O pedido demorou demasiado. Por favor tente novamente.";
      case "NETWORK_ERROR":
        return "Erro de ligacao ao Vendus. Verifique a sua ligacao.";
      case "UNAUTHORIZED":
        return "Credenciais do Vendus invalidas.";
      case "NOT_FOUND":
        return "Recurso nao encontrado no Vendus.";
      case "RATE_LIMITED":
        return "Muitos pedidos. Por favor aguarde um momento.";
      case "VALIDATION_ERROR":
        return `Erro de validacao: ${this.message}`;
      default:
        return this.message || "Erro ao comunicar com o Vendus.";
    }
  }
}

// =============================================
// API CLIENT
// =============================================

export class VendusClient {
  private config: VendusConfig;
  private lastRequestTime = 0;

  constructor(config: VendusConfig) {
    this.config = config;
  }

  /**
   * Apply rate limiting - ensure minimum interval between requests
   */
  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const minInterval = 60000 / VENDUS_DEFAULTS.rateLimitPerMinute;
    const elapsed = now - this.lastRequestTime;

    if (elapsed < minInterval) {
      await new Promise((resolve) => setTimeout(resolve, minInterval - elapsed));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Build authorization header (Basic Auth)
   */
  private getAuthHeader(): string {
    // Vendus uses API key as username with empty password
    return `Basic ${Buffer.from(this.config.apiKey + ":").toString("base64")}`;
  }

  /**
   * Make API request with retry logic
   */
  async request<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    endpoint: string,
    data?: Record<string, unknown>,
    attempt = 1
  ): Promise<T> {
    await this.rateLimit();

    const url = `${this.config.baseUrl}${endpoint}`;
    const headers: HeadersInit = {
      Authorization: this.getAuthHeader(),
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle non-OK responses
      if (!response.ok) {
        const errorData: VendusApiErrorResponse = await response
          .json()
          .catch(() => ({}));

        const error = new VendusApiError(
          errorData.code || this.getErrorCodeFromStatus(response.status),
          errorData.message || `HTTP ${response.status}`,
          errorData.details,
          response.status
        );

        // Retry on retryable errors
        if (error.isRetryable() && attempt < this.config.retryAttempts) {
          const delay = VENDUS_DEFAULTS.retryDelayMs * Math.pow(2, attempt - 1);
          console.log(
            `[Vendus] Retrying request (attempt ${attempt + 1}/${this.config.retryAttempts}) after ${delay}ms`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          return this.request<T>(method, endpoint, data, attempt + 1);
        }

        throw error;
      }

      // Parse successful response
      const responseText = await response.text();
      if (!responseText) {
        return {} as T;
      }
      return JSON.parse(responseText);
    } catch (error) {
      // Handle VendusApiError (already processed)
      if (error instanceof VendusApiError) {
        throw error;
      }

      // Handle abort (timeout)
      if (error instanceof Error && error.name === "AbortError") {
        throw new VendusApiError("TIMEOUT", "Pedido expirou", undefined, 408);
      }

      // Handle network errors
      if (error instanceof TypeError) {
        throw new VendusApiError(
          "NETWORK_ERROR",
          "Erro de rede ao comunicar com Vendus",
          undefined,
          0
        );
      }

      // Re-throw unexpected errors
      throw new VendusApiError(
        "UNKNOWN_ERROR",
        error instanceof Error ? error.message : "Erro desconhecido"
      );
    }
  }

  /**
   * Map HTTP status to error code
   */
  private getErrorCodeFromStatus(status: number): string {
    switch (status) {
      case 401:
        return "UNAUTHORIZED";
      case 403:
        return "FORBIDDEN";
      case 404:
        return "NOT_FOUND";
      case 422:
        return "VALIDATION_ERROR";
      case 429:
        return "RATE_LIMITED";
      default:
        return status >= 500 ? "SERVER_ERROR" : "API_ERROR";
    }
  }

  // =============================================
  // CONVENIENCE METHODS
  // =============================================

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>("GET", endpoint);
  }

  async post<T>(endpoint: string, data: Record<string, unknown>): Promise<T> {
    return this.request<T>("POST", endpoint, data);
  }

  async put<T>(endpoint: string, data: Record<string, unknown>): Promise<T> {
    return this.request<T>("PUT", endpoint, data);
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>("DELETE", endpoint);
  }
}

// =============================================
// CLIENT FACTORY
// =============================================

// Cache clients per location to reuse connections
const clients = new Map<string, VendusClient>();

/**
 * Get or create a Vendus client for a location
 */
export function getVendusClient(
  config: VendusConfig,
  locationSlug: string
): VendusClient {
  const cacheKey = `${locationSlug}-${config.apiKey}`;

  if (!clients.has(cacheKey)) {
    clients.set(cacheKey, new VendusClient(config));
  }

  return clients.get(cacheKey)!;
}

/**
 * Clear cached clients (useful for testing)
 */
export function clearClientCache(): void {
  clients.clear();
}
