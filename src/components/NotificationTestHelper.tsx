/**
 * Notification Test Helper Component
 * 
 * Add this temporarily to any screen for quick notification testing
 * Remove before production build
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useAppStore } from '../store/useAppStore';
import { sendPushNotification, scheduleDevotionalReminder, scheduleEventNotifications } from '../lib/notifications';
import { useTheme } from '../theme/ThemeContext';

export const NotificationTestHelper: React.FC = () => {
  const { colors } = useTheme();
  const { session, currentGroup } = useAppStore();
  const [scheduledCount, setScheduledCount] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [`${new Date().toLocaleTimeString()}: ${message}`, ...prev].slice(0, 10));
  };

  const checkScheduled = async () => {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      setScheduledCount(scheduled.length);
      addLog(`Found ${scheduled.length} scheduled notifications`);
      scheduled.forEach(n => {
        console.log(`- ${n.identifier}: ${n.content.title}`);
      });
    } catch (error) {
      addLog(`Error: ${error}`);
    }
  };

  const testLocalNotification = async () => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "🧪 Test Notification",
          body: "This is a test local notification",
          sound: true,
          data: { type: 'test' },
        },
        trigger: null, // Immediate
      });
      addLog("Local notification sent");
    } catch (error) {
      addLog(`Error: ${error}`);
    }
  };

  const testPushNotification = async () => {
    if (!session?.user?.id) {
      addLog("Error: No user session");
      return;
    }
    try {
      await sendPushNotification(
        session.user.id,
        "🧪 Test Push Notification",
        "Testing push notifications via Edge Function",
        { type: 'test' }
      );
      addLog("Push notification sent");
    } catch (error) {
      addLog(`Error: ${error}`);
    }
  };

  const testDevotionalReminder = async () => {
    try {
      // Schedule for 1 minute from now
      const now = new Date();
      now.setMinutes(now.getMinutes() + 1);
      await scheduleDevotionalReminder(now.getHours(), now.getMinutes());
      addLog(`Devotional reminder scheduled for ${now.toLocaleTimeString()}`);
      await checkScheduled();
    } catch (error) {
      addLog(`Error: ${error}`);
    }
  };

  const testEventNotification = async () => {
    if (!currentGroup?.id) {
      addLog("Error: No group selected");
      return;
    }
    try {
      // Schedule for 1 hour from now
      const eventDate = new Date();
      eventDate.setHours(eventDate.getHours() + 1);
      await scheduleEventNotifications(
        'test-event-id',
        'Test Event',
        eventDate,
        'Test Location'
      );
      addLog(`Event notifications scheduled for ${eventDate.toLocaleTimeString()}`);
      await checkScheduled();
    } catch (error) {
      addLog(`Error: ${error}`);
    }
  };

  const checkPermissions = async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      addLog(`Permission status: ${status}`);
      if (status !== 'granted') {
        addLog("⚠️ Permissions not granted!");
      }
    } catch (error) {
      addLog(`Error: ${error}`);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <Text style={[styles.title, { color: colors.text }]}>🧪 Notification Tester</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Scheduled: {scheduledCount}
      </Text>

      <ScrollView style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={checkPermissions}
        >
          <Text style={styles.buttonText}>Check Permissions</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={checkScheduled}
        >
          <Text style={styles.buttonText}>Check Scheduled</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={testLocalNotification}
        >
          <Text style={styles.buttonText}>Test Local Notification</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={testPushNotification}
        >
          <Text style={styles.buttonText}>Test Push Notification</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={testDevotionalReminder}
        >
          <Text style={styles.buttonText}>Test Devotional Reminder</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={testEventNotification}
        >
          <Text style={styles.buttonText}>Test Event Notifications</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.error }]}
          onPress={clearLogs}
        >
          <Text style={styles.buttonText}>Clear Logs</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={[styles.logContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.logTitle, { color: colors.text }]}>Logs:</Text>
        <ScrollView style={styles.logs}>
          {logs.length === 0 ? (
            <Text style={[styles.logText, { color: colors.textMuted }]}>No logs yet</Text>
          ) : (
            logs.map((log, index) => (
              <Text key={index} style={[styles.logText, { color: colors.textSecondary }]}>
                {log}
              </Text>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    margin: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  buttonContainer: {
    maxHeight: 200,
  },
  button: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  logContainer: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    maxHeight: 150,
  },
  logTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  logs: {
    maxHeight: 100,
  },
  logText: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
});

