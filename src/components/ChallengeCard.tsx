import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { WeeklyChallenge } from '../data/weeklyChallenge';

interface ChallengeCardProps {
  challenge: WeeklyChallenge;
  onPress: () => void;
}

export const ChallengeCard: React.FC<ChallengeCardProps> = ({ challenge, onPress }) => {
  const { colors, isDark } = useTheme();

  // Challenge card colors matching the image
  const cardBg = isDark ? '#2C3A37' : '#F2F0EB'; // Dark muted green/beige or lighter beige
  const iconColor = isDark ? '#8B6F47' : '#8B6F47'; // Brown color for icon (darker brown in dark mode)
  const labelColor = isDark ? '#B0B0B0' : '#6B6B6B'; // Muted text for label
  const challengeTextColor = isDark ? '#FDFBF7' : '#000000'; // Main challenge text

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: cardBg }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        {/* Top Row: Icon + Label */}
        <View style={styles.topRow}>
          {/* Challenge Icon */}
          <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
            <Ionicons name="trophy-outline" size={24} color={iconColor} />
          </View>

          {/* Label - on same row as icon */}
          <Text style={[styles.label, { color: labelColor }]}>
            CHALLENGE OF THE WEEK
          </Text>
        </View>

        {/* Bottom Row: Challenge Text + View Button */}
        <View style={styles.bottomRow}>
          {/* Challenge Text - starts at same left position as icon */}
          <Text style={[styles.challengeText, { color: challengeTextColor }]} numberOfLines={2}>
            {challenge.challenge}
          </Text>

          {/* View Button - on far right, vertically centered */}
          <TouchableOpacity
            style={[styles.viewButton, { backgroundColor: isDark ? colors.primary : iconColor + '30' }]}
            onPress={(e) => {
              e.stopPropagation();
              onPress();
            }}
          >
            <Text style={[styles.viewButtonText, { color: isDark ? colors.background : iconColor }]}>View</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  content: {
    flexDirection: 'column',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    flex: 1,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  challengeText: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
    flex: 1,
    marginRight: 12,
    fontFamily: 'PlayfairDisplay_700Bold', // Playfair Display Bold font for challenge text
  },
  viewButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

