import React, { ReactNode } from 'react';
import { View, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface CardProps {
  children: ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  variant?: 'default' | 'accent' | 'primary';
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  style, 
  onPress,
  variant = 'default' 
}) => {
  const { colors } = useTheme();

  const getBackgroundColor = () => {
    switch (variant) {
      case 'accent':
        return colors.accent;
      case 'primary':
        return colors.primary;
      default:
        return colors.card;
    }
  };

  const cardStyle: ViewStyle = {
    backgroundColor: getBackgroundColor(),
    borderColor: variant === 'default' ? colors.cardBorder : 'transparent',
  };

  if (onPress) {
    return (
      <TouchableOpacity 
        style={[styles.card, cardStyle, style]} 
        onPress={onPress}
        activeOpacity={0.7}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.card, cardStyle, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
});

