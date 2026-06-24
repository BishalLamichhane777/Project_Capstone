import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API } from '../api';
import { useAuth } from '../context/AuthContext';
import {
  User, ClipboardList, Shield,
  GraduationCap, Mail, Eye, EyeOff,
  BookOpen,
} from 'lucide-react-native';

const BLUE = '#2952e3';
const TEACHER_COLOR = '#1a8a5a';
const ADMIN_COLOR = '#b07d00';

const ROLES = [
  { key: 'Student', icon: User,          label: 'Student' },
  { key: 'Teacher', icon: ClipboardList, label: 'Teacher' },
  { key: 'Admin',   icon: Shield,        label: 'Admin'   },
];

const ROLE_CONFIG = {
  Student: {
    bannerIcon: BookOpen,
    banner: 'Logging in as Student — access your attendance and waivers',
    bannerBg: '#eef2ff',
    bannerText: '#3b5bdb',
    buttonBg: BLUE,
    buttonShadow: BLUE,
    buttonLabel: 'Login as Student',
    navigate: 'Home',
  },
  Teacher: {
    bannerIcon: ClipboardList,
    banner: 'Logging in as Teacher — manage classes and take attendance',
    bannerBg: '#e8f8f1',
    bannerText: '#1a8a5a',
    buttonBg: TEACHER_COLOR,
    buttonShadow: TEACHER_COLOR,
    buttonLabel: 'Login as Teacher',
    navigate: 'TeacherDashboard',
  },
  Admin: {
    bannerIcon: Shield,
    banner: 'Logging in as Admin — access the management dashboard',
    bannerBg: '#fff8e6',
    bannerText: ADMIN_COLOR,
    buttonBg: ADMIN_COLOR,
    buttonShadow: ADMIN_COLOR,
    buttonLabel: 'Login as Admin',
    navigate: 'AdminDashboard',
  },
};

export default function LoginScreen({ navigation }) {
  const { loginState } = useAuth();
  const [role, setRole] = useState('Student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const config = ROLE_CONFIG[role];

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(API.login, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password: password,
        }),
      });

      const data = await response.json();
      setLoading(false);

      if (response.ok) {
        // Validate role matches the selected role
        const backendRole = (data.role || '').toLowerCase();
        const selectedRole = role.toLowerCase();

        if (backendRole !== selectedRole) {
          Alert.alert(
            'Unauthorized Role',
            `You are registered as ${data.role}, but you are trying to log in as ${role}. Please select the correct role option.`
          );
          return;
        }

        // Save token and basic user info in context
        loginState(data.token, {
          id: data.user_id,
          fullname: data.fullname,
          role: data.role,
          email: email.trim().toLowerCase(),
        });

        // Navigate to appropriate screen
        navigation.navigate(config.navigate);
      } else {
        Alert.alert('Login Failed', data.error || 'Invalid credentials');
      }
    } catch (error) {
      setLoading(false);
      Alert.alert(
        'Connection Error',
        'Unable to connect to the backend server. Please verify the server is running and your device is on the same network.'
      );
      console.error('Login error:', error);
    }
  };

  const handleForgotPassword = () => {
    console.log('Forgot Password pressed');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f7fa" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>

            {/* Icon */}
            <View style={styles.iconContainer}>
              <GraduationCap size={28} color={BLUE} />
            </View>

            {/* Title */}
            <Text style={styles.title}>Attendance Portal</Text>
            <Text style={styles.subtitle}>Secure access for students and faculty.</Text>

            {/* Role Toggle — 3 options */}
            <View style={styles.toggleContainer}>
              {ROLES.map(({ key, icon: RoleIcon, label }) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.toggleButton, role === key && styles.toggleActive]}
                  onPress={() => setRole(key)}
                >
                  <RoleIcon
                    size={18}
                    color={role === key ? '#1a1f36' : '#8a94a6'}
                  />
                  <Text style={[styles.toggleText, role === key && styles.toggleTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Role Info Banner */}
            <View style={[styles.roleBanner, { backgroundColor: config.bannerBg }]}>
              <config.bannerIcon size={14} color={config.bannerText} style={{ marginRight: 6 }} />
              <Text style={[styles.roleBannerText, { color: config.bannerText }]}>
                {config.banner}
              </Text>
            </View>

            {/* Email Input */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Email Address"
                placeholderTextColor="#aab0be"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Mail size={18} color="#aab0be" style={styles.inputIcon} />
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#aab0be"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                {showPassword
                  ? <Eye    size={18} color="#aab0be" />
                  : <EyeOff size={18} color="#aab0be" />
                }
              </TouchableOpacity>
            </View>

            {/* Forgot Password */}
            <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotContainer}>
              <Text style={[styles.forgotText, { color: config.buttonBg }]}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              style={[
                styles.loginButton,
                { backgroundColor: config.buttonBg, shadowColor: config.buttonShadow },
              ]}
              onPress={handleLogin}
              activeOpacity={0.85}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.loginButtonText}>{config.buttonLabel}</Text>
              )}
            </TouchableOpacity>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 28,
    paddingVertical: 36,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
  },

  // Icon
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#eef1ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },

  // Title
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1f36',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#8a94a6',
    marginBottom: 22,
    textAlign: 'center',
  },

  // Toggle — 3 buttons
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#f0f2f8',
    borderRadius: 14,
    padding: 4,
    width: '100%',
    marginBottom: 14,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 11,
    gap: 3,
  },
  toggleActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  toggleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8a94a6',
  },
  toggleTextActive: {
    color: '#1a1f36',
    fontWeight: '700',
  },

  // Role Banner
  roleBanner: {
    width: '100%',
    borderRadius: 10,
    padding: 10,
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleBannerText: {
    fontSize: 12,
    lineHeight: 18,
    flexShrink: 1,
  },

  // Inputs
  inputContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e6e9f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 14,
    backgroundColor: '#fafbfc',
    height: 52,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#1a1f36',
    height: '100%',
  },
  inputIcon: { marginLeft: 8 },
  eyeButton: { padding: 4 },

  // Forgot
  forgotContainer: {
    alignSelf: 'flex-end',
    marginBottom: 20,
    marginTop: -4,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Login Button
  loginButton: {
    width: '100%',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

});