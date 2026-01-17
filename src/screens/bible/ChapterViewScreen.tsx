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
          <Text style={styles.chapterText}>
            {chapterData.verses.map((verse, index) => {
              const hasComments = versesWithComments.has(verse.verse);
              const handlePress = () => handleVersePress(verse.verse);
              return (
                <Text
                  key={verse.verse}
                  onPress={handlePress}
                  style={styles.verseWrapper}
                >
                  <Text
                    style={[
                      styles.verseNumber,
                      hasComments && styles.verseNumberWithComments,
                      { color: isDark ? '#3D5A50' : colors.primary },
                      hasComments && {
                        backgroundColor: isDark
                          ? 'rgba(61, 90, 80, 0.3)'
                          : 'rgba(61, 90, 80, 0.1)',
                      },
                    ]}
                  >
                    {verse.verse}
                  </Text>
                  <Text
                    style={[
                      styles.verseText,
                      { color: colors.text },
                    ]}
                  >
                    {'    '}{verse.text}{index < chapterData.verses.length - 1 ? ' ' : ''}
                  </Text>
                </Text>
              );
            })}
          </Text>
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
  chapterText: {
    fontSize: 18,
    lineHeight: 30,
    fontWeight: '600',
  },
  verseWrapper: {
    // Ensures the entire verse is tappable
  },
  verseNumber: {
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 2,
    marginRight: 7,
  },
  verseNumberWithComments: {
    borderRadius: 3,
  },
  verseText: {
    fontSize: 18,
    lineHeight: 30,
    fontWeight: '600',
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
