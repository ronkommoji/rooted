import React from 'react';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

export type IconName = 
  | 'home' | 'home-outline'
  | 'prayer' | 'prayer-outline'
  | 'book' | 'book-outline'
  | 'calendar' | 'calendar-outline'
  | 'fire'
  | 'target'
  | 'seedling'
  | 'sparkles'
  | 'handshake'
  | 'check-circle'
  | 'heart' | 'heart-outline'
  | 'message' | 'message-outline'
  | 'location'
  | 'clock'
  | 'settings'
  | 'user'
  | 'bell'
  | 'moon'
  | 'sun'
  | 'eye' | 'eye-off'
  | 'plus'
  | 'close'
  | 'chevron-right'
  | 'chevron-left'
  | 'send'
  | 'vote';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
}

export const Icon: React.FC<IconProps> = ({ name, size = 24, color }) => {
  const { colors } = useTheme();
  const iconColor = color || colors.text;

  // Map icon names to actual icons
  const iconMap: Record<IconName, { set: 'ionicons' | 'material' | 'feather'; name: string }> = {
    'home': { set: 'ionicons', name: 'home' },
    'home-outline': { set: 'ionicons', name: 'home-outline' },
    'prayer': { set: 'material', name: 'hands-pray' },
    'prayer-outline': { set: 'material', name: 'hands-pray' },
    'book': { set: 'ionicons', name: 'book' },
    'book-outline': { set: 'ionicons', name: 'book-outline' },
    'calendar': { set: 'ionicons', name: 'calendar' },
    'calendar-outline': { set: 'ionicons', name: 'calendar-outline' },
    'fire': { set: 'ionicons', name: 'flame' },
    'target': { set: 'material', name: 'target' },
    'seedling': { set: 'material', name: 'sprout' },
    'sparkles': { set: 'ionicons', name: 'sparkles' },
    'handshake': { set: 'material', name: 'handshake' },
    'check-circle': { set: 'ionicons', name: 'checkmark-circle' },
    'heart': { set: 'ionicons', name: 'heart' },
    'heart-outline': { set: 'ionicons', name: 'heart-outline' },
    'message': { set: 'ionicons', name: 'chatbubble' },
    'message-outline': { set: 'ionicons', name: 'chatbubble-outline' },
    'location': { set: 'ionicons', name: 'location' },
    'clock': { set: 'ionicons', name: 'time-outline' },
    'settings': { set: 'ionicons', name: 'settings-outline' },
    'user': { set: 'ionicons', name: 'person-outline' },
    'bell': { set: 'ionicons', name: 'notifications-outline' },
    'moon': { set: 'ionicons', name: 'moon' },
    'sun': { set: 'ionicons', name: 'sunny' },
    'eye': { set: 'ionicons', name: 'eye-outline' },
    'eye-off': { set: 'ionicons', name: 'eye-off-outline' },
    'plus': { set: 'ionicons', name: 'add' },
    'close': { set: 'ionicons', name: 'close' },
    'chevron-right': { set: 'ionicons', name: 'chevron-forward' },
    'chevron-left': { set: 'ionicons', name: 'chevron-back' },
    'send': { set: 'ionicons', name: 'send' },
    'vote': { set: 'material', name: 'vote' },
  };

  const icon = iconMap[name];
  
  if (!icon) {
    return null;
  }

  switch (icon.set) {
    case 'ionicons':
      return <Ionicons name={icon.name as any} size={size} color={iconColor} />;
    case 'material':
      return <MaterialCommunityIcons name={icon.name as any} size={size} color={iconColor} />;
    case 'feather':
      return <Feather name={icon.name as any} size={size} color={iconColor} />;
    default:
      return null;
  }
};

