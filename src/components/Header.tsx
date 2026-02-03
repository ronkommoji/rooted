import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Avatar } from './Avatar';
import { useAppStore } from '../store/useAppStore';
import { useNavigation } from '@react-navigation/native';

interface HeaderProps {
  title?: string;
  showAvatar?: boolean;
  showGroup?: boolean;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  showAvatar = true,
  showGroup = false,
  leftElement,
  rightElement,
}) => {
  const { colors } = useTheme();
  const { profile, currentGroup, session } = useAppStore();
  const navigation = useNavigation<any>();

  const openProfile = () => {
    if (session?.user?.id) {
      navigation.navigate('Profile', { userId: session.user.id });
    }
  };

  // Determine what to show as the main title
  const displayTitle = showGroup && currentGroup ? currentGroup.name : title;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {/* Left side - Title or Group Name or custom element */}
        <View style={styles.left}>
          {leftElement || (
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {displayTitle}
            </Text>
          )}
        </View>

        {/* Right side - Avatar or custom element */}
        <View style={styles.right}>
          {rightElement !== undefined ? (
            rightElement
          ) : (
            showAvatar && (
              <Avatar 
                name={profile?.full_name} 
                imageUrl={profile?.avatar_url}
                size={40}
                onPress={openProfile}
                backgroundColor={colors.primary}
              />
            )
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flex: 1,
    marginRight: 16,
  },
  right: {
    flexShrink: 0,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'PlayfairDisplay_700Bold', // Playfair Display Bold font for app title
  },
});
