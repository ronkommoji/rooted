import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Keyboard,
  Platform,
  Share,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';
import { useAppStore } from '../../../store/useAppStore';
import {
  BibleComment,
  getVerseComments,
  addVerseComment,
  deleteVerseComment,
} from '../hooks/useBibleComments';

interface VerseCommentsModalProps {
  visible: boolean;
  book: string;
  chapter: number;
  verse: number;
  verseText: string;
  onClose: () => void;
  onCommentAdded?: () => void;
}

export const VerseCommentsModal: React.FC<VerseCommentsModalProps> = ({
  visible,
  book,
  chapter,
  verse,
  verseText,
  onClose,
  onCommentAdded,
}) => {
  const { colors, isDark } = useTheme();
  const { session, profile, currentGroup } = useAppStore();
  const [comments, setComments] = useState<BibleComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const insets = useSafeAreaInsets();

  const fetchComments = useCallback(async () => {
    if (!currentGroup?.id) return;

    setLoading(true);
    try {
      const commentsData = await getVerseComments(book, chapter, verse, currentGroup.id);
      setComments(commentsData);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  }, [book, chapter, verse, currentGroup?.id]);

  useEffect(() => {
    if (visible && currentGroup?.id) {
      fetchComments();
    } else if (!visible) {
      setComments([]);
      setLoading(false);
      setNewComment('');
    }
  }, [visible, currentGroup?.id, fetchComments]);

  // Handle keyboard show/hide
  useEffect(() => {
    if (!visible) {
      setKeyboardHeight(0);
      return;
    }

    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
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
  }, [visible]);

  const scrollToBottom = useCallback(() => {
    if (comments.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 150);
    }
  }, [comments.length]);

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !currentGroup?.id || !session?.user?.id) return;

    const commentText = newComment.trim();
    setSubmitting(true);
    setNewComment('');

    try {
      const newCommentData = await addVerseComment(
        book,
        chapter,
        verse,
        commentText,
        currentGroup.id,
        session.user.id
      );

      if (newCommentData) {
        await fetchComments();
        onCommentAdded?.();
      } else {
        Alert.alert('Error', 'Failed to post comment');
        setNewComment(commentText);
      }
    } catch (error: any) {
      console.error('Error posting comment:', error);
      Alert.alert('Error', 'Failed to post comment');
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
              const success = await deleteVerseComment(commentId);
              if (success) {
                await fetchComments();
                onCommentAdded?.();
              } else {
                Alert.alert('Error', 'Failed to delete comment');
              }
            } catch (error) {
              console.error('Error deleting comment:', error);
              Alert.alert('Error', 'Failed to delete comment');
            }
          },
        },
      ]
    );
  };

  const handleShare = async () => {
    try {
      const shareText = `${book} ${chapter}:${verse}\n\n"${verseText}"`;
      await Share.share({
        message: shareText,
        title: `${book} ${chapter}:${verse}`,
      });
    } catch (error) {
      console.error('Error sharing verse:', error);
    }
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

  const renderComment = ({ item }: { item: BibleComment }) => {
    const isOwnComment = item.user_id === session?.user?.id;

    return (
      <View style={styles.commentItem}>
        <View style={[styles.commentAvatar, { backgroundColor: isDark ? '#3D4D49' : '#E8E7E2' }]}>
          <Text style={[styles.commentAvatarText, { color: colors.text }]}>
            {getInitials(item.profiles?.full_name || 'Unknown')}
          </Text>
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

        {/* Verse Display */}
        <View style={[styles.verseContainer, { backgroundColor: colors.card }]}>
          <View style={styles.verseHeader}>
            <Text style={[styles.verseReference, { color: colors.text }]}>
              {book} {chapter}:{verse}
            </Text>
            <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
              <Ionicons name="share-outline" size={20} color={isDark ? '#3D5A50' : colors.primary} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.verseText, { color: colors.text }]}>"{verseText}"</Text>
        </View>

        {/* Comments List */}
        <View
          style={[
            styles.contentContainer,
            {
              paddingBottom:
                keyboardHeight > 0
                  ? keyboardHeight + 68
                  : 60 + insets.bottom,
            },
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
              contentContainerStyle={[styles.commentsList, { paddingBottom: 16 }]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              onContentSizeChange={scrollToBottom}
            />
          )}
        </View>

        {/* Comment Input */}
        <View
          style={[
            styles.inputContainer,
            styles.inputContainerAbsolute,
            {
              backgroundColor: colors.card,
              borderTopColor: colors.cardBorder,
              paddingBottom: keyboardHeight > 0 ? 8 : insets.bottom,
              bottom: keyboardHeight > 0 ? keyboardHeight : 0,
            },
          ]}
        >
          <View style={[styles.inputAvatar, { backgroundColor: isDark ? '#3D4D49' : '#E8E7E2' }]}>
            <Text style={[styles.inputAvatarText, { color: colors.text }]}>
              {getInitials(profile?.full_name || 'You')}
            </Text>
          </View>
          <TextInput
            style={[
              styles.input,
              {
                color: colors.text,
                backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5',
              },
            ]}
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
              <Text
                style={[
                  styles.sendButtonText,
                  {
                    color: newComment.trim()
                      ? isDark
                        ? '#3D5A50'
                        : colors.primary
                      : colors.textMuted,
                  },
                ]}
              >
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
  verseContainer: {
    padding: 16,
    margin: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3D5A50',
  },
  verseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  verseReference: {
    fontSize: 16,
    fontWeight: '700',
  },
  shareButton: {
    padding: 4,
  },
  verseText: {
    fontSize: 15,
    lineHeight: 22,
    fontStyle: 'italic',
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
