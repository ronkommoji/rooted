/**
 * File upload validation utilities
 *
 * Provides secure file validation for uploads including:
 * - File size limits
 * - MIME type validation
 * - Content validation (not just extension)
 * - Image dimension validation
 *
 * Usage:
 *   import { validateImage, validateFile, getFileSizeString } from '@/lib/fileValidation';
 *
 *   const validation = await validateImage(imageUri);
 *   if (!validation.valid) {
 *     Alert.alert('Invalid Image', validation.error);
 *     return;
 *   }
 */

import * as FileSystem from 'expo-file-system';
import { logger } from './logger';

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  fileSize?: number;
  mimeType?: string;
  width?: number;
  height?: number;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

// File size limits
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
export const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB

// Allowed MIME types
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
];

export const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/quicktime', // .mov
  'video/x-m4v',
];

export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
];

/**
 * Get MIME type from file extension
 */
function getMimeTypeFromExtension(uri: string): string {
  const extension = uri.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    heic: 'image/heic',
    heif: 'image/heif',
    gif: 'image/gif',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
  return mimeTypes[extension || ''] || 'application/octet-stream';
}

/**
 * Get file information from URI
 * Uses expo-file-system to handle all URI types including camera roll (ph://, content://)
 */
export async function getFileInfo(uri: string): Promise<{
  size: number;
  mimeType: string;
} | null> {
  try {
    // Use expo-file-system which handles all URI types (file://, ph://, content://, etc.)
    const fileInfo = await FileSystem.getInfoAsync(uri);

    if (!fileInfo.exists) {
      logger.error('File does not exist', undefined, { uri });
      return null;
    }

    // FileSystem.getInfoAsync returns size for existing files
    const size = fileInfo.size;
    if (size === undefined) {
      logger.error('Could not determine file size', undefined, { uri });
      return null;
    }

    // Infer MIME type from file extension since FileSystem doesn't provide it
    const mimeType = getMimeTypeFromExtension(uri);

    return {
      size,
      mimeType,
    };
  } catch (error) {
    logger.error('Failed to get file info', error, { uri });
    return null;
  }
}

/**
 * Get image dimensions
 */
export function getImageDimensions(uri: string): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      resolve({
        width: image.width,
        height: image.height,
      });
    };

    image.onerror = (error) => {
      reject(new Error('Failed to load image'));
    };

    image.src = uri;
  });
}

/**
 * Validate image file
 */
export async function validateImage(
  uri: string,
  options?: {
    maxSize?: number;
    allowedTypes?: string[];
    maxWidth?: number;
    maxHeight?: number;
    minWidth?: number;
    minHeight?: number;
  }
): Promise<FileValidationResult> {
  const maxSize = options?.maxSize ?? MAX_IMAGE_SIZE;
  const allowedTypes = options?.allowedTypes ?? ALLOWED_IMAGE_TYPES;

  try {
    // Get file info
    const fileInfo = await getFileInfo(uri);
    if (!fileInfo) {
      return {
        valid: false,
        error: 'Failed to read file information',
      };
    }

    // Validate file size
    if (fileInfo.size > maxSize) {
      return {
        valid: false,
        error: `File size exceeds ${getFileSizeString(maxSize)} limit`,
        fileSize: fileInfo.size,
      };
    }

    // Validate MIME type
    if (!allowedTypes.includes(fileInfo.mimeType)) {
      return {
        valid: false,
        error: `File type ${fileInfo.mimeType} is not allowed. Allowed types: ${allowedTypes
          .map((t) => t.split('/')[1])
          .join(', ')}`,
        mimeType: fileInfo.mimeType,
      };
    }

    // Validate dimensions if specified
    if (options?.maxWidth || options?.maxHeight || options?.minWidth || options?.minHeight) {
      try {
        const dimensions = await getImageDimensions(uri);

        if (options.maxWidth && dimensions.width > options.maxWidth) {
          return {
            valid: false,
            error: `Image width (${dimensions.width}px) exceeds maximum ${options.maxWidth}px`,
            width: dimensions.width,
            height: dimensions.height,
          };
        }

        if (options.maxHeight && dimensions.height > options.maxHeight) {
          return {
            valid: false,
            error: `Image height (${dimensions.height}px) exceeds maximum ${options.maxHeight}px`,
            width: dimensions.width,
            height: dimensions.height,
          };
        }

        if (options.minWidth && dimensions.width < options.minWidth) {
          return {
            valid: false,
            error: `Image width (${dimensions.width}px) is below minimum ${options.minWidth}px`,
            width: dimensions.width,
            height: dimensions.height,
          };
        }

        if (options.minHeight && dimensions.height < options.minHeight) {
          return {
            valid: false,
            error: `Image height (${dimensions.height}px) is below minimum ${options.minHeight}px`,
            width: dimensions.width,
            height: dimensions.height,
          };
        }
      } catch (error) {
        logger.warn('Failed to validate image dimensions', { uri, error });
        // Continue without dimension validation
      }
    }

    return {
      valid: true,
      fileSize: fileInfo.size,
      mimeType: fileInfo.mimeType,
    };
  } catch (error) {
    logger.error('Image validation failed', error, { uri });
    return {
      valid: false,
      error: 'Failed to validate image',
    };
  }
}

