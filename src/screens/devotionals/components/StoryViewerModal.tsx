import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Image,
  TouchableOpacity,
  Dimensions,
  Animated,
  PanResponder,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MemberSubmission } from './StoryRow';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const AUTO_ADVANCE_DELAY = 5000; // 5 seconds

interface StoryViewerModalProps {
  visible: boolean;
  stories: MemberSubmission[];
  initialMemberId: string;
  onClose: () => void;
}

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  visible,
  stories,
  initialMemberId,
  onClose,
}) => {
  // Filter to only posted stories
  const postedStories = stories.filter((s) => s.hasPosted && s.imageUrl);

  const initialIndex = postedStories.findIndex(
    (s) => s.memberId === initialMemberId
  );
  const [currentIndex, setCurrentIndex] = useState(
    initialIndex >= 0 ? initialIndex : 0
  );

  const progressAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  // Reset index when modal opens
  useEffect(() => {
    if (visible) {
      const idx = postedStories.findIndex((s) => s.memberId === initialMemberId);
      setCurrentIndex(idx >= 0 ? idx : 0);
      progressAnim.setValue(0);
    }
  }, [visible, initialMemberId]);

  // Auto-advance timer
  useEffect(() => {
    if (!visible || postedStories.length === 0) return;

    progressAnim.setValue(0);
    const animation = Animated.timing(progressAnim, {
      toValue: 1,
      duration: AUTO_ADVANCE_DELAY,
      useNativeDriver: false,
    });

    animation.start(({ finished }) => {
      if (finished) {
        goToNext();
      }
    });

    return () => {
      animation.stop();
    };
  }, [visible, currentIndex, postedStories.length]);

  const goToNext = () => {
    if (currentIndex < postedStories.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Last story - close
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

  if (postedStories.length === 0) {
    return null;
  }

  const currentStory = postedStories[currentIndex];

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
        {/* Progress bars */}
        <SafeAreaView edges={['top']} style={styles.safeTop}>
          <View style={styles.progressContainer}>
            {postedStories.map((_, index) => (
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
            <View style={styles.userInfo}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {getInitials(currentStory.memberName)}
                </Text>
              </View>
              <Text style={styles.userName}>{currentStory.memberName}</Text>
            </View>

            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {/* Image */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={handleScreenPress}
          style={styles.imageContainer}
        >
          <Image
            source={{ uri: currentStory.imageUrl || '' }}
            style={styles.image}
            resizeMode="contain"
          />
        </TouchableOpacity>
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
    justifyContent: 'center',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
  },
});

