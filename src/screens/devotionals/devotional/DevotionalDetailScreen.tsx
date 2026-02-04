import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';
import { Header, Button } from '../../../components';
import { useDailyDevotional } from '../hooks/useDailyDevotional';
import { CommentsModal } from '../components/CommentsModal';
import { useAppStore } from '../../../store/useAppStore';
import { supabase } from '../../../lib/supabase';

export const DevotionalDetailScreen: React.FC = () => {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation();
  const route = useRoute<any>();
  const selectedDate = route.params?.date as string | undefined;
  const { devotional, markDevotionalComplete, loading: devotionalLoading } = useDailyDevotional(selectedDate);
  const { currentGroup, session } = useAppStore();

  const [completing, setCompleting] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [devotionalId, setDevotionalId] = useState<string | null>(null);
  const [commentCount, setCommentCount] = useState(0);

  // Get or create devotional entry for comments
  useEffect(() => {
    const getOrCreateDevotionalForComments = async () => {
      if (!currentGroup?.id || !session?.user?.id || !devotional) return;

      try {
        // Check if a daily devotional entry exists for today
        // Check for any entry with content starting with "Daily Devotional" and no image
        const today = new Date().toISOString().split('T')[0];
        const targetDate = selectedDate || today;
        const { data: existingEntries } = await supabase
          .from('devotionals')
          .select('id, content')
          .eq('user_id', session.user.id)
          .eq('group_id', currentGroup.id)
          .eq('post_date', targetDate)
          .is('image_url', null);

        let devotionalIdForComments: string | null = null;

        // Find an entry that matches our daily devotional pattern
        const existing = existingEntries?.find(
          (entry) => entry.content && entry.content.startsWith('Daily Devotional')
        );

        if (existing) {
          devotionalIdForComments = existing.id;
          setDevotionalId(existing.id);
        } else {
          // Create a placeholder entry for comments (will be updated when all items are complete)
          const { data: newDevotional, error } = await supabase
            .from('devotionals')
            .insert({
              user_id: session.user.id,
              group_id: currentGroup.id,
              post_date: targetDate,
              content: `Daily Devotional: ${devotional.title}`,
              image_url: null,
            })
            .select('id')
            .single();

          if (error && error.code !== '23505') { // Ignore duplicate key errors
            console.error('Error creating devotional for comments:', error);
          } else if (newDevotional) {
            devotionalIdForComments = newDevotional.id;
            setDevotionalId(newDevotional.id);
          }
        }

        // Get comment count
        if (devotionalIdForComments) {
          const { count } = await supabase
            .from('devotional_comments')
            .select('*', { count: 'exact', head: true })
            .eq('devotional_id', devotionalIdForComments);

          setCommentCount(count || 0);
        }
      } catch (error) {
        console.error('Error in getOrCreateDevotionalForComments:', error);
      }
    };

    getOrCreateDevotionalForComments();
  }, [currentGroup?.id, session?.user?.id, devotional, selectedDate]);

  const handleComplete = async () => {
    setCompleting(true);
    try {
      await markDevotionalComplete();
      // Small delay to ensure database update is reflected
      await new Promise(resolve => setTimeout(resolve, 300));
      navigation.goBack();
    } catch (error: any) {
      console.error('Error marking devotional complete:', error);
      Alert.alert('Error', error?.message || 'Failed to mark as complete');
    } finally {
      setCompleting(false);
    }
  };

  // Show loading state while devotional is being fetched
  if (devotionalLoading) {
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
                Devotional
              </Text>
            </View>
          }
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={isDark ? '#3D5A50' : colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // Only show error if loading is complete and devotional is still null
  if (!devotional) {
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
                Devotional
              </Text>
            </View>
          }
        />
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.textMuted }]}>
            No devotional available
          </Text>
        </View>
      </SafeAreaView>
    );
  }

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
              Devotional
            </Text>
          </View>
        }
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <Text style={[styles.title, { color: colors.text }]}>
          {devotional.title}
        </Text>

        {/* Author */}
        <Text style={[styles.author, { color: colors.textSecondary }]}>
          by {devotional.author}
        </Text>

        {/* Content */}
        <View style={styles.contentSection}>
          {devotional.content.map((paragraph, index) => (
            <Text
              key={index}
              style={[styles.paragraph, { color: colors.text }]}
            >
              {paragraph}
            </Text>
          ))}
        </View>

        {/* Featured Verse */}
        {devotional.featured_verse && (
          <View style={[styles.verseContainer, { backgroundColor: isDark ? '#2A2A2A' : '#F5F4F0' }]}>
            <Text style={[styles.verseText, { color: colors.text }]}>
              {devotional.featured_verse}
            </Text>
          </View>
        )}

        {/* Reflect & Pray */}
        {devotional.reflect_pray && (
          <View style={styles.reflectSection}>
            {devotional.reflect_pray.question && (
              <View style={styles.questionContainer}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                  REFLECT
                </Text>
                <Text style={[styles.question, { color: colors.text }]}>
                  {devotional.reflect_pray.question}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Insights */}
        {devotional.insights && (
          <View style={styles.insightsSection}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              INSIGHTS
            </Text>
            <Text style={[styles.insights, { color: colors.text }]}>
              {devotional.insights}
            </Text>
          </View>
        )}

        {/* Source */}
        <View style={styles.sourceContainer}>
          <Text style={[styles.source, { color: colors.textMuted }]}>
            Source: odbm.org
          </Text>
        </View>

        {/* Comments Button */}
        {devotionalId && (
          <TouchableOpacity
            style={[styles.commentsButton, { borderColor: colors.cardBorder }]}
            onPress={() => setShowComments(true)}
          >
            <Ionicons name="chatbubble-outline" size={20} color={colors.text} />
            <Text style={[styles.commentsButtonText, { color: colors.text }]}>
              Comments {commentCount > 0 && `(${commentCount})`}
            </Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Complete Button */}
      <View style={[styles.footer, { borderTopColor: colors.cardBorder }]}>
        <Button
          title="Complete"
          onPress={handleComplete}
          loading={completing}
          fullWidth
        />
      </View>

      {/* Comments Modal */}
      <CommentsModal
        visible={showComments}
        devotionalId={devotionalId}
        onClose={() => setShowComments(false)}
        onCommentCountChange={(count) => setCommentCount(count)}
      />
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    lineHeight: 32,
  },
  author: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 24,
  },
  contentSection: {
    marginBottom: 24,
    gap: 16,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 26,
    fontWeight: '400',
  },
  verseContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  verseText: {
    fontSize: 16,
    lineHeight: 24,
    fontStyle: 'italic',
    fontWeight: '500',
  },
  reflectSection: {
    marginBottom: 24,
  },
  questionContainer: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  question: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
  },
  insightsSection: {
    marginBottom: 24,
  },
  insights: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '400',
  },
  sourceContainer: {
    marginBottom: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  source: {
    fontSize: 12,
    fontWeight: '500',
  },
  commentsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  commentsButtonText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    backgroundColor: 'transparent',
  },
});
