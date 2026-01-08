import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ActivityIndicator,
  ViewStyle,
  TextStyle 
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
  fullWidth = false,
}) => {
  const { colors, isDark } = useTheme();
  
  // Use dark green in dark mode instead of light green/teal
  const primaryColor = isDark ? '#3D5A50' : colors.primary;

  const getButtonStyles = (): ViewStyle => {
    const base: ViewStyle = {
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    };

    // Size
    switch (size) {
      case 'small':
        base.paddingVertical = 8;
        base.paddingHorizontal = 16;
        break;
      case 'large':
        base.paddingVertical = 18;
        base.paddingHorizontal = 32;
        break;
      default:
        base.paddingVertical = 14;
        base.paddingHorizontal = 24;
    }

    // Variant
    switch (variant) {
      case 'secondary':
        base.backgroundColor = colors.secondary;
        break;
      case 'outline':
        base.backgroundColor = 'transparent';
        base.borderWidth = 2;
        base.borderColor = primaryColor;
        break;
      case 'ghost':
        base.backgroundColor = 'transparent';
        break;
      default:
        base.backgroundColor = primaryColor;
    }

    if (disabled) {
      base.opacity = 0.5;
    }

    if (fullWidth) {
      base.width = '100%';
    }

    return base;
  };

  const getTextStyles = (): TextStyle => {
    const base: TextStyle = {
      fontWeight: '600',
    };

    // Size
    switch (size) {
      case 'small':
        base.fontSize = 14;
        break;
      case 'large':
        base.fontSize = 18;
        break;
      default:
        base.fontSize = 16;
    }

    // Variant
    switch (variant) {
      case 'secondary':
        base.color = colors.text;
        break;
      case 'outline':
      case 'ghost':
        base.color = primaryColor;
        break;
      default:
        base.color = '#FFFFFF';
    }

    return base;
  };

  return (
    <TouchableOpacity
      style={[getButtonStyles(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator 
          color={variant === 'primary' ? '#FFFFFF' : primaryColor} 
          style={{ marginRight: 8 }}
        />
      ) : null}
      <Text style={[getTextStyles(), textStyle]}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({});

