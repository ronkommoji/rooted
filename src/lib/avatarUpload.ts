/**
 * Avatar upload utilities
 * 
 * Handles image picking and uploading avatars to Supabase Storage
 */

import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { supabase, supabaseUrl } from './supabase';
import { validateImage, generateUniqueFilename } from './fileValidation';
import { logger } from './logger';

export interface AvatarUploadResult {
  success: boolean;
  avatarUrl?: string;
  error?: string;
}

/**
 * Request camera and media library permissions
 */
export const requestImagePermissions = async (): Promise<boolean> => {
  try {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    return cameraStatus === 'granted' && libraryStatus === 'granted';
  } catch (error) {
    logger.error('Error requesting image permissions', error as Error);
    return false;
  }
};

/**
 * Pick an image from camera or library and upload as avatar
 */
export const pickAndUploadAvatar = async (
  userId: string,
  source: 'camera' | 'library' = 'library'
): Promise<AvatarUploadResult> => {
  try {
    // Request permissions
    const hasPermissions = await requestImagePermissions();
    if (!hasPermissions) {
      return {
        success: false,
        error: 'Camera and photo library permissions are required',
      };
    }

    // Pick image
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });

    if (result.canceled) {
      return { success: false, error: 'Image selection cancelled' };
    }

    const imageUri = result.assets[0].uri;

    // Validate image
    const validation = await validateImage(imageUri, {
      maxSize: 2 * 1024 * 1024, // 2MB for avatars
      maxWidth: 1024,
      maxHeight: 1024,
    });

    if (!validation.valid) {
      logger.error('Avatar validation failed', undefined, {
        error: validation.error,
        userId,
      });
      return {
        success: false,
        error: validation.error || 'Invalid image',
      };
    }

    logger.info('Avatar validated successfully', {
      fileSize: validation.fileSize,
      mimeType: validation.mimeType,
      userId,
    });

    // Upload to Supabase Storage
    const avatarUrl = await uploadAvatarToStorage(imageUri, userId, validation.mimeType);
    
    if (!avatarUrl) {
      return {
        success: false,
        error: 'Failed to upload image',
      };
    }

    return {
      success: true,
      avatarUrl,
    };
  } catch (error) {
    logger.error('Error in pickAndUploadAvatar', error as Error, { userId });
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
};

/**
 * Upload avatar image to Supabase Storage
 */
const uploadAvatarToStorage = async (
  imageUri: string,
  userId: string,
  mimeType?: string
): Promise<string | null> => {
  try {
    // Create file name
    const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = generateUniqueFilename(`avatar.${fileExt}`, userId);
    const filePathWithFolder = `${userId}/${fileName}`;

    // Create FormData for upload
    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      name: fileName,
      type: mimeType || `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
    } as any);

    // Get auth token
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    if (!accessToken) {
      logger.error('No access token available for avatar upload');
      return null;
    }

    // Upload to Supabase Storage
    const startTime = Date.now();
    const uploadResponse = await fetch(
      `${supabaseUrl}/storage/v1/object/avatars/${filePathWithFolder}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'x-upsert': 'true', // Allow overwriting existing avatar
        },
        body: formData,
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      logger.error('Failed to upload avatar to storage', undefined, {
        status: uploadResponse.status,
        error: errorText,
        userId,
      });
      return null;
    }

    const uploadDuration = Date.now() - startTime;
    logger.info('Avatar uploaded successfully', {
      duration: `${uploadDuration}ms`,
      userId,
    });

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePathWithFolder);

    return urlData.publicUrl;
  } catch (error) {
    logger.error('Error in uploadAvatarToStorage', error as Error, { userId });
    return null;
  }
};

/**
 * Update user profile with new avatar URL (or null to remove)
 */
export const updateProfileAvatar = async (
  userId: string,
  avatarUrl: string | null
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', userId);

    if (error) {
      logger.error('Failed to update profile avatar', undefined, { error: error.message, userId });
      return { success: false, error: error.message };
    }

    logger.info('Profile avatar updated successfully', { userId, removed: avatarUrl === null });
    return { success: true };
  } catch (error) {
    logger.error('Error updating profile avatar', error as Error, { userId });
    return { success: false, error: 'Failed to update profile' };
  }
};

/**
 * Show action sheet for choosing image source
 */
export const showAvatarSourceOptions = (): Promise<'camera' | 'library' | null> => {
  return new Promise((resolve) => {
    Alert.alert(
      'Profile Picture',
      'Choose a source for your profile picture',
      [
        {
          text: 'Camera',
          onPress: () => resolve('camera'),
        },
        {
          text: 'Photo Library',
          onPress: () => resolve('library'),
        },
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => resolve(null),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(null) }
    );
  });
};
