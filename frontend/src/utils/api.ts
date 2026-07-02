import * as SecureStore from 'expo-secure-store';
import { API_BASE } from '../constants/api';
import { Platform } from 'react-native';
import { useAuthStore } from '../store/authStore';

export class SessionExpiredError extends Error {
  constructor(message: string = 'Session expired') {
    super(message);
    this.name = 'SessionExpiredError';
  }
}

export interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

export function getApiBaseUrl(): string {
  return API_BASE;
}

export async function apiRequest<T = any>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {}, timeoutMs = 15000 } = options;
  
  const token = await SecureStore.getItemAsync('session_token');
  
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };
  
  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers: requestHeaders,
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
  
  // 401: Session expired - trigger logout via auth store
  // Safe to import statically: authStore uses raw fetch (not apiRequest),
  // so there's no circular dependency.
  if (response.status === 401) {
    try {
      await useAuthStore.getState().logout();
    } catch (e) {
      // best effort - the caller will get SessionExpiredError regardless
    }
    throw new SessionExpiredError('Your session has expired. Please log in again.');
  }
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Request failed with status ${response.status}`);
  }
  
  // 204 No Content: return null (no body to parse)
  if (response.status === 204) {
    return null as T;
  }
  
  return response.json();
}

/**
 * Convert a local image URI to a base64 data URL
 */
async function uriToBase64(uri: string): Promise<string> {
  // For web, if it's already a data URL, return it
  if (uri.startsWith('data:')) {
    return uri;
  }
  
  // For web platform using blob URL or file input
  if (Platform.OS === 'web') {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error converting to base64:', error);
      throw new Error('Failed to process image');
    }
  }
  
  // For native platforms, use expo-file-system
  try {
    const FileSystem = require('expo-file-system');
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    // Determine mime type from URI
    const extension = uri.split('.').pop()?.toLowerCase() || 'jpeg';
    const mimeType = extension === 'png' ? 'image/png' : 'image/jpeg';
    
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error('Error reading file:', error);
    throw new Error('Failed to read image file');
  }
}

/**
 * Upload an image to the server
 * @param uri - Local file URI or data URL
 * @param imageType - Type of image (e.g., 'profile', 'document')
 * @returns The URL of the uploaded image
 */
export async function uploadImage(uri: string, imageType: string = 'profile'): Promise<string> {
  try {
    // Convert URI to base64 data URL
    const dataUrl = await uriToBase64(uri);
    
    // Upload to server
    const response = await apiRequest<{ image_url: string; image_id: string }>('/uploads/image', {
      method: 'POST',
      body: {
        image_data: dataUrl,
        image_type: imageType,
      },
    });
    
    return response.image_url;
  } catch (error: any) {
    console.error('Upload failed:', error);
    throw new Error(error.message || 'Failed to upload image');
  }
}

export default apiRequest;
