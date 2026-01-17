import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';
import { Card } from '../../../components';
import { useAppStore } from '../../../store/useAppStore';
import { useChapterCommentCounts } from '../hooks/useBibleComments';

interface ChaptersModalProps {
  visible: boolean;
  book: string;
  chapterCount: number;
  onClose: () => void;
  onChapterSelect: (chapter: number) => void;
}

export const ChaptersModal: React.FC<ChaptersModalProps> = ({
  visible,
  book,
  chapterCount,
  onClose,
  onChapterSelect,
}) => {
  const { colors, isDark } = useTheme();
  const { currentGroup } = useAppStore();
  const { counts, loading } = useChapterCommentCounts(
    book,
    chapterCount,
    currentGroup?.id || null
  );

  const chapters = Array.from({ length: chapterCount }, (_, i) => i + 1);

  const handleChapterPress = (chapter: number) => {
    onChapterSelect(chapter);
    onClose();
  };

  const renderChapter = ({ item: chapter }: { item: number }) => {
    const commentCount = counts[chapter] || 0;

    return (
      <TouchableOpacity
        onPress={() => handleChapterPress(chapter)}
        activeOpacity={0.7}
      >
        <Card style={styles.chapterCard}>
          <View style={styles.chapterRow}>
            <Text style={[styles.chapterText, { color: colors.text }]}>
              Chapter {chapter}
            </Text>
            {loading ? (
              <ActivityIndicator
                size="small"
                color={isDark ? '#3D5A50' : colors.primary}
              />
            ) : (
              <View style={styles.commentBadge}>
                <Ionicons
                  name="chatbubble-outline"
                  size={16}
                  color={colors.textSecondary}
                />
                <Text style={[styles.commentCount, { color: colors.textSecondary }]}>
                  {commentCount}
                </Text>
              </View>
            )}
          </View>
        </Card>
      </TouchableOpacity>
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
          <Text style={[styles.headerTitle, { color: colors.text }]}>{book}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Chapters List */}
        <FlatList
          data={chapters}
          keyExtractor={(item) => item.toString()}
          renderItem={renderChapter}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
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
    fontSize: 18,
    fontWeight: '700',
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
  list: {
    padding: 16,
  },
  chapterCard: {
    marginBottom: 12,
  },
  chapterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  chapterText: {
    fontSize: 16,
    fontWeight: '500',
  },
  commentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  commentCount: {
    fontSize: 14,
    fontWeight: '500',
  },
});
