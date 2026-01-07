import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  RefreshControl,
  TouchableOpacity,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { Card, Avatar, Header, PillToggle, Button, Input, EmptyState } from '../../components';
import { useAppStore } from '../../store/useAppStore';
import { supabase } from '../../lib/supabase';
import { Prayer, Profile } from '../../types/database';
import { useNotifications } from '../../hooks/useNotifications';

type PrayerWithDetails = Prayer & { 
  profiles: Profile;
  total_prayed: number;
  user_prayed: boolean;
};

export const PrayerWallScreen: React.FC = () => {
  const { colors } = useTheme();
  const { currentGroup, profile, session } = useAppStore();
  const { sendPrayerNotification } = useNotifications();
  
  const [filter, setFilter] = useState<'Requests' | 'Answered'>('Requests');
  const [prayers, setPrayers] = useState<PrayerWithDetails[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPrayerTitle, setNewPrayerTitle] = useState('');
  const [newPrayerContent, setNewPrayerContent] = useState('');
  const [creating, setCreating] = useState(false);
  
  // Edit state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPrayer, setEditingPrayer] = useState<PrayerWithDetails | null>(null);
  const [editPrayerTitle, setEditPrayerTitle] = useState('');
  const [editPrayerContent, setEditPrayerContent] = useState('');
  const [updating, setUpdating] = useState(false);
  
  // Menu state
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [selectedPrayer, setSelectedPrayer] = useState<PrayerWithDetails | null>(null);

  const fetchPrayers = useCallback(async () => {
    if (!currentGroup?.id || !session?.user?.id) return;

    const isAnswered = filter === 'Answered';
    
    const { data: prayersData, error } = await supabase
      .from('prayers')
      .select('*, profiles(*)')
      .eq('group_id', currentGroup.id)
      .eq('is_answered', isAnswered)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching prayers:', error);
      return;
    }

    // Fetch prayer interaction counts
    const prayersWithDetails = await Promise.all(
      (prayersData || []).map(async (prayer) => {
        const { data: interactions } = await supabase
          .from('prayer_interactions')
          .select('prayed_count, user_id')
          .eq('prayer_id', prayer.id);

        const totalPrayed = interactions?.reduce((sum, i) => sum + i.prayed_count, 0) || 0;
        const userPrayed = interactions?.some(i => i.user_id === session.user.id) || false;

        return {
          ...prayer,
          total_prayed: totalPrayed,
          user_prayed: userPrayed,
        } as PrayerWithDetails;
      })
    );

    setPrayers(prayersWithDetails);
    setLoading(false);
  }, [currentGroup?.id, filter, session?.user?.id]);

  useEffect(() => {
    fetchPrayers();
  }, [fetchPrayers]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPrayers();
    setRefreshing(false);
  };

  const handlePray = async (prayer: PrayerWithDetails) => {
    if (!session?.user?.id) return;

    const wasAlreadyPrayed = prayer.user_prayed;

    // Optimistic update
    setPrayers(prev => prev.map(p => 
      p.id === prayer.id 
        ? { ...p, total_prayed: p.total_prayed + 1, user_prayed: true }
        : p
    ));

    // Upsert prayer interaction
    const { error } = await supabase
      .from('prayer_interactions')
      .upsert(
        {
          prayer_id: prayer.id,
          user_id: session.user.id,
          prayed_count: prayer.total_prayed + 1,
          last_prayed_at: new Date().toISOString(),
        },
        { onConflict: 'prayer_id,user_id' }
      );

    if (error) {
      // Revert on error
      setPrayers(prev => prev.map(p => 
        p.id === prayer.id 
          ? { ...p, total_prayed: p.total_prayed - 1 }
          : p
      ));
    } else if (!wasAlreadyPrayed && prayer.user_id !== session.user.id) {
      // Notify the prayer author that someone prayed for their request
      // Only if this is the first time this user is praying for it
      await sendPrayerNotification(
        '🙏 Someone Prayed for You',
        `${profile?.full_name || 'Someone'} prayed for "${prayer.title}"`,
        prayer.id
      );
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
            const { error } = await supabase
              .from('prayers')
              .update({ 
                is_answered: true, 
                answered_at: new Date().toISOString() 
              })
              .eq('id', prayer.id);

            if (!error) {
              // Send notification for answered prayer
              await sendPrayerNotification(
                '🙏 Prayer Answered!',
                `"${prayer.title}" has been marked as answered. Praise God!`,
                prayer.id
              );
              fetchPrayers();
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

    if (!currentGroup?.id || !session?.user?.id) return;

    setCreating(true);
    try {
      const { error } = await supabase
        .from('prayers')
        .insert({
          group_id: currentGroup.id,
          user_id: session.user.id,
          title: newPrayerTitle.trim(),
          content: newPrayerContent.trim() || null,
        });

      if (error) throw error;

      setShowCreateModal(false);
      setNewPrayerTitle('');
      setNewPrayerContent('');
      fetchPrayers();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create prayer request');
    } finally {
      setCreating(false);
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

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('prayers')
        .update({
          title: editPrayerTitle.trim(),
          content: editPrayerContent.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingPrayer.id);

      if (error) throw error;

      setShowEditModal(false);
      setEditingPrayer(null);
      setEditPrayerTitle('');
      setEditPrayerContent('');
      fetchPrayers();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update prayer request');
    } finally {
      setUpdating(false);
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
              // Delete prayer interactions first
              await supabase
                .from('prayer_interactions')
                .delete()
                .eq('prayer_id', selectedPrayer.id);

              // Delete the prayer
              const { error } = await supabase
                .from('prayers')
                .delete()
                .eq('id', selectedPrayer.id);

              if (error) throw error;

              fetchPrayers();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete prayer');
            }
          },
        },
      ]
    );
  };

  const timeAgo = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    return 'Just now';
  };

  const renderPrayerCard = ({ item: prayer }: { item: PrayerWithDetails }) => {
    const isOwnPrayer = prayer.user_id === session?.user?.id;
    
    return (
      <Card style={styles.prayerCard}>
        {prayer.is_answered && (
          <View style={[styles.answeredBadge, { backgroundColor: colors.success }]}>
            <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.answeredText}>ANSWERED</Text>
          </View>
        )}
        
        <View style={styles.prayerHeader}>
          <Avatar name={prayer.profiles.full_name} size={40} />
          <View style={styles.prayerInfo}>
            <Text style={[styles.prayerTitle, { color: colors.text }]}>
              {prayer.title}
            </Text>
            <Text style={[styles.prayerMeta, { color: colors.textMuted }]}>
              {prayer.profiles.full_name} · {timeAgo(prayer.created_at || new Date().toISOString())}
            </Text>
          </View>
          
          {isOwnPrayer && (
            <TouchableOpacity
              onPress={() => handleOpenMenu(prayer)}
              style={styles.menuButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="ellipsis-horizontal" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {prayer.content && (
          <Text style={[styles.prayerContent, { color: colors.textSecondary }]}>
            {prayer.content}
          </Text>
        )}

        <View style={[styles.prayerFooter, { borderTopColor: colors.cardBorder }]}>
          <View style={styles.prayedCount}>
            <Text style={[styles.prayedText, { color: colors.textSecondary }]}>
              {prayer.total_prayed} prayed
            </Text>
          </View>

          <View style={styles.prayerActions}>
            {!prayer.is_answered && isOwnPrayer && (
              <TouchableOpacity 
                style={[styles.actionButton, { borderColor: colors.success }]}
                onPress={() => handleMarkAnswered(prayer)}
              >
                <Ionicons name="checkmark" size={16} color={colors.success} style={{ marginRight: 4 }} />
                <Text style={{ color: colors.success, fontWeight: '500' }}>Answered</Text>
              </TouchableOpacity>
            )}
            
            {!prayer.is_answered && (
              <TouchableOpacity 
                style={[
                  styles.prayButton, 
                  { backgroundColor: colors.primary }
                ]}
                onPress={() => handlePray(prayer)}
              >
                <MaterialCommunityIcons name="hands-pray" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.prayButtonText}>Prayed</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Header title="Prayer Wall" />
      
      <View style={styles.filterContainer}>
        <PillToggle
          options={['Requests', 'Answered']}
          selected={filter}
          onSelect={(option) => setFilter(option as 'Requests' | 'Answered')}
        />
      </View>

      <FlatList
        data={prayers}
        keyExtractor={(item) => item.id}
        renderItem={renderPrayerCard}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
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
          style={[styles.fab, { backgroundColor: colors.primary }]}
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
                loading={creating}
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
                loading={updating}
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
  filterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 80,
  },
  prayerCard: {
    marginBottom: 16,
  },
  answeredBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 12,
  },
  answeredText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  prayerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prayerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  prayerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  prayerMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  menuButton: {
    padding: 4,
  },
  prayerContent: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
  },
  prayerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  prayedCount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prayedText: {
    fontSize: 13,
  },
  prayerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  prayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  prayButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
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
