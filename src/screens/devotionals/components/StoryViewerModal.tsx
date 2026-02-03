import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Image,
  Pressable,
  TouchableOpacity,
  Dimensions,
  Animated,
  PanResponder,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { StorySlide } from './StoryRow';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const AUTO_ADVANCE_DELAY = 5000; // 5 seconds

interface StoryViewerModalProps {
  visible: boolean;
  storySlides: StorySlide[];
  initialMemberId: string;
  onClose: () => void;
}

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  visible,
  storySlides,
  initialMemberId,
  onClose,
}) => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  
  // Find the first slide for the initial member
  const initialIndex = storySlides.findIndex(
    (s) => s.memberId === initialMemberId
  );
  const [currentIndex, setCurrentIndex] = useState(
    initialIndex >= 0 ? initialIndex : 0
  );
  const [isPaused, setIsPaused] = useState(false);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const progressValue = useRef(0); // Track actual progress value for pause/resume

  // Track progress value for pause/resume
  useEffect(() => {
    const listenerId = progressAnim.addListener(({ value }) => {
      progressValue.current = value;
    });
    return () => {
      progressAnim.removeListener(listenerId);
    };
  }, [progressAnim]);

  // Reset index when modal opens
  useEffect(() => {
    if (visible) {
      const idx = storySlides.findIndex((s) => s.memberId === initialMemberId);
      setCurrentIndex(idx >= 0 ? idx : 0);
      progressAnim.setValue(0);
      progressValue.current = 0;
      setIsPaused(false);
    }
  }, [visible, initialMemberId, storySlides]);

  // Prefetch all story images when viewer opens so they're cached for smooth viewing
  useEffect(() => {
    if (!visible || storySlides.length === 0) return;

    const urls: string[] = [];
    storySlides.forEach((slide) => {
      if (slide.imageUrl?.trim()) urls.push(slide.imageUrl);
    });

    urls.forEach((url) => {
      Image.prefetch(url).catch(() => {
        // Ignore prefetch errors; image will load on demand
      });
    });
  }, [visible, storySlides]);

  // Start animation helper
  const startAnimation = useCallback((fromValue: number = 0) => {
    // Calculate remaining duration based on progress
    const remainingDuration = AUTO_ADVANCE_DELAY * (1 - fromValue);
    
    if (fromValue === 0) {
      progressAnim.setValue(0);
    }
    
    animationRef.current = Animated.timing(progressAnim, {
      toValue: 1,
      duration: remainingDuration,
      useNativeDriver: false,
    });

    animationRef.current.start(({ finished }) => {
      if (finished) {
        goToNext();
      }
    });
  }, [progressAnim]);

  // Stop animation helper
  const stopAnimation = useCallback(() => {
    if (animationRef.current) {
      animationRef.current.stop();
      animationRef.current = null;
    }
  }, []);

  // Auto-advance timer
  useEffect(() => {
    if (!visible || storySlides.length === 0 || isPaused) return;

    // Reset progress when changing stories
    progressAnim.setValue(0);
    progressValue.current = 0;
    startAnimation(0);

    return () => {
      stopAnimation();
    };
  }, [visible, currentIndex, storySlides.length, isPaused, startAnimation, stopAnimation]);

  // Handle pause/resume
  const handlePauseStart = useCallback(() => {
    setIsPaused(true);
    stopAnimation();
  }, [stopAnimation]);

  const handlePauseEnd = useCallback(() => {
    setIsPaused(false);
    // Resume from where we paused
    startAnimation(progressValue.current);
  }, [startAnimation]);

  const goToNext = () => {
    if (currentIndex < storySlides.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Last slide - close
      handleClose();
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      translateY.setValue(0);
      opacity.setValue(1);
      onClose();
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
          opacity.setValue(1 - gestureState.dy / (SCREEN_HEIGHT * 0.5));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100) {
          handleClose();
        } else {
          Animated.parallel([
            Animated.spring(translateY, {
              toValue: 0,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
    })
  ).current;

  const handleScreenPress = (event: any) => {
    const x = event.nativeEvent.locationX;
    if (x > SCREEN_WIDTH / 2) {
      goToNext();
    } else {
      goToPrev();
    }
  };

  if (storySlides.length === 0) {
    return null;
  }

  const currentSlide = storySlides[currentIndex];

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return parts[0][0] + parts[1][0];
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <StatusBar barStyle="light-content" />
      <Animated.View
        style={[
          styles.container,
          {
            transform: [{ translateY }],
            opacity,
          },
        ]}
        {...panResponder.panHandlers}
      >
        {/* Progress bars + header - use insets so content stays below status bar & Dynamic Island */}
        <View style={[styles.safeTop, { paddingTop: insets.top }]}>
          <View style={styles.progressContainer}>
            {storySlides.map((_, index) => (
              <View key={index} style={styles.progressBarBg}>
                <Animated.View
                  style={[
                    styles.progressBarFill,
                    {
                      width:
                        index < currentIndex
                          ? '100%'
                          : index === currentIndex
                          ? progressAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: ['0%', '100%'],
                            })
                          : '0%',
                    },
                  ]}
                />
              </View>
            ))}
          </View>

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.userInfo}
              onPress={() => {
                onClose();
                setTimeout(() => {
                  navigation.navigate('Profile', { userId: currentSlide.memberId });
                }, 300);
              }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`View ${currentSlide.memberName}'s profile`}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {getInitials(currentSlide.memberName)}
                </Text>
              </View>
              <Text style={styles.userName}>{currentSlide.memberName}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Image or Text Story */}
        <Pressable
          style={styles.imageContainer}
          onPress={handleScreenPress}
          onLongPress={handlePauseStart}
          onPressOut={handlePauseEnd}
          delayLongPress={150}
        >
          {currentSlide.type === 'image' ? (
            <Image
              source={{ uri: currentSlide.imageUrl, cache: 'force-cache' }}
              style={styles.image}
              resizeMode="contain"
            />
          ) : currentSlide.type === 'daily' ? (
            <View style={styles.textStoryContainer}>
              {/* Background image from daily devotional API */}
              {currentSlide.imageUrl && (
                <Image
                  source={{ uri: currentSlide.imageUrl, cache: 'force-cache' }}
                  style={styles.backgroundImage}
                  resizeMode="cover"
                />
              )}
              {/* Overlay for better text readability */}
              <View style={styles.overlay} />
              {/* Content */}
              <View style={styles.textStoryContent}>
                <Ionicons name="checkmark-circle" size={64} color="#4CAF50" />
                <Text style={styles.textStoryTitle}>{currentSlide.title || 'Completed in app devotional'}</Text>
                {currentSlide.dailyDevotionalComment && (
                  <View style={styles.commentContainer}>
                    <Text style={styles.commentLabel}>Your comment:</Text>
                    <Text style={styles.commentText}>{currentSlide.dailyDevotionalComment}</Text>
                    <TouchableOpacity
                      style={styles.viewDevotionalButton}
                      onPress={() => {
                        onClose();
                        // Navigate to devotional detail screen
                        navigation.navigate('DevotionalDetail');
                      }}
                    >
                      <Text style={styles.viewDevotionalText}>View Devotional →</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          ) : null}
          {/* Optional: Visual indicator when paused */}
          {isPaused && (
            <View style={styles.pauseIndicator}>
              <Ionicons name="pause" size={48} color="rgba(255,255,255,0.7)" />
            </View>
          )}
        </Pressable>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  safeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: 'transparent',
  },
  progressContainer: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingTop: 8,
    gap: 4,
  },
  progressBarBg: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    flex: 1,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: 'relative',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
  },
  pauseIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  textStoryContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: 'relative',
    backgroundColor: 'rgba(61, 90, 80, 0.1)',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: 'rgba(0, 0, 0, 0.4)', // Dark overlay for better text readability
  },
  textStoryContent: {
    alignItems: 'center',
    maxWidth: 300,
    zIndex: 1, // Ensure content is above background and overlay
    paddingHorizontal: 40,
  },
  textStoryTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  commentContainer: {
    width: '100%',
    marginTop: 24,
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Darker background for better readability over image
    borderRadius: 12,
    zIndex: 1,
  },
  commentLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  commentText: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  viewDevotionalButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'flex-start',
  },
  viewDevotionalText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

