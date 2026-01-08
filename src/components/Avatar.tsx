import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface AvatarProps {
  name?: string;
  imageUrl?: string | null;
  size?: number;
  onPress?: () => void;
}

export const Avatar: React.FC<AvatarProps> = ({ 
  name = '', 
  imageUrl, 
  size = 40, 
  onPress 
}) => {
  const { colors, isDark } = useTheme();
  
  // Get initials from name (first + last initial if available)
  const getInitials = (fullName: string): string => {
    if (!fullName) return '?';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }
    return parts[0].charAt(0).toUpperCase() || '?';
  };

  const initials = getInitials(name);
  
  // Use neutral color for avatars in dark mode, primary (green) only in light mode
  const avatarBg = isDark ? (colors.avatarBg || '#3A3A3A') : colors.primary;
  
  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: avatarBg,
  };

  const content = imageUrl ? (
    <Image 
      source={{ uri: imageUrl }} 
      style={[containerStyle, styles.image]} 
    />
  ) : (
    <View style={[styles.container, containerStyle]}>
      <Text style={[styles.initial, { fontSize: initials.length > 1 ? size * 0.35 : size * 0.4, color: '#FFFFFF' }]}>
        {initials}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    resizeMode: 'cover',
  },
  initial: {
    fontFamily: 'System',
    fontWeight: '600',
  },
});

