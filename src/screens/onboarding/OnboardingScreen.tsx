import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView,
  Alert,
  TouchableOpacity,
  Switch,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useTheme } from '../../theme/ThemeContext';
import { Input, Button, Card } from '../../components';
import { useAppStore } from '../../store/useAppStore';
import { requestNotificationPermissions, registerForPushNotifications } from '../../lib/notifications';

type OnboardingStep = 'choice' | 'create' | 'join' | 'notifications' | 'notification-setup';

export const OnboardingScreen: React.FC = () => {
  const { colors, isDark } = useTheme();
  const { createGroup, joinGroup, fetchGroupMembers, updatePreferences } = useAppStore();
  
  const [step, setStep] = useState<OnboardingStep>('choice');
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Notification setup state
  const [reminderCount, setReminderCount] = useState(1);
  const [reminderTimes, setReminderTimes] = useState<Date[]>([
    new Date(new Date().setHours(7, 0, 0, 0)), // 7 AM
    new Date(new Date().setHours(12, 0, 0, 0)), // 12 PM
    new Date(new Date().setHours(18, 0, 0, 0)), // 6 PM
  ]);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timePickerIndex, setTimePickerIndex] = useState(0);
  const [prayerReminderEnabled, setPrayerReminderEnabled] = useState(false);
  const [prayerReminderTime, setPrayerReminderTime] = useState(new Date(new Date().setHours(20, 0, 0, 0))); // 8 PM
  const [showPrayerTimePicker, setShowPrayerTimePicker] = useState(false);
  const [smartNotificationsEnabled, setSmartNotificationsEnabled] = useState(true);

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    setLoading(true);
    try {
      await createGroup(groupName.trim(), groupDescription.trim() || undefined);
      await fetchGroupMembers();
      // Move to notification permission step
      setStep('notifications');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async () => {
    if (!inviteCode.trim()) {
      Alert.alert('Error', 'Please enter an invite code');
      return;
    }

    setLoading(true);
    try {
      await joinGroup(inviteCode.trim());
      await fetchGroupMembers();
      // Move to notification permission step
      setStep('notifications');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to join group');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestNotifications = async () => {
    setLoading(true);
    try {
      const hasPermission = await requestNotificationPermissions();
      if (hasPermission) {
        // Register push token after permission granted
        const { session } = useAppStore.getState();
        if (session?.user?.id) {
          await registerForPushNotifications(session.user.id);
        }
        // Move to notification setup step
        setStep('notification-setup');
      } else {
        Alert.alert(
          'Notifications Disabled',
          'You can enable notifications later in Settings to receive reminders and updates.',
          [{ text: 'OK', onPress: () => {
            // Skip to completion even if permission denied
            handleCompleteOnboarding();
          }}]
        );
      }
    } catch (error: any) {
      console.error('Error requesting notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSkipNotifications = () => {
    // Skip notification setup and complete onboarding
    handleCompleteOnboarding();
  };

  const handleReminderTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    
    if (selectedDate && timePickerIndex >= 0) {
      const newTimes = [...reminderTimes];
      newTimes[timePickerIndex] = selectedDate;
      setReminderTimes(newTimes);
    }
  };

  const handlePrayerReminderTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPrayerTimePicker(false);
    }
    
    if (selectedDate) {
      setPrayerReminderTime(selectedDate);
    }
  };

  const handleCompleteOnboarding = async () => {
    setLoading(true);
    try {
      // Save notification preferences
      const updates: any = {
        devotional_reminders: true,
        devotional_reminder_count: reminderCount,
        smart_notifications_enabled: smartNotificationsEnabled,
        prayer_reminder_enabled: prayerReminderEnabled,
        prayer_reminder_hour: prayerReminderTime.getHours(),
        prayer_reminder_minute: prayerReminderTime.getMinutes(),
      };

      // Save reminder times
      for (let i = 0; i < reminderCount; i++) {
        updates[`devotional_reminder_time_${i + 1}_hour`] = reminderTimes[i].getHours();
        updates[`devotional_reminder_time_${i + 1}_minute`] = reminderTimes[i].getMinutes();
      }

      await updatePreferences(updates);
      
      // Onboarding complete - app will navigate automatically
    } catch (error: any) {
      console.error('Error saving preferences:', error);
      // Continue anyway
    } finally {
      setLoading(false);
    }
  };

  const renderChoice = () => (
    <View style={styles.choiceContainer}>
      <View style={styles.header}>
        <View style={[styles.logoContainer, { backgroundColor: colors.primary }]}>
          <MaterialCommunityIcons name="sprout" size={48} color="#FFFFFF" />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Welcome to Rooted</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Stay grounded in faith. Grow together in community.
        </Text>
      </View>

      <View style={styles.options}>
        <Card 
          style={styles.optionCard} 
          onPress={() => setStep('create')}
        >
          <View style={[styles.optionIconContainer, { backgroundColor: colors.accent + '40' }]}>
            <Ionicons name="sparkles" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.optionTitle, { color: colors.text }]}>
            Create a Group
          </Text>
          <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
            Start a new small group and invite others to join
          </Text>
        </Card>

        <Card 
          style={styles.optionCard} 
          onPress={() => setStep('join')}
        >
          <View style={[styles.optionIconContainer, { backgroundColor: colors.accent + '40' }]}>
            <MaterialCommunityIcons name="handshake" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.optionTitle, { color: colors.text }]}>
            Join a Group
          </Text>
          <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
            Enter an invite code to join an existing group
          </Text>
        </Card>
      </View>
    </View>
  );

  const renderCreateGroup = () => (
    <View style={styles.formContainer}>
      <View style={styles.formHeader}>
        <View style={[styles.formIconContainer, { backgroundColor: colors.accent + '40' }]}>
          <Ionicons name="sparkles" size={32} color={colors.primary} />
        </View>
        <Text style={[styles.formTitle, { color: colors.text }]}>
          Create Your Group
        </Text>
        <Text style={[styles.formSubtitle, { color: colors.textSecondary }]}>
          Give your small group a name to get started
        </Text>
      </View>

      <View style={styles.form}>
        <Input
          label="Group Name"
          placeholder="e.g., Bible Buddies"
          value={groupName}
          onChangeText={setGroupName}
          autoCapitalize="words"
        />

        <Input
          label="Description (optional)"
          placeholder="What is your group about?"
          value={groupDescription}
          onChangeText={setGroupDescription}
          multiline
          numberOfLines={3}
          containerStyle={{ marginBottom: 24 }}
        />

        <Button
          title="Create Group"
          onPress={handleCreateGroup}
          loading={loading}
          fullWidth
        />

        <Button
          title="Back"
          variant="ghost"
          onPress={() => setStep('choice')}
          style={styles.backButton}
        />
      </View>
    </View>
  );

  const renderJoinGroup = () => (
    <View style={styles.formContainer}>
      <View style={styles.formHeader}>
        <View style={[styles.formIconContainer, { backgroundColor: colors.accent + '40' }]}>
          <MaterialCommunityIcons name="handshake" size={32} color={colors.primary} />
        </View>
        <Text style={[styles.formTitle, { color: colors.text }]}>
          Join a Group
        </Text>
        <Text style={[styles.formSubtitle, { color: colors.textSecondary }]}>
          Enter the 6-character invite code shared by your group leader
        </Text>
      </View>

      <View style={styles.form}>
        <Input
          label="Invite Code"
          placeholder="Enter 6-character code"
          value={inviteCode}
          onChangeText={(text) => setInviteCode(text.toUpperCase())}
          autoCapitalize="characters"
          maxLength={6}
          containerStyle={{ marginBottom: 24 }}
        />

        <Button
          title="Join Group"
          onPress={handleJoinGroup}
          loading={loading}
          fullWidth
        />

        <Button
          title="Back"
          variant="ghost"
          onPress={() => setStep('choice')}
          style={styles.backButton}
        />
      </View>
    </View>
  );

  const renderNotifications = () => (
    <View style={styles.formContainer}>
      <View style={styles.formHeader}>
        <View style={[styles.formIconContainer, { backgroundColor: colors.accent + '40' }]}>
          <Ionicons name="notifications" size={32} color={colors.primary} />
        </View>
        <Text style={[styles.formTitle, { color: colors.text }]}>
          Stay Connected
        </Text>
        <Text style={[styles.formSubtitle, { color: colors.textSecondary }]}>
          Enable notifications to receive daily devotional reminders, prayer updates, and event alerts from your group.
        </Text>
      </View>

      <View style={styles.form}>
        <Card style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.infoRow}>
            <Ionicons name="book-outline" size={20} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Daily devotional reminders
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="hands-pray" size={20} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Prayer request updates
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Event reminders and alerts
            </Text>
          </View>
        </Card>

        <Button
          title="Enable Notifications"
          onPress={handleRequestNotifications}
          loading={loading}
          fullWidth
          style={{ marginTop: 24 }}
        />

        <Button
          title="Maybe Later"
          variant="ghost"
          onPress={handleSkipNotifications}
          style={styles.backButton}
        />
      </View>
    </View>
  );

  const renderNotificationSetup = () => (
    <View style={styles.formContainer}>
      <View style={styles.formHeader}>
        <View style={[styles.formIconContainer, { backgroundColor: colors.accent + '40' }]}>
          <Ionicons name="settings-outline" size={32} color={colors.primary} />
        </View>
        <Text style={[styles.formTitle, { color: colors.text }]}>
          Customize Notifications
        </Text>
        <Text style={[styles.formSubtitle, { color: colors.textSecondary }]}>
          Set up your notification preferences to stay connected with your group.
        </Text>
      </View>

      <View style={styles.form}>
        <Card style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>
              Number of Devotional Reminders
            </Text>
            <View style={styles.countSelector}>
              {[1, 2, 3].map((count) => (
                <TouchableOpacity
                  key={count}
                  style={[
                    styles.countButton,
                    reminderCount === count && { backgroundColor: isDark ? '#3D5A50' : colors.primary },
                    reminderCount !== count && { backgroundColor: colors.cardBorder },
                  ]}
                  onPress={() => setReminderCount(count)}
                >
                  <Text
                    style={[
                      styles.countButtonText,
                      { color: reminderCount === count ? '#FFFFFF' : colors.text },
                    ]}
                  >
                    {count}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {[1, 2, 3].slice(0, reminderCount).map((index) => (
            <View key={index} style={styles.infoRow}>
              <TouchableOpacity
                style={styles.timeRow}
                onPress={() => {
                  setTimePickerIndex(index - 1);
                  setShowTimePicker(true);
                }}
              >
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                  Reminder {index}: {format(reminderTimes[index - 1], 'h:mm a')}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          ))}

          <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>
              Prayer Reminders
            </Text>
            <Switch
              value={prayerReminderEnabled}
              onValueChange={setPrayerReminderEnabled}
              trackColor={{ false: colors.cardBorder, true: isDark ? '#3D5A50' : colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          {prayerReminderEnabled && (
            <View style={styles.infoRow}>
              <TouchableOpacity
                style={styles.timeRow}
                onPress={() => setShowPrayerTimePicker(true)}
              >
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                  Time: {format(prayerReminderTime, 'h:mm a')}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          )}

          <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>
              Smart Notifications
            </Text>
            <Switch
              value={smartNotificationsEnabled}
              onValueChange={setSmartNotificationsEnabled}
              trackColor={{ false: colors.cardBorder, true: isDark ? '#3D5A50' : colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
          <View style={[styles.smartNotificationInfo, { paddingTop: 4, paddingHorizontal: 4 }]}>
            <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} style={{ marginRight: 6 }} />
            <Text style={[styles.smartNotificationText, { color: colors.textMuted }]}>
              Get follow-up reminders if you haven't completed today's devotional, and gentle reminders if you haven't posted in a few days
            </Text>
          </View>
        </Card>

        <Button
          title="Finish Setup"
          onPress={handleCompleteOnboarding}
          loading={loading}
          fullWidth
          style={{ marginTop: 24 }}
        />

        <Button
          title="Skip"
          variant="ghost"
          onPress={handleCompleteOnboarding}
          style={styles.backButton}
        />
      </View>

      {/* Time Pickers */}
      {showTimePicker && (
        <Modal
          visible={showTimePicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowTimePicker(false)}
        >
          <View style={styles.timePickerOverlay}>
            <View style={[styles.timePickerContainer, { backgroundColor: colors.card }]}>
              <View style={[styles.timePickerHeader, { borderBottomColor: colors.cardBorder }]}>
                <Text style={[styles.timePickerTitle, { color: colors.text }]}>
                  Reminder {timePickerIndex + 1} Time
                </Text>
                <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={reminderTimes[timePickerIndex]}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleReminderTimeChange}
                textColor={colors.text}
                themeVariant={isDark ? 'dark' : 'light'}
              />
              {Platform.OS === 'ios' && (
                <View style={[styles.timePickerFooter, { borderTopColor: colors.cardBorder }]}>
                  <Button
                    title="Done"
                    onPress={() => setShowTimePicker(false)}
                    fullWidth
                  />
                </View>
              )}
            </View>
          </View>
        </Modal>
      )}

      {showPrayerTimePicker && (
        <Modal
          visible={showPrayerTimePicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowPrayerTimePicker(false)}
        >
          <View style={styles.timePickerOverlay}>
            <View style={[styles.timePickerContainer, { backgroundColor: colors.card }]}>
              <View style={[styles.timePickerHeader, { borderBottomColor: colors.cardBorder }]}>
                <Text style={[styles.timePickerTitle, { color: colors.text }]}>
                  Prayer Reminder Time
                </Text>
                <TouchableOpacity onPress={() => setShowPrayerTimePicker(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={prayerReminderTime}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handlePrayerReminderTimeChange}
                textColor={colors.text}
                themeVariant={isDark ? 'dark' : 'light'}
              />
              {Platform.OS === 'ios' && (
                <View style={[styles.timePickerFooter, { borderTopColor: colors.cardBorder }]}>
                  <Button
                    title="Done"
                    onPress={() => setShowPrayerTimePicker(false)}
                    fullWidth
                  />
                </View>
              )}
            </View>
          </View>
        </Modal>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {step === 'choice' && renderChoice()}
          {step === 'create' && renderCreateGroup()}
          {step === 'join' && renderJoinGroup()}
          {step === 'notifications' && renderNotifications()}
          {step === 'notification-setup' && renderNotificationSetup()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  choiceContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  options: {
    gap: 16,
  },
  optionCard: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  optionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  optionDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  formHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  formIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  form: {
    marginTop: 8,
  },
  backButton: {
    marginTop: 12,
  },
  infoCard: {
    padding: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  infoText: {
    fontSize: 14,
    flex: 1,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  settingLabel: {
    fontSize: 14,
    flex: 1,
  },
  countSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  countButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  hintText: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  smartNotificationInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 0,
  },
  smartNotificationText: {
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  timePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timePickerContainer: {
    width: Platform.OS === 'ios' ? 320 : '90%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  timePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  timePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  timePickerFooter: {
    padding: 16,
    borderTopWidth: 1,
  },
});
