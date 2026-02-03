import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';

export const StoryRowSkeleton: React.FC = () => {
  const { colors, isDark } = useTheme();
  
  const skeletonBg = isDark ? '#2A2A2A' : '#E8E7E2';

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {[1, 2, 3, 4, 5].map((index) => (
          <View key={index} style={styles.memberContainer}>
            <View
              style={[
                styles.avatarRing,
                { borderColor: colors.cardBorder },
              ]}
            >
              <View
                style={[
                  styles.skeletonAvatar,
                  { backgroundColor: skeletonBg },
                ]}
              />
            </View>
            <View
              style={[
                styles.skeletonName,
                { backgroundColor: skeletonBg },
              ]}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
  },
  scrollContent: {
    paddingHorizontal: 4,
  },
  memberContainer: {
    alignItems: 'center',
    marginRight: 16,
    width: 68,
  },
  avatarRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    padding: 3,
    marginBottom: 6,
  },
  skeletonAvatar: {
    flex: 1,
    borderRadius: 28,
    opacity: 0.6,
  },
  skeletonName: {
    width: 50,
    height: 12,
    borderRadius: 6,
    opacity: 0.6,
  },
});
