import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Modal,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../theme/ThemeContext';
import { Card, Avatar, PillToggle, ProfileSkeleton } from '../../components';
import { useAppStore } from '../../store/useAppStore';
import { queryKeys } from '../../lib/queryKeys';
import { MainStackParamList } from '../../navigation/MainNavigator';
import { useQueryClient } from '@tanstack/react-query';
import { fetchUserProfile } from '../../lib/profileApi';
import type { DevotionalWithEngagement } from '../../lib/profileApi';
import { pickAndUploadAvatar, showAvatarSourceOptions, updateProfileAvatar } from '../../lib/avatarUpload';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = 20;
const GRID_GAP = 2;
const IMAGE_SIZE = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * 2) / 3;

type ProfileScreenRouteProp = RouteProp<MainStackParamList, 'Profile'>;

export const ProfileScreen: React.FC = () => {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<ProfileScreenRouteProp>();
  const { currentGroup, session } = useAppStore();
  const queryClient = useQueryClient();

  const { userId } = route.params;
  const currentUserId = session?.user?.id;
  const isOwnProfile = userId === currentUserId;

  // Toggle state
  const [selectedTab, setSelectedTab] = useState<'Devotionals' | 'Prayers'>('Devotionals');
  const [prayerFilter, setPrayerFilter] = useState<'Praying' | 'Answered'>('Praying');
  const [showPrayerFilterMenu, setShowPrayerFilterMenu] = useState(false);

  // Fetch profile data with optimized caching
  const {
    data: profileData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.profile.detail(userId),
    queryFn: () => fetchUserProfile(userId, currentGroup?.id || '', currentUserId || ''),
    enabled: !!userId && !!currentGroup?.id && !!currentUserId,
    staleTime: 5 * 60 * 1000, // 5 minutes - profile data doesn't change often
    gcTime: 15 * 60 * 1000, // 15 minutes - keep in cache longer
    retry: 2, // Retry failed requests twice
    retryDelay: 1000, // Wait 1s between retries
  });


  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleAvatarPress = async () => {
    if (!isOwnProfile || !currentUserId) return;

    // Show options: Camera, Library, or Remove (if avatar exists)
    const hasAvatar = profileData?.profile?.avatar_url;
    
    Alert.alert(
      'Profile Picture',
      'Choose an option',
      [
        {
          text: 'Camera',
          onPress: () => handleUploadAvatar('camera'),
        },
        {
          text: 'Photo Library',
          onPress: () => handleUploadAvatar('library'),
        },
        ...(hasAvatar ? [{
          text: 'Remove Photo',
          style: 'destructive' as const,
          onPress: handleRemoveAvatar,
        }] : []),
        {
          text: 'Cancel',
          style: 'cancel' as const,
        },
      ]
    );
  };

  const handleUploadAvatar = async (source: 'camera' | 'library') => {
    if (!currentUserId) return;

    try {
      const result = await pickAndUploadAvatar(currentUserId, source);
      
      if (result.success && result.avatarUrl) {
        // Update profile with new avatar
        const updateResult = await updateProfileAvatar(currentUserId, result.avatarUrl);
        
        if (updateResult.success) {
          // Immediately update the store profile and group members
          const { fetchProfile, fetchGroupMembers } = useAppStore.getState();
          await Promise.all([
            fetchProfile(),
            fetchGroupMembers(),
          ]);
          
          // Force refetch this profile screen
          await refetch();
          
          // Aggressively clear all related caches and force refetch
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: queryKeys.profile.all, refetchType: 'all' }),
            queryClient.invalidateQueries({ queryKey: queryKeys.devotionals.all, refetchType: 'all' }),
            queryClient.invalidateQueries({ queryKey: queryKeys.groups.all, refetchType: 'all' }),
          ]);
          
          // Force immediate refetch of active queries
          await Promise.all([
            queryClient.refetchQueries({ queryKey: queryKeys.profile.all, type: 'active' }),
            queryClient.refetchQueries({ queryKey: queryKeys.devotionals.all, type: 'active' }),
            queryClient.refetchQueries({ queryKey: queryKeys.groups.all, type: 'active' }),
          ]);
          
          Alert.alert('Success', 'Profile picture updated!');
        } else {
          Alert.alert('Error', updateResult.error || 'Failed to update profile');
        }
      } else {
        Alert.alert('Error', result.error || 'Failed to upload avatar');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile picture');
    }
  };

  const handleRemoveAvatar = async () => {
    if (!currentUserId) return;

    try {
      const updateResult = await updateProfileAvatar(currentUserId, null);
      
      if (updateResult.success) {
        // Immediately update the store profile and group members
        const { fetchProfile, fetchGroupMembers } = useAppStore.getState();
        await Promise.all([
          fetchProfile(),
          fetchGroupMembers(),
        ]);
        
        // Force refetch this profile screen
        await refetch();
        
        // Aggressively clear all related caches and force refetch
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.profile.all, refetchType: 'all' }),
          queryClient.invalidateQueries({ queryKey: queryKeys.devotionals.all, refetchType: 'all' }),
          queryClient.invalidateQueries({ queryKey: queryKeys.groups.all, refetchType: 'all' }),
        ]);
        
        // Force immediate refetch of active queries
        await Promise.all([
          queryClient.refetchQueries({ queryKey: queryKeys.profile.all, type: 'active' }),
          queryClient.refetchQueries({ queryKey: queryKeys.devotionals.all, type: 'active' }),
          queryClient.refetchQueries({ queryKey: queryKeys.groups.all, type: 'active' }),
        ]);
        
        Alert.alert('Success', 'Profile picture removed');
      } else {
        Alert.alert('Error', updateResult.error || 'Failed to remove profile picture');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to remove profile picture');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {isOwnProfile ? 'My Profile' : 'Profile'}
          </Text>
          {isOwnProfile ? (
            <TouchableOpacity
              onPress={() => navigation.navigate('Settings')}
              style={styles.settingsButton}
              accessibilityRole="button"
              accessibilityLabel="Open settings"
            >
              <Ionicons name="settings-outline" size={24} color={colors.text} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 28 }} />
          )}
        </View>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <ProfileSkeleton />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (error || !profileData) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <Ionicons name="person-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Profile not found</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            This user's profile is not available.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profileData.isSameGroup) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <Ionicons name="lock-closed-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Profile unavailable</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            This profile is only visible to members of the same group.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const { profile, stats, devotionals, prayers } = profileData;

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
          {isOwnProfile ? 'My Profile' : profile.full_name || 'Profile'}
        </Text>
        {isOwnProfile ? (
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings')}
            style={styles.settingsButton}
            accessibilityRole="button"
            accessibilityLabel="Open settings"
          >
            <Ionicons name="settings-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 28 }} />
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <Avatar 
            name={profile.full_name} 
            imageUrl={profile.avatar_url} 
            size={100}
            onPress={isOwnProfile ? handleAvatarPress : undefined}
            backgroundColor={colors.primary}
          />
          {isOwnProfile && (
            <Text style={[styles.avatarHint, { color: colors.textMuted }]}>
              Tap to change photo
            </Text>
          )}
          <Text style={[styles.profileName, { color: colors.text }]}>
            {profile.full_name || 'User'}
          </Text>
        </View>

        {/* KPI Cards - Horizontal Row */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <View style={styles.iconRow}>
              <Ionicons name="library" size={20} color={isDark ? '#3D5A50' : colors.primary} />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {stats.totalDevotionals}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Devotionals</Text>
          </Card>
          <Card style={styles.statCard}>
            <View style={styles.iconRow}>
              <MaterialCommunityIcons name="hands-pray" size={20} color={isDark ? '#3D5A50' : colors.primary} />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {stats.totalPrayers}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Prayers</Text>
          </Card>
          <Card style={styles.statCard}>
            <View style={styles.iconRow}>
              <Ionicons name="trophy" size={20} color={isDark ? '#3D5A50' : colors.primary} />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {stats.contributionScore}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Contribution</Text>
          </Card>
          <Card style={styles.statCard}>
            <View style={styles.iconRow}>
              <Ionicons name="flame" size={20} color="#FF6B35" />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {stats.currentStreak}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Day Streak</Text>
          </Card>
        </View>

        {/* Toggle between Devotionals and Prayers */}
        <View style={styles.toggleContainer}>
          <PillToggle
            options={['Devotionals', 'Prayers']}
            selected={selectedTab}
            onSelect={(option) => setSelectedTab(option as 'Devotionals' | 'Prayers')}
          />
        </View>

        {/* Content based on selected tab - both kept mounted so Devotionals images stay cached when switching tabs */}
        <View style={[styles.gridSection, selectedTab !== 'Devotionals' && styles.tabHidden]}>
          {devotionals.length === 0 ? (
            <View style={styles.emptyGridState}>
              <Ionicons name="images-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No devotionals yet
              </Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {devotionals.map((devotional) => (
                <TouchableOpacity
                  key={devotional.id}
                  style={styles.gridItem}
                  onPress={() =>
                    navigation.navigate('UserDevotionalsList', {
                      userId: userId,
                      userName: profile.full_name || 'User',
                      initialDevotionalId: devotional.id,
                    })
                  }
                  activeOpacity={0.9}
                >
                  <Image
                    source={{ uri: devotional.image_url || '' }}
                    style={styles.gridImage}
                    resizeMode="cover"
                  />
                  {/* Engagement stats in top right */}
                  <View style={styles.gridOverlay}>
                    {devotional.likes_count > 0 && (
                      <View style={styles.gridStat}>
                        <Ionicons name="heart" size={14} color="#FFFFFF" />
                        <Text style={styles.gridStatText}>{devotional.likes_count}</Text>
                      </View>
                    )}
                    {devotional.comments_count > 0 && (
                      <View style={styles.gridStat}>
                        <Ionicons name="chatbubble" size={14} color="#FFFFFF" />
                        <Text style={styles.gridStatText}>{devotional.comments_count}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={[styles.section, selectedTab !== 'Prayers' && styles.tabHidden]}>
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
                  <View style={styles.emptySection}>
                    <Ionicons name="hand-left-outline" size={32} color={colors.textMuted} />
                    <Text style={[styles.emptySectionText, { color: colors.textMuted }]}>
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
          </View>
      </ScrollView>

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
  settingsButton: {
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
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 32,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarHint: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 16,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  iconRow: {
    marginBottom: 8,
  },
  toggleContainer: {
    marginBottom: 20,
  },
  tabHidden: {
    display: 'none', // Keeps tab content mounted so Devotionals images stay cached when switching to Prayers and back
  },
  gridSection: {
    flex: 1,
  },
  emptyGridState: {
    alignItems: 'center',
    paddingVertical: 64,
    gap: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  gridItem: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E8E7E2',
    borderRadius: 2,
  },
  gridOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gridStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 12,
  },
  gridStatText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  section: {
    marginBottom: 24,
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
  emptySection: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  emptySectionText: {
    fontSize: 14,
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
