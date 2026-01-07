import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Share
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { Card, Avatar, Button, Header } from '../../components';
import { useAppStore } from '../../store/useAppStore';
import { useAuth } from '../../context/AuthContext';

export const SettingsScreen: React.FC = () => {
  const { colors, isDark, toggleTheme } = useTheme();
  const navigation = useNavigation<any>();
  const { profile, currentGroup, preferences, updatePreferences, signOut } = useAppStore();
  
  const [prayerNotifications, setPrayerNotifications] = useState(preferences?.prayer_notifications ?? true);
  const [devotionalReminders, setDevotionalReminders] = useState(preferences?.devotional_reminders ?? true);
  const [eventAlerts, setEventAlerts] = useState(preferences?.event_alerts ?? true);

  const handleTogglePrayerNotifications = async (value: boolean) => {
    setPrayerNotifications(value);
    await updatePreferences({ prayer_notifications: value });
  };

  const handleToggleDevotionalReminders = async (value: boolean) => {
    setDevotionalReminders(value);
    await updatePreferences({ devotional_reminders: value });
  };

  const handleToggleEventAlerts = async (value: boolean) => {
    setEventAlerts(value);
    await updatePreferences({ event_alerts: value });
  };

  const handleShareInviteCode = async () => {
    if (!currentGroup?.invite_code) return;
    
    try {
      await Share.share({
        message: `Join my Rooted small group "${currentGroup.name}"!\n\nUse invite code: ${currentGroup.invite_code}\n\nDownload Rooted to get started.`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: signOut 
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            Alert.alert('Contact Support', 'Please email support@rooted.app to request account deletion.');
          }
        },
      ]
    );
  };

  const SettingRow = ({ 
    label, 
    value, 
    onPress,
    showArrow = true 
  }: { 
    label: string; 
    value?: string; 
    onPress?: () => void;
    showArrow?: boolean;
  }) => (
    <TouchableOpacity 
      style={styles.settingRow} 
      onPress={onPress}
      disabled={!onPress}
    >
      <Text style={[styles.settingLabel, { color: colors.text }]}>{label}</Text>
      <View style={styles.settingRight}>
        {value && (
          <Text style={[styles.settingValue, { color: colors.textSecondary }]}>{value}</Text>
        )}
        {showArrow && onPress && (
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        )}
      </View>
    </TouchableOpacity>
  );

  const SettingToggle = ({ 
    label, 
    value, 
    onValueChange 
  }: { 
    label: string; 
    value: boolean; 
    onValueChange: (value: boolean) => void;
  }) => (
    <View style={styles.settingRow}>
      <Text style={[styles.settingLabel, { color: colors.text }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.cardBorder, true: colors.primary }}
        thumbColor="#FFFFFF"
      />
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButtonContainer}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
          <Text style={[styles.backButton, { color: colors.primary }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Profile Section */}
        <Card style={styles.profileCard}>
          <View style={styles.profileContent}>
            <Avatar name={profile?.full_name} size={60} />
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: colors.text }]}>
                {profile?.full_name || 'User'}
              </Text>
              <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>
                {profile?.email}
              </Text>
            </View>
          </View>
        </Card>

        {/* Group Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>MY GROUP</Text>
          <Card>
            <SettingRow 
              label="Group Name" 
              value={currentGroup?.name || 'Bible Buddies'} 
              showArrow={false}
            />
            <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />
            <TouchableOpacity style={styles.settingRow} onPress={handleShareInviteCode}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Invite Code</Text>
              <View style={styles.settingRight}>
                <View style={[styles.inviteCodeBadge, { backgroundColor: colors.accent }]}>
                  <Text style={styles.inviteCodeText}>{currentGroup?.invite_code || '------'}</Text>
                </View>
                <Text style={[styles.shareText, { color: colors.primary }]}>Share</Text>
              </View>
            </TouchableOpacity>
          </Card>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>NOTIFICATIONS</Text>
          <Card>
            <SettingToggle 
              label="Prayer Updates" 
              value={prayerNotifications}
              onValueChange={handleTogglePrayerNotifications}
            />
            <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />
            <SettingToggle 
              label="Devotional Reminders" 
              value={devotionalReminders}
              onValueChange={handleToggleDevotionalReminders}
            />
            <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />
            <SettingToggle 
              label="Event Alerts" 
              value={eventAlerts}
              onValueChange={handleToggleEventAlerts}
            />
          </Card>
        </View>

        {/* Appearance Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>APPEARANCE</Text>
          <Card>
            <SettingToggle 
              label="Dark Mode" 
              value={isDark}
              onValueChange={toggleTheme}
            />
          </Card>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>SUPPORT</Text>
          <Card>
            <SettingRow 
              label="Contact Us" 
              onPress={() => Alert.alert('Contact', 'Email us at support@rooted.app')}
            />
            <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />
            <SettingRow 
              label="Terms of Service" 
              onPress={() => Alert.alert('Terms', 'Terms of Service would open here.')}
            />
            <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />
            <SettingRow 
              label="Privacy Policy" 
              onPress={() => Alert.alert('Privacy', 'Privacy Policy would open here.')}
            />
          </Card>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>ACCOUNT</Text>
          <Card>
            <TouchableOpacity style={styles.settingRow} onPress={handleSignOut}>
              <Text style={[styles.settingLabel, { color: colors.error }]}>Sign Out</Text>
            </TouchableOpacity>
            <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />
            <TouchableOpacity style={styles.settingRow} onPress={handleDeleteAccount}>
              <Text style={[styles.settingLabel, { color: colors.error }]}>Delete Account</Text>
            </TouchableOpacity>
          </Card>
        </View>

        {/* Version */}
        <Text style={[styles.version, { color: colors.textMuted }]}>
          Rooted v1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  backButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    fontSize: 16,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  profileCard: {
    marginBottom: 24,
  },
  profileContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
  },
  profileEmail: {
    fontSize: 14,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    paddingHorizontal: 4,
    letterSpacing: 0.5,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  settingLabel: {
    fontSize: 16,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValue: {
    fontSize: 15,
    marginRight: 8,
  },
  arrow: {
    fontSize: 16,
  },
  divider: {
    height: 1,
    marginHorizontal: -16,
  },
  inviteCodeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 12,
  },
  inviteCodeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2B2B2B',
    letterSpacing: 1,
  },
  shareText: {
    fontSize: 14,
    fontWeight: '600',
  },
  version: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
});

