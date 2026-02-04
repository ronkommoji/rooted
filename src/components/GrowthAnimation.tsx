import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, Text } from 'react-native';
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
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(20)).current; // Start slightly below, move up
  const textScale = useRef(new Animated.Value(0.8)).current; // Start slightly smaller

  useEffect(() => {
    // Sequence of animations
    Animated.sequence([
      // 1. Circle grows (800ms)
      Animated.spring(circleScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      // 2. Plant appears and grows upward (700ms)
      Animated.parallel([
        Animated.timing(plantOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(plantTranslateY, {
          toValue: 0, // Move to center position
          tension: 70,
          friction: 9,
          useNativeDriver: true,
        }),
        Animated.spring(plantScale, {
          toValue: 1,
          tension: 90,
          friction: 7,
          useNativeDriver: true,
        }),
        // Leaves unfurl simultaneously (rotation animation)
        Animated.spring(plantRotate, {
          toValue: 0, // Rotate from -20 to 0 (unfurling)
          tension: 100,
          friction: 6,
          useNativeDriver: true,
        }),
      ]),
      // 3. Text appears (400ms)
      Animated.parallel([
        Animated.spring(textOpacity, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(textTranslateY, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(textScale, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
      // 4. Hold for a moment (600ms)
      Animated.delay(600),
      // 5. Circle expands to fill screen while plant and text fade out (600ms)
      Animated.parallel([
        Animated.timing(circleScale, {
          toValue: FULL_SCREEN_SCALE,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(plantOpacity, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(textOpacity, {
          toValue: 0,
          duration: 600,
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

      {/* Rooted Text - Animated, positioned below the logo */}
      <Animated.View
        style={[
          styles.textContainer,
          {
            opacity: textOpacity,
            transform: [
              { translateY: textTranslateY },
              { scale: textScale },
            ],
          },
        ]}
      >
        <Text style={styles.text}>Rooted</Text>
      </Animated.View>
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
  textContainer: {
    marginTop: 20, // Position below the circle
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 48,
    fontWeight: '700',
    fontFamily: 'PlayfairDisplay_700Bold',
    color: '#3D5A50',
    letterSpacing: 2,
  },
});
