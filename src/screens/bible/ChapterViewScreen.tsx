import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { Header } from '../../components';
import { fetchChapter, BibleChapter, getVerseText } from '../../lib/bibleApi';
import { getVersesWithComments } from './hooks/useBibleComments';
import { VerseCommentsModal } from './components/VerseCommentsModal';
import { useAppStore } from '../../store/useAppStore';

type ChapterViewRouteParams = {
  book: string;
  chapter: number;
};

type ChapterViewRouteProp = RouteProp<
  { ChapterView: ChapterViewRouteParams },
  'ChapterView'
>;

export const ChapterViewScreen: React.FC = () => {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation();
  const route = useRoute<ChapterViewRouteProp>();
  const { currentGroup } = useAppStore();

  const { book, chapter } = route.params;

  const [chapterData, setChapterData] = useState<BibleChapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [versesWithComments, setVersesWithComments] = useState<Set<number>>(new Set());
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);
  const [showCommentsModal, setShowCommentsModal] = useState(false);

  const fetchChapterData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchChapter(book, chapter);
      if (data) {
        setChapterData(data);
      } else {
        Alert.alert('Error', 'Failed to load chapter. Please try again.');
      }
    } catch (error) {
      console.error('Error fetching chapter:', error);
      Alert.alert('Error', 'Failed to load chapter. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [book, chapter]);

  const fetchVersesWithComments = useCallback(async () => {
    if (!currentGroup?.id) return;

    try {
      const verses = await getVersesWithComments(book, chapter, currentGroup.id);
      setVersesWithComments(verses);
    } catch (error) {
      console.error('Error fetching verses with comments:', error);
    }
  }, [book, chapter, currentGroup?.id]);

  useEffect(() => {
    fetchChapterData();
    fetchVersesWithComments();
  }, [fetchChapterData, fetchVersesWithComments]);

  const handleVersePress = (verseNumber: number) => {
    setSelectedVerse(verseNumber);
    setShowCommentsModal(true);
  };

  const handleCommentAdded = () => {
    // Refresh verses with comments after a comment is added
    fetchVersesWithComments();
  };

  const renderVerse = (verse: { verse: number; text: string }) => {
    const hasComments = versesWithComments.has(verse.verse);
    const verseText = verse.text;

    return (
      <TouchableOpacity
        key={verse.verse}
        onPress={() => handleVersePress(verse.verse)}
        activeOpacity={0.7}
        style={[
          styles.verseContainer,
          hasComments && {
            backgroundColor: isDark
              ? 'rgba(61, 90, 80, 0.3)'
              : 'rgba(61, 90, 80, 0.1)',
            borderLeftWidth: 4,
            borderLeftColor: isDark ? '#3D5A50' : colors.primary,
            paddingLeft: 12,
            paddingVertical: 6,
          },
        ]}
      >
        <View style={styles.verseContent}>
          <Text style={[styles.verseNumber, { color: isDark ? '#3D5A50' : colors.primary }]}>
            {verse.verse}
          </Text>
          <Text style={[styles.verseText, { color: colors.text, fontWeight: 'bold' }]}>{verseText}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const selectedVerseText =
    selectedVerse && chapterData
      ? getVerseText(chapterData, selectedVerse)
      : null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Header
        leftElement={
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons
                name="chevron-back"
                size={24}
                color={isDark ? '#3D5A50' : colors.primary}
              />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
              {book} {chapter}
            </Text>
          </View>
        }
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={isDark ? '#3D5A50' : colors.primary} />
        </View>
      ) : chapterData ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {chapterData.verses.map((verse) => renderVerse(verse))}
        </ScrollView>
      ) : (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.errorText, { color: colors.textMuted }]}>
            Failed to load chapter
          </Text>
        </View>
      )}

      {/* Verse Comments Modal */}
      {selectedVerse !== null && selectedVerseText && (
        <VerseCommentsModal
          visible={showCommentsModal}
          book={book}
          chapter={chapter}
          verse={selectedVerse}
          verseText={selectedVerseText}
          onClose={() => {
            setShowCommentsModal(false);
            setSelectedVerse(null);
          }}
          onCommentAdded={handleCommentAdded}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'PlayfairDisplay_700Bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  verseContainer: {
    marginBottom: 8,
    paddingVertical: 4,
    paddingHorizontal: 0,
    borderRadius: 0,
    backgroundColor: 'transparent',
  },
  verseContent: {
    flexDirection: 'row',
    gap: 8,
  },
  verseNumber: {
    fontSize: 16,
    fontWeight: '700',
    minWidth: 28,
  },
  verseText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
});
