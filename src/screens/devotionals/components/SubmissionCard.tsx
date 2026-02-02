import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  Modal,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../theme/ThemeContext';
import { MemberSubmission } from './StoryRow';
import { CommentsModal, Comment } from './CommentsModal';
import { supabase } from '../../../lib/supabase';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_PADDING = 32; // 16px on each side
const IMAGE_WIDTH = SCREEN_WIDTH - CARD_PADDING;

// Instagram-style constraints: max aspect ratio 4:5 (portrait), min 1.91:1 (landscape)
const MAX_ASPECT_RATIO = 4 / 5; // Tallest allowed (portrait)
const MIN_ASPECT_RATIO = 1.91; // Widest allowed (landscape)

interface SubmissionCardProps {
  submission: MemberSubmission;
  isOwnPost: boolean;
  onImagePress: () => void;
  onLikePress: () => void;
  onDeletePress?: () => Promise<void>;
  isLiked?: boolean;
}

export const SubmissionCard: React.FC<SubmissionCardProps> = React.memo(({
  submission,
  isOwnPost,
  onImagePress,
  onLikePress,
  onDeletePress,
  isLiked = false,
}) => {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [imageAspectRatio, setImageAspectRatio] = useState<number>(1);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  // Comments state
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [previewComments, setPreviewComments] = useState<Comment[]>([]);

  // Fetch comment count and preview comments
  const fetchCommentData = useCallback(async () => {
    if (!submission.devotionalId) return;

    try {
      // Get count
      const { count, error: countError } = await supabase
        .from('devotional_comments')
        .select('*', { count: 'exact', head: true })
        .eq('devotional_id', submission.devotionalId);

      if (!countError) {
        setCommentCount(count || 0);
      }

      // Get preview comments (last 2)
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
        .eq('devotional_id', submission.devotionalId)
        .order('created_at', { ascending: false })
        .limit(2);

      if (!error && data) {
        setPreviewComments(data.reverse()); // Reverse to show oldest first
      }
    } catch (error) {
      console.error('Error fetching comment data:', error);
    }
  }, [submission.devotionalId]);

  useEffect(() => {
    fetchCommentData();
  }, [fetchCommentData]);

  const handleCommentCountChange = useCallback((count: number) => {
    setCommentCount(count);
    // Refresh preview comments when comment count changes
    fetchCommentData();
  }, [fetchCommentData]);

  // Load image dimensions and calculate aspect ratio
  useEffect(() => {
    if (submission.imageUrl) {
      Image.getSize(
        submission.imageUrl,
        (width, height) => {
          let ratio = width / height;
          // Clamp aspect ratio to Instagram-style limits
          // If image is too tall, clamp to 4:5
          // If image is too wide, clamp to 1.91:1
          if (ratio < MAX_ASPECT_RATIO) {
            ratio = MAX_ASPECT_RATIO;
          } else if (ratio > MIN_ASPECT_RATIO) {
            ratio = MIN_ASPECT_RATIO;
          }
          setImageAspectRatio(ratio);
          setImageLoaded(true);
        },
        (error) => {
          console.error('Error loading image dimensions:', error);
          setImageAspectRatio(1); // Fallback to square
          setImageLoaded(true);
        }
      );
    }
  }, [submission.imageUrl]);

  const getTimeAgo = (dateString: string | null) => {
    if (!dateString) return '';
    
    const now = new Date();
    const then = new Date(dateString);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return 'Just now';
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return parts[0][0] + parts[1][0];
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleDeletePress = () => {
    setShowMenu(false);
    Alert.alert(
      'Delete Devotional',
      'Are you sure you want to delete this devotional? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (onDeletePress) {
              setIsDeleting(true);
              try {
                await onDeletePress();
              } finally {
                setIsDeleting(false);
              }
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerLeft}
          onPress={() => navigation.navigate('Profile', { userId: submission.memberId })}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`View ${submission.memberName}'s profile`}
        >
          <View
            style={[
              styles.avatar,
              { backgroundColor: isDark ? '#3D4D49' : '#E8E7E2' },
            ]}
          >
            <Text style={[styles.avatarText, { color: colors.text }]}>
              {getInitials(submission.memberName)}
            </Text>
          </View>
          <Text style={[styles.memberName, { color: colors.text }]}>
            {submission.memberName}
          </Text>
        </TouchableOpacity>

        {isOwnPost && (
          <TouchableOpacity
            onPress={() => setShowMenu(true)}
            style={styles.menuButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Image */}
      <TouchableOpacity onPress={onImagePress} activeOpacity={0.95}>
        {isDeleting ? (
          <View style={[styles.imageContainer, { aspectRatio: imageAspectRatio }]}>
            <View style={[styles.deletingOverlay, { backgroundColor: isDark ? '#2A2A2A' : '#E8E7E2' }]}>
              <ActivityIndicator size="large" color={isDark ? '#3D5A50' : colors.primary} />
              <Text style={[styles.deletingText, { color: colors.textMuted }]}>
                Deleting...
              </Text>
            </View>
          </View>
        ) : !imageLoaded ? (
          <View style={[styles.imageContainer, { aspectRatio: 1, backgroundColor: isDark ? '#2A2A2A' : '#E8E7E2' }]}>
            <ActivityIndicator size="small" color={isDark ? '#3D5A50' : colors.primary} />
          </View>
        ) : (
          <Image
            source={{ uri: submission.imageUrl || '' }}
            style={[styles.image, { aspectRatio: imageAspectRatio }]}
            resizeMode="cover"
          />
        )}
      </TouchableOpacity>

      {/* Actions Row */}
      <View style={styles.actionsRow}>
        <View style={styles.leftActions}>
          <TouchableOpacity onPress={onLikePress} style={styles.actionButton}>
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={24}
              color={isLiked ? '#E57373' : colors.text}
            />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setShowComments(true)} 
            style={styles.actionButton}
          >
            <Ionicons name="chatbubble-outline" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Likes count */}
      {submission.likes > 0 && (
        <View style={styles.likesContainer}>
          <Text style={[styles.likesText, { color: colors.text }]}>
            {submission.likes} {submission.likes === 1 ? 'like' : 'likes'}
          </Text>
        </View>
      )}

      {/* Preview Comments - Instagram style */}
      {previewComments.length > 0 && (
        <View style={styles.commentsPreview}>
          {previewComments.map((comment) => (
            <View key={comment.id} style={styles.previewCommentRow}>
              <Text style={[styles.previewCommentAuthor, { color: colors.text }]}>
                {comment.profiles?.full_name || 'Unknown'}
              </Text>
              <Text 
                style={[styles.previewCommentText, { color: colors.text }]} 
                numberOfLines={2}
              >
                {comment.content}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* View all comments button */}
      {commentCount > 2 && (
        <TouchableOpacity 
          onPress={() => setShowComments(true)}
          style={styles.viewAllComments}
        >
          <Text style={[styles.viewAllCommentsText, { color: colors.textMuted }]}>
            View all {commentCount} comments
          </Text>
        </TouchableOpacity>
      )}

      {/* Add comment prompt */}
      {commentCount === 0 && (
        <TouchableOpacity 
          onPress={() => setShowComments(true)}
          style={styles.addCommentPrompt}
        >
          <Text style={[styles.addCommentText, { color: colors.textMuted }]}>
            Add a comment...
          </Text>
        </TouchableOpacity>
      )}

      {/* Timestamp */}
      <View style={styles.timestampContainer}>
        <Text style={[styles.timestamp, { color: colors.textMuted }]}>
          {getTimeAgo(submission.createdAt)}
        </Text>
      </View>

      {/* Menu Modal */}
      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={[styles.menuContainer, { backgroundColor: colors.card }]}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleDeletePress}
            >
              <Ionicons name="trash-outline" size={22} color={colors.error} />
              <Text style={[styles.menuItemText, { color: colors.error }]}>
                Delete
              </Text>
            </TouchableOpacity>
            
            <View style={[styles.menuDivider, { backgroundColor: colors.cardBorder }]} />
            
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setShowMenu(false)}
            >
              <Ionicons name="close-outline" size={22} color={colors.text} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Comments Modal */}
      <CommentsModal
        visible={showComments}
        devotionalId={submission.devotionalId || null}
        onClose={() => setShowComments(false)}
        onCommentCountChange={handleCommentCountChange}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
  },
  menuButton: {
    padding: 4,
  },
  imageContainer: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    backgroundColor: '#E8E7E2',
  },
  deletingOverlay: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deletingText: {
    marginTop: 12,
    fontSize: 14,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionButton: {
    padding: 2,
  },
  likesContainer: {
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  likesText: {
    fontSize: 14,
    fontWeight: '600',
  },
  commentsPreview: {
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  previewCommentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 2,
  },
  previewCommentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  previewCommentText: {
    fontSize: 14,
    flex: 1,
  },
  viewAllComments: {
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  viewAllCommentsText: {
    fontSize: 14,
  },
  addCommentPrompt: {
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  addCommentText: {
    fontSize: 14,
  },
  timestampContainer: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 4,
  },
  timestamp: {
    fontSize: 11,
    textTransform: 'uppercase',
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
