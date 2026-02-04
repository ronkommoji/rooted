import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Keyboard,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';
import { supabase } from '../../../lib/supabase';
import { useAppStore } from '../../../store/useAppStore';
import { Avatar } from '../../../components/Avatar';

export interface Comment {
  id: string;
  devotional_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

interface CommentsModalProps {
  visible: boolean;
  devotionalId: string | null;
  onClose: () => void;
  onCommentCountChange?: (count: number) => void;
}

export const CommentsModal: React.FC<CommentsModalProps> = ({
  visible,
  devotionalId,
  onClose,
  onCommentCountChange,
}) => {
  const { colors, isDark } = useTheme();
  const { session, profile } = useAppStore();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const previousCountRef = useRef<number>(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const insets = useSafeAreaInsets();

  const fetchComments = useCallback(async () => {
    if (!devotionalId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('devotional_comments')
        .select(`
          *,
          profiles (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('devotional_id', devotionalId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      const commentsData = data || [];
      const newCount = commentsData.length;
      setComments(commentsData);
      // Only call onCommentCountChange when count actually changes
      if (newCount !== previousCountRef.current) {
        previousCountRef.current = newCount;
        onCommentCountChange?.(newCount);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  }, [devotionalId]); // Removed onCommentCountChange from dependencies

  useEffect(() => {
    if (visible && devotionalId) {
      previousCountRef.current = 0; // Reset count when opening modal
      fetchComments();
    } else if (!visible) {
      // Reset state when modal closes
      setComments([]);
      setLoading(false);
      setNewComment('');
      previousCountRef.current = 0;
    }
  }, [visible, devotionalId, fetchComments]);

  // Function to scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (comments.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 150);
    }
  }, [comments.length]);

  // Handle keyboard show/hide to track height and scroll to bottom
  useEffect(() => {
    if (!visible) {
      setKeyboardHeight(0);
      return;
    }

    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        // Scroll to bottom when keyboard opens
        scrollToBottom();
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, [visible, scrollToBottom]);

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !devotionalId || !session?.user?.id) return;

    const commentText = newComment.trim();
    setSubmitting(true);
    setNewComment(''); // Clear input immediately for better UX
    
    try {
      const { error } = await supabase
        .from('devotional_comments')
        .insert({
          devotional_id: devotionalId,
          user_id: session.user.id,
          content: commentText,
        });

      if (error) throw error;

      // Refresh comments after successful post
      await fetchComments();
    } catch (error: any) {
      console.error('Error posting comment:', error);
      Alert.alert('Error', 'Failed to post comment');
      // Restore comment text on error
      setNewComment(commentText);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = (commentId: string) => {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('devotional_comments')
                .delete()
                .eq('id', commentId);

              if (error) throw error;
              fetchComments();
            } catch (error) {
              console.error('Error deleting comment:', error);
              Alert.alert('Error', 'Failed to delete comment');
            }
          },
        },
      ]
    );
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const then = new Date(dateString);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);

    if (diffWeeks > 0) return `${diffWeeks}w`;
    if (diffDays > 0) return `${diffDays}d`;
    if (diffHours > 0) return `${diffHours}h`;
    if (diffMins > 0) return `${diffMins}m`;
    return 'now';
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return parts[0][0] + parts[1][0];
    }
    return name.substring(0, 2).toUpperCase();
  };

  const renderComment = ({ item }: { item: Comment }) => {
    const isOwnComment = item.user_id === session?.user?.id;

    return (
      <View style={styles.commentItem}>
        <View style={styles.commentAvatarWrapper}>
          <Avatar
            name={item.profiles?.full_name || 'Unknown'}
            imageUrl={item.profiles?.avatar_url}
            size={32}
            backgroundColor={colors.primary}
          />
        </View>
        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <Text style={[styles.commentAuthor, { color: colors.text }]}>
              {item.profiles?.full_name || 'Unknown'}
            </Text>
            <Text style={[styles.commentTime, { color: colors.textMuted }]}>
              {getTimeAgo(item.created_at)}
            </Text>
          </View>
          <Text style={[styles.commentText, { color: colors.text }]}>
            {item.content}
          </Text>
        </View>
        {isOwnComment && (
          <TouchableOpacity
            onPress={() => handleDeleteComment(item.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="ellipsis-horizontal" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView 
        style={[styles.container, { backgroundColor: colors.background }]} 
        edges={['top']}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.cardBorder }]}>
          <View style={styles.headerHandle} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>Comments</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Comments List - Adjust bottom padding when keyboard is open */}
        <View 
          style={[
            styles.contentContainer,
            { 
              paddingBottom: keyboardHeight > 0 
                ? keyboardHeight + 68 // Keyboard height + input container height + padding
                : 60 + insets.bottom // Input container height + safe area
            }
          ]}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={isDark ? '#3D5A50' : colors.primary} />
            </View>
          ) : comments.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubble-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No comments yet
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
                Be the first to comment!
              </Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={comments}
              keyExtractor={(item) => item.id}
              renderItem={renderComment}
              contentContainerStyle={[
                styles.commentsList,
                { paddingBottom: 16 }
              ]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              onContentSizeChange={scrollToBottom}
            />
          )}
        </View>

        {/* Comment Input - Positioned above keyboard using absolute positioning */}
        <View 
          style={[
            styles.inputContainer, 
            styles.inputContainerAbsolute,
            { 
              backgroundColor: colors.card, 
              borderTopColor: colors.cardBorder,
              paddingBottom: keyboardHeight > 0 ? 8 : insets.bottom,
              bottom: keyboardHeight > 0 ? keyboardHeight : 0,
            }
          ]}
        >
            <View style={styles.inputAvatarWrapper}>
              <Avatar
                name={profile?.full_name || 'You'}
                imageUrl={profile?.avatar_url}
                size={32}
                backgroundColor={colors.primary}
              />
            </View>
            <TextInput
              style={[styles.input, { 
                color: colors.text,
                backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5',
              }]}
              placeholder="Add a comment..."
              placeholderTextColor={colors.textMuted}
              value={newComment}
              onChangeText={setNewComment}
              onFocus={scrollToBottom}
              multiline
              maxLength={500}
              returnKeyType="default"
              blurOnSubmit={false}
            />
            <TouchableOpacity
              onPress={handleSubmitComment}
              disabled={!newComment.trim() || submitting}
              style={[
                styles.sendButton,
                (!newComment.trim() || submitting) && styles.sendButtonDisabled,
              ]}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={isDark ? '#3D5A50' : colors.primary} />
              ) : (
                <Text style={[
                  styles.sendButtonText,
                  { color: newComment.trim() ? (isDark ? '#3D5A50' : colors.primary) : colors.textMuted }
                ]}>
                  Post
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    position: 'relative',
  },
  headerHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.3)',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 4,
  },
  commentsList: {
    padding: 16,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  commentAvatarWrapper: {
    marginRight: 8,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  commentAvatarText: {
    fontSize: 12,
    fontWeight: '600',
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  commentTime: {
    fontSize: 12,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  inputContainerAbsolute: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  inputAvatarWrapper: {
    marginRight: 14,
  },
  inputAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  inputAvatarText: {
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 14,
  },
  sendButton: {
    marginLeft: 12,
    paddingHorizontal: 4,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
