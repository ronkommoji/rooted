import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { lightTheme, darkTheme, ThemeColors } from './colors';
import { useAppStore } from '../store/useAppStore';

interface ThemeContextType {
  colors: ThemeColors;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const { preferences, updatePreferences } = useAppStore();
  
  const isDark = preferences?.theme === 'dark' || 
    (preferences?.theme === undefined && systemColorScheme === 'dark');
  
  const colors = isDark ? darkTheme : lightTheme;

  const toggleTheme = () => {
    const newTheme = isDark ? 'light' : 'dark';
    updatePreferences({ theme: newTheme });
  };

  return (
    <ThemeContext.Provider value={{ colors, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

