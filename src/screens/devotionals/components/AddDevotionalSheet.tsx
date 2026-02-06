import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../../theme/ThemeContext';
import { useDailyDevotional } from '../hooks/useDailyDevotional';

interface AddDevotionalSheetProps {
  visible: boolean;
  onClose: () => void;
  onImageSelected: (imageUri: string) => void;
  onDailyDevotionalComplete?: () => void;
  uploading?: boolean;
  hasCompletedInAppForDate?: boolean;
}

export const AddDevotionalSheet: React.FC<AddDevotionalSheetProps> = ({
  visible,
  onClose,
  onImageSelected,
  onDailyDevotionalComplete,
  uploading = false,
  hasCompletedInAppForDate = false,
}) => {
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [completedInApp, setCompletedInApp] = useState(false);
  const { allCompleted, completeDailyDevotional } = useDailyDevotional();
  
  const isLoading = loading || uploading;

  // Reset completedInApp state when modal closes or when it opens with hasCompletedInAppForDate
  useEffect(() => {
    if (visible) {
      setCompletedInApp(hasCompletedInAppForDate);
    } else {
      setCompletedInApp(false);
      // Also reset loading state when modal closes
      setLoading(false);
    }
  }, [visible, hasCompletedInAppForDate]);

  // Track previous uploading state to detect when upload completes (success or failure)
  const prevUploadingRef = React.useRef(uploading);
  useEffect(() => {
    // If uploading changed from true to false, the upload attempt finished
    // Reset loading state so user can try again if there was an error
    if (prevUploadingRef.current && !uploading && visible) {
      setLoading(false);
    }
    prevUploadingRef.current = uploading;
  }, [uploading, visible]);

  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Camera access is needed to take photos.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  const requestMediaLibraryPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Photo library access is needed to select images.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  const handleTakePhoto = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    setLoading(true);
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false, // Allow full image without forced crop
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        // Don't close modal here - let the parent handle closing after upload completes
        onImageSelected(result.assets[0].uri);
        // Keep loading state true - parent will handle closing and resetting
      } else {
        // User canceled - reset loading
        setLoading(false);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
      setLoading(false);
    }
  };

  const handleUploadFromLibrary = async () => {
    const hasPermission = await requestMediaLibraryPermission();
    if (!hasPermission) return;

    setLoading(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false, // Allow full image without forced crop - Instagram style
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        // Don't close modal here - let the parent handle closing after upload completes
        // The parent will close the modal when upload finishes
        onImageSelected(result.assets[0].uri);
        // Keep loading state true - parent will handle closing and resetting
      } else {
        // User canceled - reset loading
        setLoading(false);
      }
    } catch (error) {
      console.error('Error selecting image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
      setLoading(false);
    }
  };

  const handleCompleteInAppDevotional = async () => {
    if (!allCompleted) {
      Alert.alert(
        'Complete All Items',
        'Please complete Scripture, Devotional, and Prayer before submitting your daily devotional.',
        [{ text: 'OK' }]
      );
      return;
    }

    setLoading(true);
    try {
      // Call the parent's handler which uses useDevotionals.addDailyDevotional
      // This properly creates the devotional entry and updates the streak
      if (onDailyDevotionalComplete) {
        await onDailyDevotionalComplete();
      } else {
        // Fallback: if no handler provided, use the hook's method
        await completeDailyDevotional();
      }
      // Don't close - show success state with option to add photo
      setCompletedInApp(true);
    } catch (error) {
      console.error('Error completing daily devotional:', error);
      Alert.alert('Error', 'Failed to complete daily devotional. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDone = () => {
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={isLoading ? undefined : onClose}
    >
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={isLoading ? undefined : onClose} 
            style={[styles.closeButton, isLoading && styles.closeButtonDisabled]}
            disabled={isLoading}
          >
            <Ionicons 
              name="close" 
              size={24} 
              color={isLoading ? colors.textMuted : colors.text} 
            />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>
            Add Today's Devotional
          </Text>
          <View style={styles.placeholder} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          {completedInApp ? (
            // Success state - user completed in-app devotional
            <>
              <View style={styles.successHeader}>
                <Ionicons name="checkmark-circle" size={64} color="#4CAF50" />
                <Text style={[styles.successTitle, { color: colors.text }]}>
                  You've completed today's devotional!
                </Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  Add a photo to share with your group? (optional)
                </Text>
              </View>

              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={isDark ? '#3D5A50' : colors.primary} />
                  <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                    {uploading ? 'Uploading your devotional...' : 'Processing...'}
                  </Text>
                </View>
              ) : (
                <View style={styles.optionsContainer}>
                  {/* Take Photo */}
                  <TouchableOpacity
                    style={[
                      styles.optionCard,
                      { backgroundColor: colors.card, borderColor: colors.cardBorder },
                    ]}
                    onPress={handleTakePhoto}
                  >
                    <View
                      style={[
                        styles.iconContainer,
                        { backgroundColor: (isDark ? '#3D5A50' : colors.primary) + '20' },
                      ]}
                    >
                      <Ionicons name="camera" size={32} color={isDark ? '#3D5A50' : colors.primary} />
                    </View>
                    <Text style={[styles.optionTitle, { color: colors.text }]}>
                      Take Photo
                    </Text>
                    <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                      Capture this moment
                    </Text>
                  </TouchableOpacity>

                  {/* Upload from Library */}
                  <TouchableOpacity
                    style={[
                      styles.optionCard,
                      { backgroundColor: colors.card, borderColor: colors.cardBorder },
                    ]}
                    onPress={handleUploadFromLibrary}
                  >
                    <View
                      style={[
                        styles.iconContainer,
                        { backgroundColor: (isDark ? '#3D5A50' : colors.primary) + '20' },
                      ]}
                    >
                      <Ionicons name="images" size={32} color={isDark ? '#3D5A50' : colors.primary} />
                    </View>
                    <Text style={[styles.optionTitle, { color: colors.text }]}>
                      Upload from Library
                    </Text>
                    <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                      Choose an existing photo
                    </Text>
                  </TouchableOpacity>

                  {/* I'm Done Button */}
                  <TouchableOpacity
                    style={[
                      styles.doneButton,
                      { backgroundColor: isDark ? '#3D5A50' : colors.primary },
                    ]}
                    onPress={handleDone}
                  >
                    <Text style={styles.doneButtonText}>I'm Done</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          ) : (
            // Initial state - show all three options
            <>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Share a photo that represents your devotional moment today
              </Text>

              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={isDark ? '#3D5A50' : colors.primary} />
                  <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                    {uploading ? 'Uploading your devotional...' : 'Processing...'}
                  </Text>
                </View>
              ) : (
                <View style={styles.optionsContainer}>
                  {/* Take Photo */}
                  <TouchableOpacity
                    style={[
                      styles.optionCard,
                      { backgroundColor: colors.card, borderColor: colors.cardBorder },
                    ]}
                    onPress={handleTakePhoto}
                  >
                    <View
                      style={[
                        styles.iconContainer,
                        { backgroundColor: (isDark ? '#3D5A50' : colors.primary) + '20' },
                      ]}
                    >
                      <Ionicons name="camera" size={32} color={isDark ? '#3D5A50' : colors.primary} />
                    </View>
                    <Text style={[styles.optionTitle, { color: colors.text }]}>
                      Take Photo
                    </Text>
                    <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                      Capture this moment
                    </Text>
                  </TouchableOpacity>

                  {/* Upload from Library */}
                  <TouchableOpacity
                    style={[
                      styles.optionCard,
                      { backgroundColor: colors.card, borderColor: colors.cardBorder },
                    ]}
                    onPress={handleUploadFromLibrary}
                  >
                    <View
                      style={[
                        styles.iconContainer,
                        { backgroundColor: (isDark ? '#3D5A50' : colors.primary) + '20' },
                      ]}
                    >
                      <Ionicons name="images" size={32} color={isDark ? '#3D5A50' : colors.primary} />
                    </View>
                    <Text style={[styles.optionTitle, { color: colors.text }]}>
                      Upload from Library
                    </Text>
                    <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                      Choose an existing photo
                    </Text>
                  </TouchableOpacity>

                  {/* Complete In-App Devotional */}
                  <TouchableOpacity
                    style={[
                      styles.optionCard,
                      { 
                        backgroundColor: colors.card, 
                        borderColor: allCompleted ? (isDark ? '#3D5A50' : colors.primary) : colors.cardBorder,
                        borderWidth: allCompleted ? 2 : 1,
                      },
                    ]}
                    onPress={handleCompleteInAppDevotional}
                  >
                    <View
                      style={[
                        styles.iconContainer,
                        { backgroundColor: (isDark ? '#3D5A50' : colors.primary) + '20' },
                      ]}
                    >
                      <Ionicons name="checkmark-circle" size={32} color={isDark ? '#3D5A50' : colors.primary} />
                    </View>
                    <Text style={[styles.optionTitle, { color: colors.text }]}>
                      Complete In-App Devotional
                    </Text>
                    <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                      {allCompleted 
                        ? 'All items completed ✓' 
                        : 'Complete Scripture, Devotional, and Prayer first'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonDisabled: {
    opacity: 0.5,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
  },
  optionsContainer: {
    gap: 16,
  },
  optionCard: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  optionTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 6,
  },
  optionDesc: {
    fontSize: 14,
    textAlign: 'center',
  },
  successHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  doneButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
});

