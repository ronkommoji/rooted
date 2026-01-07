import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';
import { MemberSubmission } from './StoryRow';

interface SubmissionCardProps {
  submission: MemberSubmission;
  isOwnPost: boolean;
  onImagePress: () => void;
  onLikePress: () => void;
  onDeletePress?: () => Promise<void>;
  isLiked?: boolean;
}

export const SubmissionCard: React.FC<SubmissionCardProps> = ({
  submission,
  isOwnPost,
  onImagePress,
  onLikePress,
  onDeletePress,
  isLiked = false,
}) => {
  const { colors, isDark } = useTheme();
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
        <View style={styles.headerLeft}>
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
        </View>

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
          <View style={[styles.image, styles.deletingOverlay]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.deletingText, { color: colors.textMuted }]}>
              Deleting...
            </Text>
          </View>
        ) : (
          <Image
            source={{ uri: submission.imageUrl || '' }}
            style={styles.image}
            resizeMode="cover"
          />
        )}
      </TouchableOpacity>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity onPress={onLikePress} style={styles.likeButton}>
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={24}
            color={isLiked ? '#E57373' : colors.text}
          />
          <Text style={[styles.likeCount, { color: colors.text }]}>
            {submission.likes}
          </Text>
        </TouchableOpacity>

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
    </View>
  );
};

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
  image: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#E8E7E2',
  },
  deletingOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  deletingText: {
    marginTop: 12,
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  likeCount: {
    fontSize: 15,
    fontWeight: '500',
  },
  timestamp: {
    fontSize: 13,
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
