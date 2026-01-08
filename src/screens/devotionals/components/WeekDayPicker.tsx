import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, addDays, isSameDay, startOfWeek, subWeeks, addWeeks } from 'date-fns';
import { useTheme } from '../../../theme/ThemeContext';

interface WeekDayPickerProps {
  weekStart: Date;
  selectedDate: Date;
  onWeekChange: (newWeekStart: Date) => void;
  onDaySelect: (date: Date) => void;
}

export const WeekDayPicker: React.FC<WeekDayPickerProps> = ({
  weekStart,
  selectedDate,
  onWeekChange,
  onDaySelect,
}) => {
  const { colors, isDark } = useTheme();
  
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const dayLetters = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const handlePrevWeek = () => {
    onWeekChange(subWeeks(weekStart, 1));
  };

  const handleNextWeek = () => {
    onWeekChange(addWeeks(weekStart, 1));
  };

  return (
    <View style={styles.container}>
      {/* Week Label */}
      <Text style={[styles.weekLabel, { color: colors.textSecondary }]}>
        Week of {format(weekStart, 'MMMM d, yyyy')}
      </Text>

      {/* Week Navigation */}
      <View style={styles.weekNav}>
        <TouchableOpacity onPress={handlePrevWeek} style={styles.navArrow}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.weekDays}>
          {weekDays.map((day, index) => {
            const isSelected = isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());

            return (
              <TouchableOpacity
                key={day.toISOString()}
                style={[
                  styles.dayButton,
                  isSelected && { backgroundColor: isDark ? '#3D5A50' : colors.primary },
                  !isSelected && isToday && { 
                    borderColor: isDark ? '#3D5A50' : colors.primary, 
                    borderWidth: 2 
                  },
                ]}
                onPress={() => onDaySelect(day)}
              >
                <Text
                  style={[
                    styles.dayLetter,
                    { color: isSelected ? '#FFFFFF' : colors.text },
                  ]}
                >
                  {dayLetters[index]}
                </Text>
                <Text
                  style={[
                    styles.dayNumber,
                    { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                  ]}
                >
                  {format(day, 'd')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity onPress={handleNextWeek} style={styles.navArrow}>
          <Ionicons name="chevron-forward" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  weekLabel: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 12,
  },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navArrow: {
    padding: 8,
  },
  weekDays: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  dayButton: {
    width: 40,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayLetter: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '500',
  },
});

