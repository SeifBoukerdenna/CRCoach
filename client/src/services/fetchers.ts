/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Fetcher service for API communication
 */

interface FetchOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: any;
  headers?: Record<string, string>;
}

/**
 * Fetch data from API with error handling
 */
export const fetchData = async <T>(
  url: string,
  options?: FetchOptions
): Promise<T> => {
  const headers = {
    "Content-Type": "application/json",
    ...(options?.headers || {}),
  };

  try {
    const response = await fetch(url, {
      method: options?.method || "GET",
      headers,
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      // Try to get error details from response
      let errorDetail = "";
      try {
        const errorData = await response.json();
        errorDetail = errorData.error || errorData.message || "";
      } catch (e) {
        // If we can't parse JSON, use status text
        errorDetail = response.statusText;
      }

      throw new Error(`API error ${response.status}: ${errorDetail}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    throw error;
  }
};

/**
 * Get detection status for a session
 */
// Updated getDetectionStatus function
export const getDetectionStatus = async (sessionCode: string) => {
  try {
    // Use absolute URL to bypass any proxy issues
    const url = `http://localhost:8080/detection/${sessionCode}`;
    console.log("Fetching detection from:", url);

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    // Check if response is OK
    if (!response.ok) {
      throw new Error(
        `Server returned ${response.status}: ${response.statusText}`
      );
    }

    // Log content type
    const contentType = response.headers.get("content-type");
    console.log("Response content type:", contentType);

    if (!contentType || !contentType.includes("application/json")) {
      console.warn(
        "Warning: Response is not JSON (content-type:",
        contentType,
        ")"
      );
    }

    // Get response as text first to debug
    const responseText = await response.text();
    console.log(
      "Raw response (first 100 chars):",
      responseText.substring(0, 100)
    );

    // If it starts with <!doctype or <html, it's definitely HTML
    if (
      responseText.toLowerCase().startsWith("<!doctype") ||
      responseText.toLowerCase().startsWith("<html")
    ) {
      console.error("Server returned HTML instead of JSON");
      return {
        status: "error",
        logo_detected: false,
        error: "Server returned HTML instead of JSON",
        confidence: 0,
      };
    }

    try {
      return JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse JSON:", parseError);
      return {
        status: "error",
        logo_detected: false,
        error: "Invalid JSON response",
        confidence: 0,
      };
    }
  } catch (error: any) {
    console.error("Failed to get detection status:", error);
    return {
      status: "error",
      logo_detected: false,
      error: error.message,
      confidence: 0,
    };
  }
};

/**
 * Get comprehensive session status
 */
export const getSessionStatus = async (sessionCode: string) => {
  try {
    return await fetchData(`/session/${sessionCode}/status`);
  } catch (error) {
    console.error("Failed to get session status:", error);
    throw error;
  }
};

/**
 * Get ML system status
 */
export const getMLStatus = async () => {
  try {
    return await fetchData("/ml/status");
  } catch (error) {
    console.error("Failed to get ML status:", error);
    throw error;
  }
};
