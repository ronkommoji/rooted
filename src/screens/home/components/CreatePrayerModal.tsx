/**
 * CreatePrayerModal Component
 *
 * Modal for creating a new prayer request.
 * Extracted from HomeScreen to improve code organization.
 *
 * Features:
 * - Title and content fields
 * - Form validation
 * - Loading state during submission
 * - Keyboard-aware layout
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../theme/ThemeContext';
import { Button, Input } from '../../../components';
import { supabase } from '../../../lib/supabase';

export interface CreatePrayerModalProps {
  visible: boolean;
  onClose: () => void;
  onPrayerCreated: () => void;
  currentGroupId?: string;
  currentUserId?: string;
}

export const CreatePrayerModal: React.FC<CreatePrayerModalProps> = ({
  visible,
  onClose,
  onPrayerCreated,
  currentGroupId,
  currentUserId,
}) => {
  const { colors } = useTheme();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [creating, setCreating] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a prayer title');
      return;
    }

    if (!currentGroupId || !currentUserId) {
      Alert.alert('Error', 'Group or user information missing');
      return;
    }

    setCreating(true);
    try {
      const { error } = await supabase
        .from('prayers')
        .insert({
          group_id: currentGroupId,
          user_id: currentUserId,
          title: title.trim(),
          content: content.trim() || null,
        });

      if (error) throw error;

      // Reset form
      setTitle('');
      setContent('');
      onClose();
      onPrayerCreated();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create prayer request');
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    if (!creating) {
      setTitle('');
      setContent('');
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContent}
        >
          <View style={[styles.modalHeader, { borderBottomColor: colors.cardBorder }]}>
            <TouchableOpacity onPress={handleClose} disabled={creating}>
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              New Prayer Request
            </Text>
            <View style={{ width: 50 }} />
          </View>

          <View style={styles.modalForm}>
            <Input
              label="Prayer Title"
              placeholder="What would you like prayer for?"
              value={title}
              onChangeText={setTitle}
              editable={!creating}
            />

            <Input
              label="Details (optional)"
              placeholder="Share more about your prayer request..."
              value={content}
              onChangeText={setContent}
              multiline
              numberOfLines={5}
              containerStyle={{ marginBottom: 24 }}
              editable={!creating}
            />

            <Button
              title="Submit Prayer Request"
              onPress={handleSubmit}
              loading={creating}
              fullWidth
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  modalContent: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  cancelText: {
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  modalForm: {
    padding: 20,
  },
});
