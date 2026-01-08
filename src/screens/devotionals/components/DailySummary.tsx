import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';

interface DailySummaryProps {
  selectedDate: Date;
  completedCount: number;
  totalMembers: number;
  currentUserStreak: number;
}

export const DailySummary: React.FC<DailySummaryProps> = ({
  selectedDate,
  completedCount,
  totalMembers,
  currentUserStreak,
}) => {
  const { colors, isDark } = useTheme();
  
  // Use dark green in dark mode
  const primaryColor = isDark ? '#3D5A50' : colors.primary;
  const [showStreakInfo, setShowStreakInfo] = useState(false);

  const progressPercent = totalMembers > 0 ? (completedCount / totalMembers) * 100 : 0;

  return (
    <View style={styles.container}>
      {/* Date Label with Streak */}
      <View style={styles.dateRow}>
        <Text style={[styles.dateLabel, { color: colors.text }]}>
          {format(selectedDate, 'MMMM d, yyyy')}
        </Text>
        
        {currentUserStreak > 0 && (
          <TouchableOpacity 
            style={[styles.streakBadge, { borderColor: colors.cardBorder }]}
            onPress={() => setShowStreakInfo(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="flame" size={16} color="#F97316" />
            <Text style={[styles.streakNumber, { color: colors.text }]}>
              {currentUserStreak}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { backgroundColor: colors.cardBorder }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: primaryColor,
                width: `${progressPercent}%`,
              },
            ]}
          />
        </View>
        <Text style={[styles.progressText, { color: colors.textSecondary }]}>
          {completedCount} / {totalMembers} completed
        </Text>
      </View>

      {/* Streak Info Modal */}
      <Modal
        visible={showStreakInfo}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStreakInfo(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowStreakInfo(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Ionicons name="flame" size={32} color="#F97316" />
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Streaks
              </Text>
            </View>
            
            <Text style={[styles.modalText, { color: colors.textSecondary }]}>
              Your streak counts how many days in a row you've shared a devotional.
            </Text>
            
            <Text style={[styles.modalText, { color: colors.textSecondary }]}>
              Post daily to keep your streak going! Missing a day resets it to zero.
            </Text>

            <TouchableOpacity 
              style={[styles.modalButton, { backgroundColor: primaryColor }]}
              onPress={() => setShowStreakInfo(false)}
            >
              <Text style={styles.modalButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dateLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  streakNumber: {
    fontSize: 14,
    fontWeight: '700',
  },
  progressContainer: {
    marginBottom: 0,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  modalContent: {
    width: '100%',
    maxWidth: 300,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 12,
  },
  modalButton: {
    marginTop: 8,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
