import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';
import { Header, Button } from '../../../components';
import { useDailyDevotional } from '../hooks/useDailyDevotional';
import { useAppStore } from '../../../store/useAppStore';
import { supabase } from '../../../lib/supabase';
import { Prayer, Profile } from '../../../types/database';

type PrayerWithProfile = Prayer & { profiles: Profile };

export const PrayerDetailScreen: React.FC = () => {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation();
  const { devotional, markPrayerComplete } = useDailyDevotional();
  const { currentGroup } = useAppStore();

  const [completing, setCompleting] = useState(false);
  const [prayerRequest, setPrayerRequest] = useState<PrayerWithProfile | null>(null);
  const [loadingPrayer, setLoadingPrayer] = useState(true);

  // Fetch a random prayer request from the prayer wall
  const fetchRandomPrayer = useCallback(async () => {
    if (!currentGroup?.id) {
      setLoadingPrayer(false);
      return;
    }

    setLoadingPrayer(true);
    try {
      const { data: prayersData, error } = await supabase
        .from('prayers')
        .select('*, profiles(*)')
        .eq('group_id', currentGroup.id)
        .eq('is_answered', false)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching prayers:', error);
        setLoadingPrayer(false);
        return;
      }

      if (prayersData && prayersData.length > 0) {
        // Randomly select one prayer request
        const randomIndex = Math.floor(Math.random() * prayersData.length);
        setPrayerRequest(prayersData[randomIndex] as PrayerWithProfile);
      }
    } catch (error) {
      console.error('Error in fetchRandomPrayer:', error);
    } finally {
      setLoadingPrayer(false);
    }
  }, [currentGroup?.id]);

  useEffect(() => {
    fetchRandomPrayer();
  }, [fetchRandomPrayer]);

  const handleComplete = async () => {
    setCompleting(true);
    try {
      await markPrayerComplete();
      // Small delay to ensure database update is reflected
      await new Promise(resolve => setTimeout(resolve, 300));
      navigation.goBack();
    } catch (error: any) {
      console.error('Error marking prayer complete:', error);
      Alert.alert('Error', error?.message || 'Failed to mark as complete');
    } finally {
      setCompleting(false);
    }
  };

  const prayerText = devotional?.reflect_pray?.prayer || '';
  const enrichedPrayer = prayerRequest
    ? `${prayerText} Today I also pray for ${prayerRequest.profiles.full_name}'s prayer for "${prayerRequest.title}".`
    : prayerText;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Header
        leftElement={
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons
                name="chevron-back"
                size={24}
                color={isDark ? '#3D5A50' : colors.primary}
              />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Prayer
            </Text>
          </View>
        }
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {loadingPrayer ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={isDark ? '#3D5A50' : colors.primary} />
          </View>
        ) : (
          <>
            {/* Prayer Text */}
            <View style={[styles.prayerContainer, { backgroundColor: isDark ? '#2A2A2A' : '#F5F4F0' }]}>
              <Text style={[styles.prayerText, { color: colors.text }]}>
                {enrichedPrayer}
              </Text>
            </View>

            {/* Prayer Request Info */}
            {prayerRequest && (
              <View style={styles.prayerRequestContainer}>
                <View style={styles.prayerRequestHeader}>
                  <Ionicons name="heart-outline" size={20} color={colors.primary} />
                  <Text style={[styles.prayerRequestLabel, { color: colors.textSecondary }]}>
                    Also Praying For
                  </Text>
                </View>
                <Text style={[styles.prayerRequestTitle, { color: colors.text }]}>
                  {prayerRequest.title}
                </Text>
                {prayerRequest.content && (
                  <Text style={[styles.prayerRequestContent, { color: colors.textSecondary }]}>
                    {prayerRequest.content}
                  </Text>
                )}
                <Text style={[styles.prayerRequestAuthor, { color: colors.textMuted }]}>
                  — {prayerRequest.profiles.full_name}
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Complete Button */}
      <View style={[styles.footer, { borderTopColor: colors.cardBorder }]}>
        <Button
          title="Complete"
          onPress={handleComplete}
          loading={completing}
          fullWidth
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  prayerContainer: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
  },
  prayerText: {
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '400',
  },
  prayerRequestContainer: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  prayerRequestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  prayerRequestLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  prayerRequestTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  prayerRequestContent: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  prayerRequestAuthor: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    backgroundColor: 'transparent',
  },
});
