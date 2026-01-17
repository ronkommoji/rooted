import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { Header, PillToggle, Input, Card, EmptyState } from '../../components';
import { useAppStore } from '../../store/useAppStore';
import { bibleBooks, getBooksByTestament, BibleBook } from '../../data/bibleBooks';
import { useBookCommentCounts } from './hooks/useBibleComments';
import { ChaptersModal } from './components';

export const BibleScreen: React.FC = () => {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const { currentGroup } = useAppStore();

  const [testament, setTestament] = useState<'Old' | 'New'>('Old');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [showChaptersModal, setShowChaptersModal] = useState(false);

  // Get books for selected testament
  const testamentBooks = useMemo(() => {
    return getBooksByTestament(testament);
  }, [testament]);

  // Filter books by search query
  const filteredBooks = useMemo(() => {
    if (!searchQuery.trim()) {
      return testamentBooks;
    }
    const query = searchQuery.toLowerCase().trim();
    return testamentBooks.filter((book) =>
      book.name.toLowerCase().includes(query)
    );
  }, [testamentBooks, searchQuery]);

  // Get comment counts for filtered books
  const bookNames = useMemo(
    () => filteredBooks.map((book) => book.name),
    [filteredBooks]
  );
  const { counts, loading: countsLoading, refetch: refetchBookCounts } = useBookCommentCounts(
    bookNames,
    currentGroup?.id || null
  );

  const handleBookPress = (book: BibleBook) => {
    setSelectedBook(book.name);
    setShowChaptersModal(true);
  };

  const handleChapterSelect = (chapter: number) => {
    if (!selectedBook) return;
    navigation.navigate('ChapterView', {
      book: selectedBook,
      chapter,
    });
    setShowChaptersModal(false);
    setSelectedBook(null);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // Refetch comment counts when user pulls to refresh
    await refetchBookCounts();
    setRefreshing(false);
  };

  // Refresh comment counts when screen comes into focus
  // This ensures counts are updated when navigating back from ChapterViewScreen
  useFocusEffect(
    React.useCallback(() => {
      if (currentGroup?.id && bookNames.length > 0) {
        // Small delay to ensure smooth transition
        setTimeout(() => {
          refetchBookCounts();
        }, 100);
      }
    }, [currentGroup?.id, bookNames.length])
  );

  const selectedBookData = selectedBook
    ? bibleBooks.find((b) => b.name === selectedBook)
    : null;

  const renderBook = ({ item: book }: { item: BibleBook }) => {
    const commentCount = counts[book.name] || 0;

    return (
      <TouchableOpacity
        onPress={() => handleBookPress(book)}
        activeOpacity={0.7}
      >
        <Card style={styles.bookCard}>
          <View style={styles.bookRow}>
            <Text style={[styles.bookName, { color: colors.text }]}>
              {book.name}
            </Text>
            {countsLoading ? (
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
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <Header title="Bible" />

      {/* Testament Selector */}
      <View style={styles.filterContainer}>
        <PillToggle
          options={['Old Testament', 'New Testament']}
          selected={testament === 'Old' ? 'Old Testament' : 'New Testament'}
          onSelect={(option) =>
            setTestament(option === 'Old Testament' ? 'Old' : 'New')
          }
        />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Input
          placeholder="Search bible"
          value={searchQuery}
          onChangeText={setSearchQuery}
          icon={
            <Ionicons
              name="search-outline"
              size={20}
              color={colors.textMuted}
            />
          }
          containerStyle={styles.searchInput}
        />
      </View>

      {/* Books List */}
      <FlatList
        data={filteredBooks}
        keyExtractor={(item) => item.name}
        renderItem={renderBook}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          !countsLoading ? (
            <EmptyState
              icon="book"
              title={
                searchQuery.trim()
                  ? 'No books found'
                  : `No ${testament === 'Old' ? 'Old' : 'New'} Testament books`
              }
              message={
                searchQuery.trim()
                  ? 'Try a different search term'
                  : 'Books will appear here'
              }
            />
          ) : null
        }
      />

      {/* Chapters Modal */}
      {selectedBookData && (
        <ChaptersModal
          visible={showChaptersModal}
          book={selectedBookData.name}
          chapterCount={selectedBookData.chapters}
          onClose={() => {
            setShowChaptersModal(false);
            setSelectedBook(null);
          }}
          onChapterSelect={handleChapterSelect}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  searchInput: {
    marginBottom: 0,
  },
  list: {
    padding: 20,
    paddingTop: 8,
  },
  bookCard: {
    marginBottom: 12,
  },
  bookRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  bookName: {
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
