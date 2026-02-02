import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../theme/ThemeContext';
import { Card } from '../../components';
import { useAppStore } from '../../store/useAppStore';
import { supabase } from '../../lib/supabase';
import { queryKeys } from '../../lib/queryKeys';
import { MainStackParamList } from '../../navigation/MainNavigator';
import type { Tables } from '../../types/database';

type UserPrayersListRouteProp = RouteProp<MainStackParamList, 'UserPrayersList'>;

interface PrayerWithProfile extends Tables<'prayers'> {
  profiles: Tables<'profiles'>;
}

const fetchUserPrayers = async (
  userId: string,
  groupId: string
): Promise<PrayerWithProfile[]> => {
  const { data, error } = await supabase
    .from('prayers')
    .select('*, profiles(*)')
    .eq('user_id', userId)
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as PrayerWithProfile[];
};

export const UserPrayersListScreen: React.FC = () => {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<UserPrayersListRouteProp>();
  const { currentGroup } = useAppStore();

  const { userId, userName } = route.params;
  const [prayerFilter, setPrayerFilter] = useState<'Praying' | 'Answered'>('Praying');
  const [showPrayerFilterMenu, setShowPrayerFilterMenu] = useState(false);

  const { data: prayers = [], isLoading } = useQuery({
    queryKey: [...queryKeys.prayers.byGroup(currentGroup?.id || ''), 'user', userId],
    queryFn: () => fetchUserPrayers(userId, currentGroup?.id || ''),
    enabled: !!userId && !!currentGroup?.id,
    staleTime: 2 * 60 * 1000,
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {userName}'s Prayers
        </Text>
        <View style={{ width: 28 }} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={isDark ? '#3D5A50' : colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Prayer Filter Button */}
          <View style={styles.prayerFilterHeader}>
            <Text style={[styles.filterLabel, { color: colors.textMuted }]}>
              Showing: {prayerFilter}
            </Text>
            <TouchableOpacity
              style={[styles.filterButton, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              onPress={() => setShowPrayerFilterMenu(true)}
              accessibilityRole="button"
              accessibilityLabel="Filter prayers"
            >
              <Ionicons name="filter-outline" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          {(() => {
            const filteredPrayers = prayers.filter((prayer) =>
              prayerFilter === 'Praying' ? !prayer.is_answered : prayer.is_answered
            );

            return filteredPrayers.length === 0 ? (
              <Card>
                <View style={styles.emptyContainer}>
                  <Ionicons name="hand-left-outline" size={48} color={colors.textMuted} />
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                    {prayerFilter === 'Praying'
                      ? 'No active prayer requests'
                      : 'No answered prayers yet'}
                  </Text>
                </View>
              </Card>
            ) : (
              filteredPrayers.map((prayer) => (
              <Card key={prayer.id} style={styles.prayerCard}>
                <View style={styles.prayerHeader}>
                  <View style={styles.prayerTitleRow}>
                    <Text style={[styles.prayerTitle, { color: colors.text }]}>
                      {prayer.title}
                    </Text>
                    {prayer.is_answered ? (
                      <View style={[styles.answeredBadge, { backgroundColor: '#4CAF50' }]}>
                        <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
                        <Text style={styles.answeredText}>Answered</Text>
                      </View>
                    ) : (
                      <View
                        style={[
                          styles.prayingBadge,
                          { backgroundColor: isDark ? '#3D5A50' : colors.primary },
                        ]}
                      >
                        <Ionicons name="heart" size={14} color="#FFFFFF" />
                        <Text style={styles.prayingText}>Praying</Text>
                      </View>
                    )}
                  </View>
                  {prayer.content && (
                    <Text
                      style={[styles.prayerContent, { color: colors.textSecondary }]}
                      numberOfLines={2}
                    >
                      {prayer.content}
                    </Text>
                  )}
                </View>
                <View style={styles.prayerFooter}>
                  <View style={styles.prayerMeta}>
                    <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
                    <Text style={[styles.itemDate, { color: colors.textMuted }]}>
                      {formatDate(prayer.created_at || '')}
                    </Text>
                  </View>
                  {prayer.prayer_count > 0 && (
                    <View style={styles.prayerCount}>
                      <Ionicons name="heart" size={14} color="#E57373" />
                      <Text style={[styles.prayerCountText, { color: colors.textMuted }]}>
                        {prayer.prayer_count} prayed
                      </Text>
                    </View>
                  )}
                </View>
              </Card>
              ))
            );
          })()}
        </ScrollView>
      )}

      {/* Prayer Filter Menu Modal */}
      <Modal
        visible={showPrayerFilterMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPrayerFilterMenu(false)}
      >
        <TouchableOpacity
          style={styles.filterMenuOverlay}
          activeOpacity={1}
          onPress={() => setShowPrayerFilterMenu(false)}
        >
          <View style={[styles.filterMenuContainer, { backgroundColor: colors.card }]}>
            <TouchableOpacity
              style={styles.filterMenuItem}
              onPress={() => {
                setPrayerFilter('Praying');
                setShowPrayerFilterMenu(false);
              }}
            >
              <View style={styles.filterMenuItemContent}>
                <Ionicons name="heart" size={20} color={isDark ? '#3D5A50' : colors.primary} />
                <Text style={[styles.filterMenuItemText, { color: colors.text }]}>
                  Praying
                </Text>
              </View>
              {prayerFilter === 'Praying' && (
                <Ionicons name="checkmark" size={20} color={isDark ? '#3D5A50' : colors.primary} />
              )}
            </TouchableOpacity>

            <View style={[styles.filterMenuDivider, { backgroundColor: colors.cardBorder }]} />

            <TouchableOpacity
              style={styles.filterMenuItem}
              onPress={() => {
                setPrayerFilter('Answered');
                setShowPrayerFilterMenu(false);
              }}
            >
              <View style={styles.filterMenuItemContent}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={[styles.filterMenuItemText, { color: colors.text }]}>
                  Answered
                </Text>
              </View>
              {prayerFilter === 'Answered' && (
                <Ionicons name="checkmark" size={20} color={isDark ? '#3D5A50' : colors.primary} />
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
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
    paddingVertical: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  prayerFilterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  filterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterMenuContainer: {
    width: 250,
    borderRadius: 16,
    overflow: 'hidden',
  },
  filterMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  filterMenuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterMenuItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  filterMenuDivider: {
    height: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
  },
  prayerCard: {
    marginBottom: 12,
  },
  prayerHeader: {
    marginBottom: 12,
  },
  prayerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  prayerTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  answeredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  answeredText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  prayingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  prayingText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  prayerContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  prayerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  prayerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemDate: {
    fontSize: 12,
  },
  prayerCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  prayerCountText: {
    fontSize: 12,
  },
});
