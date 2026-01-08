import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { Input, Button, Card } from '../../components';
import { useAppStore } from '../../store/useAppStore';
import { requestNotificationPermissions, registerForPushNotifications } from '../../lib/notifications';

type OnboardingStep = 'choice' | 'create' | 'join' | 'notifications';

export const OnboardingScreen: React.FC = () => {
  const { colors } = useTheme();
  const { createGroup, joinGroup, fetchGroupMembers } = useAppStore();
  
  const [step, setStep] = useState<OnboardingStep>('choice');
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);

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
        // User granted permission, onboarding is complete
        // The app will automatically navigate to MainNavigator since currentGroup is now set
      } else {
        Alert.alert(
          'Notifications Disabled',
          'You can enable notifications later in Settings to receive reminders and updates.',
          [{ text: 'OK' }]
        );
        // Still continue even if permission denied
      }
    } catch (error: any) {
      console.error('Error requesting notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSkipNotifications = () => {
    // User can skip, they can enable later in settings
    // The app will automatically navigate to MainNavigator since currentGroup is now set
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
});
