import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { startOfWeek } from 'date-fns';
import { useTheme } from '../../theme/ThemeContext';
import { Card, Header } from '../../components';
import { useAppStore } from '../../store/useAppStore';
import {
  WeekDayPicker,
  DailySummary,
  StoryRow,
  SubmissionCard,
  AddDevotionalSheet,
  StoryViewerModal,
} from './components';
import { useDevotionals } from './hooks';

export const DevotionalsScreen: React.FC = () => {
  const { colors } = useTheme();
  const { session } = useAppStore();

  // State
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 0 })
  );
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [storyViewerStartMember, setStoryViewerStartMember] = useState('');
  const [uploading, setUploading] = useState(false);

  // Use the devotionals hook
  const {
    memberSubmissions,
    feedSubmissions,
    currentUserHasPosted,
    completedCount,
    totalMembers,
    currentUserStreak,
    loading,
    refreshing,
    onRefresh,
    addDevotional,
    deleteDevotional,
    toggleLike,
    uploadImage,
  } = useDevotionals(selectedDate);

  const currentUserId = session?.user?.id || '';

  // Handlers
  const handleMemberStoryPress = (memberId: string) => {
    setStoryViewerStartMember(memberId);
    setShowStoryViewer(true);
  };

  const handleAddDevotional = async (imageUri: string) => {
    setUploading(true);
    try {
      // Upload image to Supabase Storage
      const publicUrl = await uploadImage(imageUri);
      
      if (!publicUrl) {
        Alert.alert('Error', 'Failed to upload image. Please try again.');
        return;
      }

      // Create devotional with the uploaded image URL
      await addDevotional(publicUrl);
      setShowAddSheet(false);
    } catch (error: any) {
      console.error('Error adding devotional:', error);
      Alert.alert('Error', error.message || 'Failed to add devotional');
    } finally {
      setUploading(false);
    }
  };

  const handleLikePress = (memberId: string) => {
    const submission = feedSubmissions.find((s) => s.memberId === memberId);
    if (submission?.devotionalId) {
      toggleLike(submission.devotionalId);
    }
  };

  const handleWeekChange = (newWeekStart: Date) => {
    setWeekStart(newWeekStart);
  };

  const handleDaySelect = (date: Date) => {
    setSelectedDate(date);
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, styles.loadingContainer, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading devotionals...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <Header title="Devotionals" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Week/Day Picker */}
        <WeekDayPicker
          weekStart={weekStart}
          selectedDate={selectedDate}
          onWeekChange={handleWeekChange}
          onDaySelect={handleDaySelect}
        />

        {/* Daily Summary */}
        <DailySummary
          selectedDate={selectedDate}
          completedCount={completedCount}
          totalMembers={totalMembers}
          currentUserStreak={currentUserStreak}
        />

        {/* Story Row */}
        {memberSubmissions.length > 0 ? (
          <StoryRow
            members={memberSubmissions}
            currentUserId={currentUserId}
            currentUserHasPosted={currentUserHasPosted}
            onMemberPress={handleMemberStoryPress}
            onAddPress={() => setShowAddSheet(true)}
          />
        ) : (
          <View style={styles.noMembersContainer}>
            <Text style={[styles.noMembersText, { color: colors.textSecondary }]}>
              No group members yet
            </Text>
          </View>
        )}

        {/* Submissions Feed */}
        <View style={styles.feedSection}>
          <Text style={[styles.feedTitle, { color: colors.text }]}>
            Today's Submissions
          </Text>

          {feedSubmissions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Card style={styles.emptyCard}>
                <Ionicons
                  name="images-outline"
                  size={48}
                  color={colors.textMuted}
                  style={styles.emptyIcon}
                />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  No submissions yet
                </Text>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Be the first to share your devotional today!
                </Text>
                {!currentUserHasPosted && (
                  <TouchableOpacity
                    style={[styles.addButton, { backgroundColor: colors.primary }]}
                    onPress={() => setShowAddSheet(true)}
                  >
                    <Ionicons name="add" size={20} color="#FFFFFF" />
                    <Text style={styles.addButtonText}>
                      Add today's devotional
                    </Text>
                  </TouchableOpacity>
                )}
              </Card>
            </View>
          ) : (
            feedSubmissions.map((submission) => (
              <SubmissionCard
                key={submission.memberId}
                submission={submission}
                isOwnPost={submission.memberId === currentUserId}
                onImagePress={() => handleMemberStoryPress(submission.memberId)}
                onLikePress={() => handleLikePress(submission.memberId)}
                onDeletePress={
                  submission.devotionalId
                    ? () => deleteDevotional(submission.devotionalId!)
                    : undefined
                }
                isLiked={false} // Will be managed by the hook
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* FAB for adding devotional */}
      {!currentUserHasPosted && feedSubmissions.length > 0 && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={() => setShowAddSheet(true)}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Add Devotional Sheet */}
      <AddDevotionalSheet
        visible={showAddSheet}
        onClose={() => setShowAddSheet(false)}
        onImageSelected={handleAddDevotional}
        uploading={uploading}
      />

      {/* Story Viewer Modal */}
      <StoryViewerModal
        visible={showStoryViewer}
        stories={memberSubmissions}
        initialMemberId={storyViewerStartMember}
        onClose={() => setShowStoryViewer(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  noMembersContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noMembersText: {
    fontSize: 14,
  },
  feedSection: {
    marginTop: 8,
  },
  feedTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  emptyContainer: {
    paddingTop: 20,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 6,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
});
