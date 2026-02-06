import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface GrowthAnimationProps {
  onComplete?: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
// Calculate scale needed to fill entire screen from 240px diameter circle
const CIRCLE_DIAMETER = 240;
const SCREEN_DIAGONAL = Math.sqrt(SCREEN_WIDTH ** 2 + SCREEN_HEIGHT ** 2);
const FULL_SCREEN_SCALE = (SCREEN_DIAGONAL / CIRCLE_DIAMETER) * 1.2; // 1.2 for extra coverage

export const GrowthAnimation: React.FC<GrowthAnimationProps> = ({ onComplete }) => {
  // Animation values
  const circleScale = useRef(new Animated.Value(0)).current;
  const plantScale = useRef(new Animated.Value(0.3)).current; // Start small
  const plantTranslateY = useRef(new Animated.Value(50)).current; // Start below, grow upward
  const plantRotate = useRef(new Animated.Value(-20)).current; // Start more rotated (closed), unfurl to 0
  const plantOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Sequence of animations (sped up)
    Animated.sequence([
      // 1. Circle grows
      Animated.spring(circleScale, {
        toValue: 1,
        tension: 80,
        friction: 8,
        useNativeDriver: true,
      }),
      // 2. Plant appears and grows upward
      Animated.parallel([
        Animated.timing(plantOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(plantTranslateY, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(plantScale, {
          toValue: 1,
          tension: 120,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.spring(plantRotate, {
          toValue: 0,
          tension: 120,
          friction: 6,
          useNativeDriver: true,
        }),
      ]),
      // 3. Hold briefly
      Animated.delay(350),
      // 4. Circle expands to fill screen while plant fades out
      Animated.parallel([
        Animated.timing(circleScale, {
          toValue: FULL_SCREEN_SCALE,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(plantOpacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      onComplete?.();
    });
  }, []);

  // Interpolate rotation for transform
  const plantRotation = plantRotate.interpolate({
    inputRange: [-20, 0],
    outputRange: ['-20deg', '0deg'],
  });

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Background Circle - Expands to fill screen */}
        <Animated.View
          style={[
            styles.circleWrapper,
            {
              transform: [{ scale: circleScale }],
            },
          ]}
        >
          <Svg width={300} height={300} viewBox="0 0 300 300">
            <Circle cx="150" cy="150" r="120" fill="#3D5A50" />
          </Svg>
        </Animated.View>

        {/* Sprout Icon - Animated */}
        <Animated.View
          style={[
            styles.iconContainer,
            {
              opacity: plantOpacity,
              transform: [
                { translateY: plantTranslateY },
                { scale: plantScale },
                { rotate: plantRotation },
              ],
            },
          ]}
        >
          <MaterialCommunityIcons name="sprout" size={120} color="#FFFFFF" />
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F4EF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 300,
    height: 300,
    position: 'relative',
  },
  circleWrapper: {
    position: 'absolute',
    width: 300,
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    width: 120,
    height: 120,
  },
});
