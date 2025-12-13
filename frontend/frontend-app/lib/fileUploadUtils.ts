// File upload utilities with persistent storage

export interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string; // base64 data URL
  uploadedAt: number;
  category: 'profile' | 'portfolio' | 'resume' | 'certificate' | 'logo' | 'cover' | 'video';
}

const STORAGE_KEY_PREFIX = 'creerlio_uploads_';

/**
 * Save uploaded file to localStorage
 * Note: localStorage has ~5-10MB limit. For production, use cloud storage.
 */
export function saveUploadedFile(userId: string, category: string, file: UploadedFile): void {
  try {
    const storageKey = `${STORAGE_KEY_PREFIX}${userId}_${category}`;
    const existing = getUploadedFiles(userId, category);
    const updated = [...existing, file];
    localStorage.setItem(storageKey, JSON.stringify(updated));
  } catch (error) {
    console.error('Error saving file to localStorage:', error);
    // If quota exceeded, try to clear old files
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      clearOldFiles(userId);
      // Retry save
      try {
        const storageKey = `${STORAGE_KEY_PREFIX}${userId}_${category}`;
        localStorage.setItem(storageKey, JSON.stringify([file]));
      } catch (retryError) {
        console.error('Failed to save file even after cleanup:', retryError);
      }
    }
  }
}

/**
 * Get all uploaded files for a user and category
 */
export function getUploadedFiles(userId: string, category: string): UploadedFile[] {
  try {
    const storageKey = `${STORAGE_KEY_PREFIX}${userId}_${category}`;
    const data = localStorage.getItem(storageKey);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error reading files from localStorage:', error);
    return [];
  }
}

/**
 * Get a single file by ID
 */
export function getUploadedFile(userId: string, category: string, fileId: string): UploadedFile | null {
  const files = getUploadedFiles(userId, category);
  return files.find(f => f.id === fileId) || null;
}

/**
 * Remove a file by ID
 */
export function removeUploadedFile(userId: string, category: string, fileId: string): void {
  try {
    const storageKey = `${STORAGE_KEY_PREFIX}${userId}_${category}`;
    const existing = getUploadedFiles(userId, category);
    const updated = existing.filter(f => f.id !== fileId);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  } catch (error) {
    console.error('Error removing file from localStorage:', error);
  }
}

/**
 * Clear all files for a category
 */
export function clearUploadedFiles(userId: string, category: string): void {
  try {
    const storageKey = `${STORAGE_KEY_PREFIX}${userId}_${category}`;
    localStorage.removeItem(storageKey);
  } catch (error) {
    console.error('Error clearing files from localStorage:', error);
  }
}

/**
 * Clear old files (older than 30 days) to free up space
 */
function clearOldFiles(userId: string): void {
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  const categories = ['profile', 'portfolio', 'resume', 'certificate', 'logo', 'cover'];
  
  categories.forEach(category => {
    const files = getUploadedFiles(userId, category);
    const recentFiles = files.filter(f => f.uploadedAt > thirtyDaysAgo);
    const storageKey = `${STORAGE_KEY_PREFIX}${userId}_${category}`;
    localStorage.setItem(storageKey, JSON.stringify(recentFiles));
  });
}

/**
 * Convert File object to UploadedFile with base64 encoding
 */
export async function fileToUploadedFile(
  file: File,
  category: UploadedFile['category']
): Promise<UploadedFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onloadend = () => {
      const uploadedFile: UploadedFile = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        type: file.type,
        size: file.size,
        dataUrl: reader.result as string,
        uploadedAt: Date.now(),
        category
      };
      resolve(uploadedFile);
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * Upload file to cloud storage (backend API)
 * This would be implemented when backend endpoints are ready
 */
export async function uploadToCloudStorage(file: File, category: string): Promise<string> {
  // TODO: Implement actual cloud upload when API is ready
  const formData = new FormData();
  formData.append('file', file);
  formData.append('category', category);
  
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    if (!response.ok) {
      throw new Error('Upload failed');
    }
    
    const data = await response.json();
    return data.url; // Cloud storage URL
  } catch (error) {
    console.error('Cloud upload error:', error);
    throw error;
  }
}

/**
 * Get file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Validate file type and size
 */
export function validateFile(
  file: File,
  allowedTypes: string[],
  maxSizeMB: number
): { valid: boolean; error?: string } {
  // Check file type
  const isValidType = allowedTypes.some(type => {
    if (type.endsWith('/*')) {
      return file.type.startsWith(type.replace('/*', ''));
    }
    return file.type === type;
  });
  
  if (!isValidType) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}`
    };
  }
  
  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File too large. Maximum size: ${maxSizeMB}MB`
    };
  }
  
  return { valid: true };
}

/**
 * Get total storage used by user (in bytes)
 */
export function getTotalStorageUsed(userId: string): number {
  const categories = ['profile', 'portfolio', 'resume', 'certificate', 'logo', 'cover'];
  let total = 0;
  
  categories.forEach(category => {
    const files = getUploadedFiles(userId, category);
    total += files.reduce((sum, file) => sum + file.size, 0);
  });
  
  return total;
}

/**
 * Check if storage quota is available
 */
export function hasStorageQuota(userId: string, additionalBytes: number): boolean {
  const MAX_STORAGE = 10 * 1024 * 1024; // 10MB limit for localStorage
  const used = getTotalStorageUsed(userId);
  return (used + additionalBytes) < MAX_STORAGE;
}
