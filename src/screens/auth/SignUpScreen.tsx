import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { Input, Button } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { validatePassword, validateEmail, validateFullName, sanitizeInput, sanitizeEmail } from '../../lib/validation';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

export const SignUpScreen: React.FC<Props> = ({ navigation }) => {
  const { colors } = useTheme();
  const { signUp } = useAuth();
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSignUp = async () => {
    // Sanitize inputs
    const trimmedFullName = sanitizeInput(fullName);
    const trimmedEmail = sanitizeEmail(email);
    const trimmedPassword = sanitizeInput(password);
    const trimmedConfirmPassword = sanitizeInput(confirmPassword);

    // Validate full name
    const nameValidation = validateFullName(trimmedFullName);
    if (!nameValidation.valid) {
      Alert.alert('Error', nameValidation.error);
      return;
    }

    // Validate email
    const emailValidation = validateEmail(trimmedEmail);
    if (!emailValidation.valid) {
      Alert.alert('Error', emailValidation.error);
      return;
    }

    // Validate password
    const passwordValidation = validatePassword(trimmedPassword);
    if (!passwordValidation.valid) {
      Alert.alert('Error', passwordValidation.error);
      return;
    }

    // Check password confirmation
    if (trimmedPassword !== trimmedConfirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await signUp(trimmedEmail, trimmedPassword, trimmedFullName);
      Alert.alert(
        'Success',
        'Account created! Please check your email to verify your account.',
        [{ text: 'OK', onPress: () => navigation.navigate('SignIn') }]
      );
    } catch (error: any) {
      // Handle rate limit errors with special messaging
      if (error.code === 'RATE_LIMIT_EXCEEDED') {
        Alert.alert(
          'Too Many Attempts',
          error.message || 'Please wait before trying again.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', error.message || 'Failed to create account');
      }
    } finally {
      setLoading(false);
    }
  };

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
          <View style={styles.header}>
            <View style={[styles.logoContainer, { backgroundColor: colors.primary }]}>
              <MaterialCommunityIcons name="sprout" size={40} color="#FFFFFF" />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Join your community and grow in faith
            </Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Full Name"
              placeholder="Enter your full name"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
            />

            <Input
              label="Email"
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Input
              label="Password"
              placeholder="Create a password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              rightIcon={
                <Ionicons 
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'} 
                  size={20} 
                  color={colors.textSecondary} 
                />
              }
              onRightIconPress={() => setShowPassword(!showPassword)}
            />

            <Input
              label="Confirm Password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
            />

            <Button
              title="Create Account"
              onPress={handleSignUp}
              loading={loading}
              fullWidth
              style={styles.button}
            />
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              Already have an account?
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
              <Text style={[styles.link, { color: colors.primary }]}>
                {' '}Sign In
              </Text>
            </TouchableOpacity>
          </View>
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
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  form: {
    marginBottom: 24,
  },
  button: {
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
  },
  link: {
    fontSize: 14,
    fontWeight: '600',
  },
});
