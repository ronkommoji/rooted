import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface PillToggleProps {
  options: string[];
  selected: string;
  onSelect: (option: string) => void;
}

export const PillToggle: React.FC<PillToggleProps> = ({ 
  options, 
  selected, 
  onSelect 
}) => {
  const { colors, isDark } = useTheme();
  
  // Use dark green in dark mode
  const primaryColor = isDark ? '#3D5A50' : colors.primary;

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      {options.map((option) => {
        const isSelected = option === selected;
        return (
          <TouchableOpacity
            key={option}
            style={[
              styles.pill,
              isSelected && { backgroundColor: primaryColor },
            ]}
            onPress={() => onSelect(option)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.pillText,
                { color: isSelected ? '#FFFFFF' : colors.textSecondary },
              ]}
            >
              {option}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
  },
  pill: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

