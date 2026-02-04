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
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';
import { Header, Button } from '../../../components';
import { fetchChapter, BibleChapter, getVerseText } from '../../../lib/bibleApi';
import { parseScriptureCitationRanges } from '../../../lib/scriptureParser';
import { useDailyDevotional } from '../hooks/useDailyDevotional';
import { getVersesWithComments } from '../../bible/hooks/useBibleComments';
import { VerseCommentsModal } from '../../bible/components/VerseCommentsModal';
import { useAppStore } from '../../../store/useAppStore';

export const ScriptureDetailScreen: React.FC = () => {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const selectedDate = route.params?.date as string | undefined;
  const { devotional, markScriptureComplete, loading: devotionalLoading } = useDailyDevotional(selectedDate);
  const { currentGroup } = useAppStore();

  const [chapterData, setChapterData] = useState<BibleChapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [versesWithComments, setVersesWithComments] = useState<Set<number>>(new Set());
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);
  const [showCommentsModal, setShowCommentsModal] = useState(false);

  const fetchScripture = useCallback(async () => {
    // Wait for devotional to load before checking for scripture
    if (devotionalLoading) {
      return;
    }

    if (!devotional?.scripture) {
      setLoading(false);
      setError('No scripture available');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const ranges = parseScriptureCitationRanges(devotional.scripture);
      
      if (!ranges || ranges.length === 0) {
        setError('Could not parse scripture citation');
        setLoading(false);
        return;
      }

      // All ranges share same book/chapter; fetch once using first range
      const first = ranges[0];
      const data = await fetchChapter(first.book, first.chapter);
      
      if (data) {
        setChapterData(data);
        setError(null);
      } else {
        setError('Failed to load scripture. Please try again.');
      }
    } catch (error) {
      console.error('Error fetching scripture:', error);
      setError('Failed to load scripture. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [devotional?.scripture, devotionalLoading]);

  const parsedRanges = devotional?.scripture ? parseScriptureCitationRanges(devotional.scripture) : null;
  const parsed = parsedRanges && parsedRanges.length > 0 ? parsedRanges[0] : null;

  const fetchVersesWithComments = useCallback(async () => {
    if (!currentGroup?.id || !parsed) return;

    try {
      const verses = await getVersesWithComments(parsed.book, parsed.chapter, currentGroup.id);
      setVersesWithComments(verses);
    } catch (error) {
      console.error('Error fetching verses with comments:', error);
    }
  }, [currentGroup?.id, parsed]);

  useEffect(() => {
    fetchScripture();
  }, [fetchScripture]);

  useEffect(() => {
    if (chapterData && parsed) {
      fetchVersesWithComments();
    }
  }, [chapterData, parsed, fetchVersesWithComments]);

  const handleComplete = async () => {
    setCompleting(true);
    try {
      await markScriptureComplete();
      // Small delay to ensure database update is reflected
      await new Promise(resolve => setTimeout(resolve, 300));
      navigation.goBack();
    } catch (error: any) {
      console.error('Error marking scripture complete:', error);
      Alert.alert('Error', error?.message || 'Failed to mark as complete');
    } finally {
      setCompleting(false);
    }
  };

  const handleVersePress = (verseNumber: number) => {
    setSelectedVerse(verseNumber);
    setShowCommentsModal(true);
  };

  const handleCommentAdded = () => {
    // Refresh verses with comments after a comment is added
    fetchVersesWithComments();
  };

  const handleViewFullChapter = () => {
    // All ranges share same book/chapter; use first for navigation
    if (!parsed) return;
    navigation.navigate('ChapterView', {
      book: parsed.book,
      chapter: parsed.chapter,
    });
  };

  const scriptureReference = devotional?.scripture || '';
  
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
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Scripture
            </Text>
          </View>
        }
      />

      {devotionalLoading || loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={isDark ? '#3D5A50' : colors.primary} />
        </View>
      ) : error && !chapterData ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.errorText, { color: colors.textMuted }]}>
            {error}
          </Text>
        </View>
      ) : chapterData ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Reference */}
          <View style={styles.referenceContainer}>
            <Text style={[styles.reference, { color: colors.primary }]}>
              {scriptureReference}
            </Text>
            {/* One button only: all ranges are in the same book/chapter (e.g. 1 Timothy 6:6-12, 17-19) */}
            {parsed && (
              <TouchableOpacity
                style={[styles.viewChapterButton, { borderColor: colors.primary }]}
                onPress={handleViewFullChapter}
              >
                <Text style={[styles.viewChapterText, { color: colors.primary }]}>
                  View Full Chapter
                </Text>
                <Ionicons name="arrow-forward" size={16} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Scripture Text - render each range with a visual break between ranges */}
          <View style={styles.scriptureBlock}>
            {parsedRanges && parsedRanges.length > 0 ? (
              parsedRanges.map((range, rangeIndex) => {
                const versesInRange = chapterData.verses.filter(
                  (v) => v.verse >= range.startVerse && v.verse <= range.endVerse
                );
                return (
                  <React.Fragment key={`range-${range.startVerse}-${range.endVerse}`}>
                    {rangeIndex > 0 && (
                      <View style={[styles.rangeSeparator, { borderTopColor: colors.cardBorder }]}>
                        <Text style={[styles.rangeSeparatorText, { color: colors.textMuted }]}>
                          — verses {range.startVerse}–{range.endVerse} —
                        </Text>
                      </View>
                    )}
                    <Text style={styles.chapterText}>
                      {versesInRange.map((verse, index) => {
                        const hasComments = versesWithComments.has(verse.verse);
                        const handlePress = () => handleVersePress(verse.verse);
                        return (
                          <Text key={verse.verse}>
                            <Text
                              onPress={handlePress}
                              style={[
                                styles.verseWrapper,
                                hasComments && {
                                  backgroundColor: isDark
                                    ? 'rgba(61, 90, 80, 0.3)'
                                    : 'rgba(61, 90, 80, 0.1)',
                                  borderRadius: 4,
                                  paddingHorizontal: 4,
                                  paddingVertical: 2,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.verseNumber,
                                  hasComments && styles.verseNumberWithComments,
                                  { color: isDark ? '#3D5A50' : colors.primary },
                                ]}
                              >
                                {verse.verse}
                              </Text>
                              <Text
                                style={[styles.verseText, { color: colors.text }]}
                              >
                                {'  '}{verse.text}
                              </Text>
                            </Text>
                            {index < versesInRange.length - 1 && ' '}
                          </Text>
                        );
                      })}
                    </Text>
                  </React.Fragment>
                );
              })
            ) : (
              <Text style={[styles.chapterText, { color: colors.text }]}>
                No scripture ranges to display.
              </Text>
            )}
          </View>
        </ScrollView>
      ) : null}

      {/* Verse Comments Modal */}
      {selectedVerse !== null && selectedVerseText && parsed && (
        <VerseCommentsModal
          visible={showCommentsModal}
          book={parsed.book}
          chapter={parsed.chapter}
          verse={selectedVerse}
          verseText={selectedVerseText}
          onClose={() => {
            setShowCommentsModal(false);
            setSelectedVerse(null);
          }}
          onCommentAdded={handleCommentAdded}
        />
      )}

      {/* Complete Button */}
      <View style={[styles.footer, { borderTopColor: colors.cardBorder }]}>
        <Button
          title="Complete"
          onPress={handleComplete}
          loading={completing}
          fullWidth
        />
      </View>
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
    fontSize: 20,
    fontWeight: '700',
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
    paddingBottom: 100,
  },
  referenceContainer: {
    marginBottom: 24,
  },
  scriptureBlock: {
    gap: 0,
  },
  rangeSeparator: {
    marginTop: 20,
    marginBottom: 16,
    paddingTop: 20,
    borderTopWidth: 1,
    alignSelf: 'stretch',
  },
  rangeSeparatorText: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  reference: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  viewChapterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  viewChapterText: {
    fontSize: 14,
    fontWeight: '600',
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
  footer: {
    padding: 20,
    borderTopWidth: 1,
    backgroundColor: 'transparent',
  },
});
