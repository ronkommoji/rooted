import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { WeeklyChallenge } from '../data/weeklyChallenge';

interface ChallengeDetailModalProps {
  visible: boolean;
  challenge: WeeklyChallenge | null;
  onClose: () => void;
}

export const ChallengeDetailModal: React.FC<ChallengeDetailModalProps> = ({
  visible,
  challenge,
  onClose,
}) => {
  const { colors, isDark } = useTheme();

  if (!challenge) return null;

  const iconColor = isDark ? '#E6C68B' : '#8B6F47';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: colors.card }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: isDark ? '#3D4D49' : '#E8E7E2' }]}>
            <View style={styles.headerLeft}>
              <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
                <Ionicons name="trophy-outline" size={24} color={iconColor} />
              </View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                Challenge of the Week
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Verse of the Week Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                VERSE OF THE WEEK
              </Text>
              <View style={[styles.verseContainer, { backgroundColor: colors.background + '80' }]}>
                <Text style={[styles.verseText, { color: colors.text }]}>
                  "{challenge.scripture}"
                </Text>
                <Text style={[styles.reference, { color: colors.textSecondary }]}>
                  — {challenge.reference}
                </Text>
              </View>
            </View>

            {/* Challenge Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                THIS WEEK'S CHALLENGE
              </Text>
              <Text style={[styles.challengeDescription, { color: colors.text }]}>
                {challenge.challenge}
              </Text>
            </View>

            {/* Description Section */}
            <View style={styles.section}>
              <Text style={[styles.description, { color: colors.textSecondary }]}>
                Take time this week to reflect on this verse and incorporate the challenge into your daily routine. Share your progress with your group and encourage one another in faith.
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  verseContainer: {
    padding: 20,
    borderRadius: 12,
    marginTop: 8,
  },
  verseText: {
    fontSize: 18,
    fontWeight: '500',
    fontStyle: 'italic',
    lineHeight: 26,
    marginBottom: 12,
    textAlign: 'center',
  },
  reference: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  challengeDescription: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 26,
    marginTop: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
});

