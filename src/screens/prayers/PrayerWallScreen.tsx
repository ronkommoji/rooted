import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList, FlashListRef } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { PIConfetti, PIConfettiMethods } from 'react-native-fast-confetti';
import { useTheme } from '../../theme/ThemeContext';
import { Header, PillToggle, Button, Input, EmptyState } from '../../components';
import { PrayerCard, PrayerWithDetails } from '../../components/prayers/PrayerCard';
import { useAppStore } from '../../store/useAppStore';
import { supabase } from '../../lib/supabase';
import { useNotifications } from '../../hooks/useNotifications';
import { sendPushNotification } from '../../lib/notifications';
import {
  usePrayersQuery,
  useCreatePrayerMutation,
  useUpdatePrayerMutation,
  useDeletePrayerMutation,
  useMarkPrayerAnsweredMutation,
  useIncrementPrayerCountMutation,
  type PrayerWithAuthor,
} from '../../hooks/queries';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const PrayerWallScreen: React.FC = () => {
  const { colors, isDark } = useTheme();
  const { currentGroup, profile, session } = useAppStore();
  const { sendPrayerNotification } = useNotifications();
  
  // Confetti ref for triggering animation
  const confettiRef = useRef<PIConfettiMethods>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiPosition, setConfettiPosition] = useState<{ x: number; y: number } | null>(null);
  
  // Refs to measure prayer card positions
  const prayerCardRefs = useRef<{ [key: string]: View | null }>({});
  
  // Ref for FlashList to enable scrolling
  const listRef = useRef<FlashListRef<PrayerWithDetails>>(null);
  
  const [filter, setFilter] = useState<'Requests' | 'Answered'>('Requests');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPrayerTitle, setNewPrayerTitle] = useState('');
  const [newPrayerContent, setNewPrayerContent] = useState('');

  // Edit state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPrayer, setEditingPrayer] = useState<PrayerWithDetails | null>(null);
  const [editPrayerTitle, setEditPrayerTitle] = useState('');
  const [editPrayerContent, setEditPrayerContent] = useState('');

  // Menu state
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [selectedPrayer, setSelectedPrayer] = useState<PrayerWithDetails | null>(null);

  // Track which prayers are being processed to prevent double-clicks
  const [processingPrayers, setProcessingPrayers] = useState<Set<string>>(new Set());

  // Track which prayer is being animated
  const [animatingPrayerId, setAnimatingPrayerId] = useState<string | null>(null);

  // React Query hooks
  const isAnsweredFilter = filter === 'Answered';
  const {
    data: prayers = [],
    isLoading: loading,
    refetch,
    isFetching,
  } = usePrayersQuery(isAnsweredFilter);

  // Fetch answered count separately
  const { data: answeredPrayers = [] } = usePrayersQuery(true);
  const answeredCount = answeredPrayers.length;

  // Mutations
  const createPrayerMutation = useCreatePrayerMutation();
  const updatePrayerMutation = useUpdatePrayerMutation();
  const deletePrayerMutation = useDeletePrayerMutation();
  const markAnsweredMutation = useMarkPrayerAnsweredMutation();
  const incrementPrayerCountMutation = useIncrementPrayerCountMutation();

  // Convert PrayerWithAuthor to PrayerWithDetails for compatibility
  const prayersWithDetails: PrayerWithDetails[] = prayers.map((prayer: any) => ({
    ...prayer,
    total_prayed: prayer.prayer_count || 0,
  }));

  const onRefresh = async () => {
    await refetch();
  };

  const handlePray = async (prayer: PrayerWithDetails) => {
    if (!session?.user?.id) return;

    // Prevent double-clicks
    if (processingPrayers.has(prayer.id)) return;

    setProcessingPrayers((prev) => new Set(prev).add(prayer.id));

    try {
      await incrementPrayerCountMutation.mutateAsync(prayer.id);

      // Send push notification to prayer author if different from current user
      if (prayer.user_id !== session.user.id && profile) {
        // Check if prayer author has prayer notifications enabled
        const { data: authorPreferences } = await supabase
          .from('user_preferences')
          .select('prayer_notifications')
          .eq('user_id', prayer.user_id)
          .maybeSingle();

        if (authorPreferences?.prayer_notifications !== false) {
          // Send push notification
          await sendPushNotification(
            prayer.user_id,
            'Someone Prayed for You 🙏',
            `${profile.full_name} prayed for "${prayer.title}"`,
            {
              type: 'prayer',
              id: prayer.id,
            }
          );
        }
      }
    } catch (error) {
      console.error('Error incrementing prayer count:', error);
    } finally {
      // Remove from processing set
      setProcessingPrayers((prev) => {
        const next = new Set(prev);
        next.delete(prayer.id);
        return next;
      });
    }
  };

  const handleMarkAnswered = async (prayer: PrayerWithDetails) => {
    if (prayer.user_id !== session?.user?.id) {
      Alert.alert('Error', 'Only the author can mark a prayer as answered');
      return;
    }

    Alert.alert(
      'Mark as Answered',
      'Are you sure you want to mark this prayer as answered?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            // Set animating state to trigger card animation
            setAnimatingPrayerId(prayer.id);
            
            // Measure the prayer card position
            const cardRef = prayerCardRefs.current[prayer.id];
            if (cardRef) {
              // Small delay to ensure the card is rendered with animation state
              setTimeout(() => {
                cardRef.measureInWindow((x, y, width, height) => {
                  // Calculate center of the card
                  const centerX = x + width / 2;
                  const centerY = y + height / 2;
                  
                  // Store position for confetti
                  setConfettiPosition({ x: centerX, y: centerY });
                  
                  // After card animation completes (400ms total), trigger confetti
                  setTimeout(() => {
                    setShowConfetti(true);
                    setTimeout(() => {
                      confettiRef.current?.restart();
                      setAnimatingPrayerId(null);
                    }, 100);
                  }, 400);
                });
              }, 50);
            } else {
              // Fallback to center if we can't measure
              setConfettiPosition({ x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT / 2 });
              setTimeout(() => {
                setShowConfetti(true);
                setTimeout(() => {
                  confettiRef.current?.restart();
                  setAnimatingPrayerId(null);
                }, 100);
              }, 400);
            }

            try {
              await markAnsweredMutation.mutateAsync(prayer.id);

              // Send push notification to OTHER group members
              if (currentGroup?.id) {
                const { data: groupMembers } = await supabase
                  .from('group_members')
                  .select('user_id')
                  .eq('group_id', currentGroup.id);

                if (groupMembers) {
                  // Filter out the current user
                  const otherMembers = groupMembers.filter(
                    (member) => member.user_id !== session?.user?.id
                  );

                  if (otherMembers.length > 0) {
                    // Get preferences for other members
                    const userIds = otherMembers.map((m) => m.user_id);
                    const { data: preferences } = await supabase
                      .from('user_preferences')
                      .select('user_id, prayer_notifications')
                      .in('user_id', userIds);

                    // Send push notifications
                    const notifications = otherMembers
                      .filter((member) => {
                        const userPrefs = preferences?.find((p) => p.user_id === member.user_id);
                        return userPrefs?.prayer_notifications !== false;
                      })
                      .map((member) =>
                        sendPushNotification(
                          member.user_id,
                          '🙏 Prayer Answered!',
                          `"${prayer.title}" has been marked as answered. Praise God!`,
                          {
                            type: 'prayer',
                            id: prayer.id,
                          }
                        )
                      );

                    await Promise.all(notifications);
                  }
                }
              }
            } catch (error) {
              console.error('Error marking prayer as answered:', error);
            }
          },
        },
      ]
    );
  };

  const handleCreatePrayer = async () => {
    if (!newPrayerTitle.trim()) {
      Alert.alert('Error', 'Please enter a prayer title');
      return;
    }

    try {
      await createPrayerMutation.mutateAsync({
        title: newPrayerTitle.trim(),
        content: newPrayerContent.trim() || undefined,
      });

      setShowCreateModal(false);
      setNewPrayerTitle('');
      setNewPrayerContent('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create prayer request');
    }
  };

  const handleOpenMenu = (prayer: PrayerWithDetails) => {
    setSelectedPrayer(prayer);
    setShowMenuModal(true);
  };

  const handleEditPrayer = () => {
    if (!selectedPrayer) return;
    
    setEditingPrayer(selectedPrayer);
    setEditPrayerTitle(selectedPrayer.title);
    setEditPrayerContent(selectedPrayer.content || '');
    setShowMenuModal(false);
    setShowEditModal(true);
  };

  const handleUpdatePrayer = async () => {
    if (!editPrayerTitle.trim()) {
      Alert.alert('Error', 'Please enter a prayer title');
      return;
    }

    if (!editingPrayer) return;

    try {
      await updatePrayerMutation.mutateAsync({
        prayerId: editingPrayer.id,
        title: editPrayerTitle.trim(),
        content: editPrayerContent.trim() || undefined,
      });

      setShowEditModal(false);
      setEditingPrayer(null);
      setEditPrayerTitle('');
      setEditPrayerContent('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update prayer request');
    }
  };

  const handleDeletePrayer = () => {
    if (!selectedPrayer) return;

    setShowMenuModal(false);

    Alert.alert(
      'Delete Prayer',
      'Are you sure you want to delete this prayer request? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePrayerMutation.mutateAsync(selectedPrayer.id);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete prayer');
            }
          },
        },
      ]
    );
  };

  const renderPrayerCard = ({ item: prayer }: { item: PrayerWithDetails }) => {
    const isOwnPrayer = prayer.user_id === session?.user?.id;

    return (
      <View
        ref={(ref: View | null) => {
          if (ref) {
            prayerCardRefs.current[prayer.id] = ref;
          } else {
            delete prayerCardRefs.current[prayer.id];
          }
        }}
        collapsable={false}
      >
        <PrayerCard
          prayer={prayer}
          isOwnPrayer={isOwnPrayer}
          isProcessing={processingPrayers.has(prayer.id)}
          isAnimating={animatingPrayerId === prayer.id}
          onPray={handlePray}
          onMarkAnswered={handleMarkAnswered}
          onOpenMenu={handleOpenMenu}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Confetti Animation - positioned absolutely to overlay the screen */}
      {showConfetti && SCREEN_WIDTH > 0 && SCREEN_HEIGHT > 0 && confettiPosition && (
        <View style={styles.confettiContainer} pointerEvents="none">
          <PIConfetti
            ref={confettiRef}
            count={200}
            width={SCREEN_WIDTH}
            height={SCREEN_HEIGHT}
            blastPosition={confettiPosition}
            blastRadius={200}
            colors={['#4CAF50', '#8BC34A', '#CDDC39', '#FFC107', '#FF9800', '#FF5722', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3', '#00BCD4']}
            fallDuration={5000}
            blastDuration={300}
            fadeOutOnEnd={true}
            sizeVariation={0.3}
            onAnimationEnd={() => {
              // Hide confetti after animation completes
              setTimeout(() => {
                setShowConfetti(false);
                setConfettiPosition(null);
              }, 100);
            }}
          />
        </View>
      )}
      
      <Header title="Prayer Wall" />
      
      <View style={styles.filterContainer}>
        <PillToggle
          options={['Requests', 'Answered']}
          selected={filter}
          onSelect={(option) => setFilter(option as 'Requests' | 'Answered')}
        />
        {filter === 'Answered' && answeredCount > 0 && (
          <View style={styles.countBadge}>
            <Text style={[styles.countText, { color: colors.textSecondary }]}>
              {answeredCount} answered {answeredCount === 1 ? 'prayer' : 'prayers'}
            </Text>
          </View>
        )}
      </View>

      <FlashList
        data={prayersWithDetails}
        keyExtractor={(item) => item.id}
        renderItem={renderPrayerCard}
        // @ts-expect-error - estimatedItemSize is valid but TypeScript definitions may be outdated
        estimatedItemSize={200}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="prayer"
              title={filter === 'Requests' ? 'No Prayer Requests' : 'No Answered Prayers'}
              message={
                filter === 'Requests'
                  ? 'Share a prayer request with your group'
                  : 'When prayers are answered, they will appear here'
              }
              actionLabel={filter === 'Requests' ? 'Add Prayer Request' : undefined}
              onAction={filter === 'Requests' ? () => setShowCreateModal(true) : undefined}
            />
          ) : null
        }
      />

      {filter === 'Requests' && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: isDark ? '#3D5A50' : colors.primary }]}
          onPress={() => setShowCreateModal(true)}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Create Prayer Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContent}
          >
            <View style={[styles.modalHeader, { borderBottomColor: colors.cardBorder }]}>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text }]}>New Prayer Request</Text>
              <View style={{ width: 50 }} />
            </View>

            <View style={styles.modalForm}>
              <Input
                label="Prayer Title"
                placeholder="What would you like prayer for?"
                value={newPrayerTitle}
                onChangeText={setNewPrayerTitle}
              />

              <Input
                label="Details (optional)"
                placeholder="Share more about your prayer request..."
                value={newPrayerContent}
                onChangeText={setNewPrayerContent}
                multiline
                numberOfLines={5}
                containerStyle={{ marginBottom: 24 }}
              />

              <Button
                title="Submit Prayer Request"
                onPress={handleCreatePrayer}
                loading={createPrayerMutation.isPending}
                fullWidth
              />
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Edit Prayer Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContent}
          >
            <View style={[styles.modalHeader, { borderBottomColor: colors.cardBorder }]}>
              <TouchableOpacity onPress={() => {
                setShowEditModal(false);
                setEditingPrayer(null);
              }}>
                <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Prayer</Text>
              <View style={{ width: 50 }} />
            </View>

            <View style={styles.modalForm}>
              <Input
                label="Prayer Title"
                placeholder="What would you like prayer for?"
                value={editPrayerTitle}
                onChangeText={setEditPrayerTitle}
              />

              <Input
                label="Details (optional)"
                placeholder="Share more about your prayer request..."
                value={editPrayerContent}
                onChangeText={setEditPrayerContent}
                multiline
                numberOfLines={5}
                containerStyle={{ marginBottom: 24 }}
              />

              <Button
                title="Save Changes"
                onPress={handleUpdatePrayer}
                loading={updatePrayerMutation.isPending}
                fullWidth
              />
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Menu Modal */}
      <Modal
        visible={showMenuModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenuModal(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowMenuModal(false)}
        >
          <View style={[styles.menuContainer, { backgroundColor: colors.card }]}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleEditPrayer}
            >
              <Ionicons name="pencil-outline" size={22} color={colors.text} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>
                Edit
              </Text>
            </TouchableOpacity>
            
            <View style={[styles.menuDivider, { backgroundColor: colors.cardBorder }]} />
            
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleDeletePrayer}
            >
              <Ionicons name="trash-outline" size={22} color={colors.error} />
              <Text style={[styles.menuItemText, { color: colors.error }]}>
                Delete
              </Text>
            </TouchableOpacity>
            
            <View style={[styles.menuDivider, { backgroundColor: colors.cardBorder }]} />
            
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setShowMenuModal(false)}
            >
              <Ionicons name="close-outline" size={22} color={colors.text} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>
                Cancel
              </Text>
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
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  countBadge: {
    alignItems: 'center',
    marginTop: 8,
  },
  countText: {
    fontSize: 13,
    fontWeight: '500',
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 80,
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
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
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
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    width: 250,
    borderRadius: 16,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  menuDivider: {
    height: 1,
  },
});