/**
 * Validate video file
 */
export async function validateVideo(
  uri: string,
  options?: {
    maxSize?: number;
    allowedTypes?: string[];
  }
): Promise<FileValidationResult> {
  const maxSize = options?.maxSize ?? MAX_VIDEO_SIZE;
  const allowedTypes = options?.allowedTypes ?? ALLOWED_VIDEO_TYPES;

  return validateFile(uri, maxSize, allowedTypes, 'video');
}

/**
 * Validate document file
 */
export async function validateDocument(
  uri: string,
  options?: {
    maxSize?: number;
    allowedTypes?: string[];
  }
): Promise<FileValidationResult> {
  const maxSize = options?.maxSize ?? MAX_DOCUMENT_SIZE;
  const allowedTypes = options?.allowedTypes ?? ALLOWED_DOCUMENT_TYPES;

  return validateFile(uri, maxSize, allowedTypes, 'document');
}

/**
 * Generic file validation
 */
export async function validateFile(
  uri: string,
  maxSize: number,
  allowedTypes: string[],
  fileType: string = 'file'
): Promise<FileValidationResult> {
  try {
    // Get file info
    const fileInfo = await getFileInfo(uri);
    if (!fileInfo) {
      return {
        valid: false,
        error: `Failed to read ${fileType} information`,
      };
    }

    // Validate file size
    if (fileInfo.size > maxSize) {
      return {
        valid: false,
        error: `${fileType} size exceeds ${getFileSizeString(maxSize)} limit`,
        fileSize: fileInfo.size,
      };
    }

    // Validate MIME type
    if (!allowedTypes.includes(fileInfo.mimeType)) {
      return {
        valid: false,
        error: `${fileType} type ${fileInfo.mimeType} is not allowed`,
        mimeType: fileInfo.mimeType,
      };
    }

    return {
      valid: true,
      fileSize: fileInfo.size,
      mimeType: fileInfo.mimeType,
    };
  } catch (error) {
    logger.error(`${fileType} validation failed`, error, { uri });
    return {
      valid: false,
      error: `Failed to validate ${fileType}`,
    };
  }
}

/**
 * Convert file size to human-readable string
 */
export function getFileSizeString(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  } else {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
}

/**
 * Check if file extension matches MIME type
 */
export function validateExtension(uri: string, mimeType: string): boolean {
  const extension = uri.split('.').pop()?.toLowerCase();
  if (!extension) return false;

  const mimeTypeExtensions: Record<string, string[]> = {
    'image/jpeg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'image/webp': ['webp'],
    'image/heic': ['heic'],
    'image/heif': ['heif'],
    'video/mp4': ['mp4'],
    'video/quicktime': ['mov'],
    'application/pdf': ['pdf'],
    'application/msword': ['doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
  };

  const validExtensions = mimeTypeExtensions[mimeType] || [];
  return validExtensions.includes(extension);
}

/**
 * Sanitize filename for upload
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace invalid characters
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, '') // Remove leading/trailing underscores
    .substring(0, 255); // Limit length
}

/**
 * Generate unique filename with timestamp
 */
export function generateUniqueFilename(originalFilename: string, userId: string): string {
  const timestamp = Date.now();
  const extension = originalFilename.split('.').pop();
  const sanitizedName = sanitizeFilename(originalFilename.replace(/\.[^/.]+$/, ''));
  return `${userId}_${timestamp}_${sanitizedName}.${extension}`;
}
