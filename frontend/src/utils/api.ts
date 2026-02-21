import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '../constants/api';
import { Platform } from 'react-native';

export interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  headers?: Record<string, string>;
}

export function getApiBaseUrl(): string {
  return API_BASE;
}

export async function apiRequest<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;
  
  const token = await AsyncStorage.getItem('session_token');
  
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };
  
  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers: requestHeaders,
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Request failed with status ${response.status}`);
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
