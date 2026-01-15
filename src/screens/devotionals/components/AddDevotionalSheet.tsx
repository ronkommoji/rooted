import React, { useState } from 'react';
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

interface AddDevotionalSheetProps {
  visible: boolean;
  onClose: () => void;
  onImageSelected: (imageUri: string) => void;
  uploading?: boolean;
}

export const AddDevotionalSheet: React.FC<AddDevotionalSheetProps> = ({
  visible,
  onClose,
  onImageSelected,
  uploading = false,
}) => {
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  
  const isLoading = loading || uploading;

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
            </View>
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
});

