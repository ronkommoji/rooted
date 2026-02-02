import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
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
import { SubmissionCard } from '../devotionals/components/SubmissionCard';
import type { MemberSubmission } from '../devotionals/components/StoryRow';

type UserDevotionalsListRouteProp = RouteProp<MainStackParamList, 'UserDevotionalsList'>;

interface DevotionalWithEngagement extends Tables<'devotionals'> {
  profiles: Tables<'profiles'>;
  likes_count: number;
  comments_count: number;
}

const fetchUserDevotionals = async (
  userId: string,
  groupId: string
): Promise<DevotionalWithEngagement[]> => {
  const { data, error } = await supabase
    .from('devotionals')
    .select('*, profiles(*)')
    .eq('user_id', userId)
    .eq('group_id', groupId)
    .not('image_url', 'is', null)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const devotionals = data || [];
  const devotionalIds = devotionals.map((d) => d.id);

  if (devotionalIds.length === 0) {
    return [];
  }

  // Fetch likes and comments for each devotional
  const { data: likesData } = await supabase
    .from('devotional_likes')
    .select('devotional_id')
    .in('devotional_id', devotionalIds);

  const { data: commentsData } = await supabase
    .from('devotional_comments')
    .select('devotional_id')
    .in('devotional_id', devotionalIds);

  // Count likes per devotional
  const likesMap = new Map<string, number>();
  (likesData || []).forEach((like) => {
    likesMap.set(like.devotional_id, (likesMap.get(like.devotional_id) || 0) + 1);
  });

  // Count comments per devotional
  const commentsMap = new Map<string, number>();
  (commentsData || []).forEach((comment) => {
    commentsMap.set(comment.devotional_id, (commentsMap.get(comment.devotional_id) || 0) + 1);
  });

  // Combine data
  return devotionals.map((d) => ({
    ...d,
    likes_count: likesMap.get(d.id) || 0,
    comments_count: commentsMap.get(d.id) || 0,
  })) as DevotionalWithEngagement[];
};

export const UserDevotionalsListScreen: React.FC = () => {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<UserDevotionalsListRouteProp>();
  const { currentGroup, session } = useAppStore();

  const { userId, userName, initialDevotionalId } = route.params;
  const currentUserId = session?.user?.id;
  const isOwnProfile = userId === currentUserId;
  
  const listRef = useRef<FlashList<MemberSubmission>>(null);

  const { data: devotionals = [], isLoading, refetch } = useQuery({
    queryKey: [...queryKeys.devotionals.byGroup(currentGroup?.id || ''), 'user', userId],
    queryFn: () => fetchUserDevotionals(userId, currentGroup?.id || ''),
    enabled: !!userId && !!currentGroup?.id,
    staleTime: 2 * 60 * 1000,
  });

  // Fetch which devotionals the current user has liked
  const { data: userLikes = [] } = useQuery({
    queryKey: [...queryKeys.devotionals.byGroup(currentGroup?.id || ''), 'user', userId, 'user-likes', currentUserId],
    queryFn: async () => {
      if (!currentUserId || devotionals.length === 0) return [];
      const devotionalIds = devotionals.map((d) => d.id);

      const { data } = await supabase
        .from('devotional_likes')
        .select('devotional_id')
        .eq('user_id', currentUserId)
        .in('devotional_id', devotionalIds);

      return (data || []).map((like) => like.devotional_id);
    },
    enabled: !!currentUserId && devotionals.length > 0,
    staleTime: 1 * 60 * 1000,
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Handler for liking devotionals
  const handleLike = async (devotionalId: string) => {
    if (!currentUserId) return;

    try {
      const { data: existingLike } = await supabase
        .from('devotional_likes')
        .select('id')
        .eq('devotional_id', devotionalId)
        .eq('user_id', currentUserId)
        .maybeSingle();

      if (existingLike) {
        await supabase
          .from('devotional_likes')
          .delete()
          .eq('devotional_id', devotionalId)
          .eq('user_id', currentUserId);
      } else {
        await supabase.from('devotional_likes').insert({
          devotional_id: devotionalId,
          user_id: currentUserId,
        });
      }

      refetch();
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  // Handler for deleting devotionals
  const handleDelete = async (devotionalId: string) => {
    if (!currentUserId) return;

    const devotional = devotionals.find((d) => d.id === devotionalId);
    if (!devotional || devotional.user_id !== currentUserId) {
      console.error('Cannot delete devotional');
      return;
    }

    try {
      await supabase.from('devotional_likes').delete().eq('devotional_id', devotionalId);
      await supabase.from('devotional_comments').delete().eq('devotional_id', devotionalId);
      
      const { error } = await supabase.from('devotionals').delete().eq('id', devotionalId);
      if (error) {
        console.error('Error deleting devotional:', error);
        return;
      }

      if (devotional.image_url) {
        try {
          const urlParts = devotional.image_url.split('/devotionals/');
          if (urlParts.length > 1) {
            const filePath = urlParts[1];
            await supabase.storage.from('devotionals').remove([filePath]);
          }
        } catch (storageError) {
          console.warn('Could not delete storage file:', storageError);
        }
      }

      refetch();
    } catch (error) {
      console.error('Error in deleteDevotional:', error);
      throw error;
    }
  };

  // Convert devotionals to MemberSubmission format
  const devotionalSubmissions: MemberSubmission[] = devotionals.map((devotional) => ({
    memberId: userId,
    memberName: userName,
    imageUrl: devotional.image_url,
    hasPosted: true,
    createdAt: devotional.created_at,
    likes: devotional.likes_count,
    devotionalId: devotional.id,
    isLiked: userLikes.includes(devotional.id),
  }));

  // Scroll to initial devotional when data loads
  useEffect(() => {
    if (initialDevotionalId && devotionalSubmissions.length > 0 && listRef.current) {
      const index = devotionalSubmissions.findIndex(
        (d) => d.devotionalId === initialDevotionalId
      );
      if (index >= 0) {
        setTimeout(() => {
          listRef.current?.scrollToIndex({
            index,
            animated: true,
            viewPosition: 0,
          });
        }, 100);
      }
    }
  }, [initialDevotionalId, devotionalSubmissions.length]);

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
          {userName}'s Devotionals
        </Text>
        <View style={{ width: 28 }} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={isDark ? '#3D5A50' : colors.primary} />
        </View>
      ) : devotionals.length === 0 ? (
        <View style={styles.content}>
          <Card>
            <View style={styles.emptyContainer}>
              <Ionicons name="images-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No devotionals yet
              </Text>
            </View>
          </Card>
        </View>
      ) : (
        <FlashList
          ref={listRef}
          data={devotionalSubmissions}
          renderItem={({ item: submission }) => (
            <SubmissionCard
              submission={submission}
              isOwnPost={isOwnProfile}
              onImagePress={() => {}}
              onLikePress={() => handleLike(submission.devotionalId!)}
              onDeletePress={
                isOwnProfile ? () => handleDelete(submission.devotionalId!) : undefined
              }
              isLiked={submission.isLiked}
            />
          )}
          estimatedItemSize={400}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          onScrollToIndexFailed={(info) => {
            setTimeout(() => {
              listRef.current?.scrollToIndex({
                index: info.index,
                animated: true,
              });
            }, 100);
          }}
        />
      )}
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
  content: {
    padding: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
  },
});
