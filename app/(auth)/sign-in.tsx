import { useState, useRef, useEffect } from 'react';
import {
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
  Text as RNText,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/supabase/client';
import { toast } from '@/components/Toast';
import { useTheme } from '@/features/theme/ThemeContext';

type Mode = 'signin' | 'signup';

type InputFieldProps = {
  icon: string;
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
};

function InputField({ icon, placeholder, value, onChangeText, secureTextEntry, keyboardType }: InputFieldProps) {
  const C = useTheme();
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const lineAnim = useRef(new Animated.Value(0)).current;
  const isPassword = secureTextEntry === true;

  useEffect(() => {
    Animated.timing(lineAnim, { toValue: focused ? 1 : 0, duration: 200, useNativeDriver: false }).start();
  }, [focused]);

  const lineColor = lineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [C.border, C.accent],
  });

  return (
    <View style={{ marginBottom: 26 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingBottom: 12 }}>
        <Ionicons
          name={icon as any}
          size={18}
          color={focused ? C.accent : C.muted}
          style={{ marginRight: 14, width: 22 }}
        />
        <TextInput
          style={{
            flex: 1,
            fontSize: 15,
            fontFamily: 'SpaceGrotesk_400Regular',
            color: C.text,
            padding: 0,
          }}
          placeholder={placeholder}
          placeholderTextColor={C.muted}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={isPassword && !visible}
          keyboardType={keyboardType ?? 'default'}
          autoCapitalize="none"
          autoCorrect={false}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {isPassword && (
          <Pressable onPress={() => setVisible(v => !v)} hitSlop={10}>
            <Ionicons
              name={visible ? 'eye-outline' : 'eye-off-outline'}
              size={18}
              color={C.muted}
            />
          </Pressable>
        )}
      </View>
      <Animated.View style={{ height: 1.5, backgroundColor: lineColor }} />
    </View>
  );
}

export default function AuthScreen() {
  const C = useTheme();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<Mode>('signin');
  const [displayedMode, setDisplayedMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  // Mount animation — only the form zone slides up
  const mountOpacity = useRef(new Animated.Value(0)).current;
  const mountTranslate = useRef(new Animated.Value(30)).current;

  // Mode-switch animation — scale + fade
  const formOpacity = useRef(new Animated.Value(1)).current;
  const formScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(mountOpacity, { toValue: 1, duration: 600, delay: 150, useNativeDriver: true }),
      Animated.timing(mountTranslate, { toValue: 0, duration: 500, delay: 150, useNativeDriver: true }),
    ]).start();
  }, []);

  const switchMode = (next: Mode) => {
    if (next === mode || busy) return;
    // Animate out
    Animated.parallel([
      Animated.timing(formOpacity, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(formScale, { toValue: 0.96, duration: 160, useNativeDriver: true }),
    ]).start(() => {
      setDisplayedMode(next);
      setMode(next);
      setPassword(''); // clear password on mode switch for security
      // Animate in
      Animated.parallel([
        Animated.timing(formOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(formScale, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    });
  };

  const onSubmit = async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      toast.error('Missing fields', 'Please enter your email and password.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      toast.error('Invalid email', 'Please enter a valid email address.');
      return;
    }

    if (mode === 'signup' && password.length < 8) {
      toast.warning('Password too short', 'Use at least 8 characters.');
      return;
    }
    setBusy(true);

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password });
      setBusy(false);
      // Generic message prevents revealing whether the email is registered
      if (error) toast.error('Sign in failed', 'Incorrect email or password.');
    } else {
      const { data, error } = await supabase.auth.signUp({ email: trimmedEmail, password });
      setBusy(false);
      if (error) {
        toast.error('Sign up failed', 'Could not create account. Please try again.');
        return;
      }
      if (!data.session) {
        toast.success('Check your email', 'Click the confirmation link we sent you, then sign in.');
        switchMode('signin');
      }
    }
  };

  const pwLen = password.length;
  const pwOk = pwLen >= 8;

  const ctaLabel = busy
    ? (displayedMode === 'signin' ? 'Signing in…' : 'Creating account…')
    : (displayedMode === 'signin' ? 'Sign in' : 'Get started');

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* ── RED ZONE — completely static, never re-renders ── */}
          <LinearGradient
            colors={['#5a0a0a', '#991b1b', '#dc2626']}
            locations={[0, 0.5, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={{
              paddingTop: insets.top + 44,
              paddingBottom: 64,
              alignItems: 'center',
              borderBottomLeftRadius: 44,
              borderBottomRightRadius: 44,
              overflow: 'hidden',
            }}
          >
            {/* Decorative circle — top right */}
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: -50,
                right: -50,
                width: 200,
                height: 200,
                borderRadius: 100,
                borderWidth: 1,
                borderColor: '#ffffff18',
              }}
            />
            {/* Decorative circle — bottom left */}
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                bottom: 10,
                left: -30,
                width: 120,
                height: 120,
                borderRadius: 60,
                borderWidth: 1,
                borderColor: '#ffffff12',
              }}
            />
            {/* Dot grid — bottom right */}
            <View
              pointerEvents="none"
              style={{ position: 'absolute', bottom: 30, right: 24, gap: 6 }}
            >
              {[0, 1, 2].map(row => (
                <View key={row} style={{ flexDirection: 'row', gap: 6 }}>
                  {[0, 1, 2].map(col => (
                    <View
                      key={col}
                      style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#ffffff25' }}
                    />
                  ))}
                </View>
              ))}
            </View>

            {/* Logo card */}
            <View
              style={{
                width: 90,
                height: 90,
                borderRadius: 26,
                backgroundColor: C.bg,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.5,
                shadowRadius: 20,
                elevation: 16,
              }}
            >
              <Image
                source={require('../../assets/icon.png')}
                style={{ width: 74, height: 74, borderRadius: 20 }}
              />
            </View>

            <RNText
              style={{
                fontSize: 44,
                fontFamily: 'RussoOne_400Regular',
                letterSpacing: 3,
                lineHeight: 50,
                marginBottom: 10,
              }}
            >
              <RNText style={{ color: '#ffffff' }}>Sav</RNText>
              <RNText style={{ color: '#fca5a5' }}>vo</RNText>
            </RNText>

            <View
              style={{
                borderWidth: 1,
                borderColor: '#ffffff28',
                borderRadius: 20,
                paddingHorizontal: 14,
                paddingVertical: 6,
                backgroundColor: '#ffffff0d',
              }}
            >
              <RNText
                style={{
                  fontSize: 10,
                  fontFamily: 'Exo2_300Light',
                  color: '#ffffff75',
                  letterSpacing: 2.5,
                  textTransform: 'uppercase',
                }}
              >
                Your money, your story.
              </RNText>
            </View>
          </LinearGradient>

          {/* ── FORM ZONE — mounts with slide-up, switches with scale+fade ── */}
          <Animated.View
            style={{
              paddingHorizontal: 28,
              paddingTop: 40,
              paddingBottom: insets.bottom + 32,
              opacity: mountOpacity,
              transform: [{ translateY: mountTranslate }],
            }}
          >
            <Animated.View
              style={{
                opacity: formOpacity,
                transform: [{ scale: formScale }],
              }}
            >
              {/* ── Labels ── */}
              <RNText
                style={{
                  fontSize: 11,
                  fontFamily: 'SpaceGrotesk_500Medium',
                  color: C.accent,
                  letterSpacing: 1.8,
                  textTransform: 'uppercase',
                  marginBottom: 8,
                }}
              >
                {displayedMode === 'signin' ? 'Sign in' : 'Get started'}
              </RNText>
              <RNText
                style={{
                  fontSize: 26,
                  fontFamily: 'SpaceGrotesk_700Bold',
                  color: C.text,
                  marginBottom: 8,
                }}
              >
                {displayedMode === 'signin' ? 'Welcome back' : 'Create account'}
              </RNText>
              <RNText
                style={{
                  fontSize: 13,
                  fontFamily: 'SpaceGrotesk_400Regular',
                  color: C.muted,
                  marginBottom: 36,
                }}
              >
                {displayedMode === 'signin'
                  ? 'Enter your credentials to continue'
                  : 'Start taking control of your finances'}
              </RNText>

              {/* ── Inputs ── */}
              <InputField
                icon="mail-outline"
                placeholder="Email address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
              />
              <InputField
                icon="lock-closed-outline"
                placeholder={displayedMode === 'signin' ? 'Password' : 'Password (min. 8 characters)'}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              {/* ── Password strength (sign-up only) ── */}
              {displayedMode === 'signup' && pwLen > 0 && (
                <View style={{ marginTop: -16, marginBottom: 22, marginLeft: 36 }}>
                  <View
                    style={{
                      height: 3,
                      backgroundColor: C.border,
                      borderRadius: 2,
                      marginBottom: 8,
                      overflow: 'hidden',
                    }}
                  >
                    <View
                      style={{
                        height: 3,
                        width: `${Math.min((pwLen / 8) * 100, 100)}%`,
                        backgroundColor: pwOk ? C.accent : '#7f1d1d',
                        borderRadius: 2,
                      }}
                    />
                  </View>
                  <RNText
                    style={{
                      fontSize: 12,
                      fontFamily: 'SpaceGrotesk_400Regular',
                      color: pwOk ? C.accent : C.muted,
                    }}
                  >
                    {pwOk
                      ? 'Good to go'
                      : `${8 - pwLen} more character${8 - pwLen === 1 ? '' : 's'} needed`}
                  </RNText>
                </View>
              )}

              {/* ── CTA ── */}
              <View
                style={{
                  borderRadius: 16,
                  marginTop: 8,
                  marginBottom: displayedMode === 'signup' ? 20 : 36,
                  shadowColor: C.accent,
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.45,
                  shadowRadius: 20,
                  elevation: 12,
                }}
              >
                <Pressable
                  onPress={onSubmit}
                  disabled={busy}
                  style={({ pressed }) => ({
                    borderRadius: 16,
                    overflow: 'hidden',
                    opacity: pressed || busy ? 0.82 : 1,
                  })}
                >
                  <LinearGradient
                    colors={['#ef4444', '#b91c1c']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ height: 56, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <RNText
                      style={{
                        color: '#fff',
                        fontSize: 16,
                        fontFamily: 'SpaceGrotesk_600SemiBold',
                        letterSpacing: 0.5,
                      }}
                    >
                      {ctaLabel}
                    </RNText>
                  </LinearGradient>
                </Pressable>
              </View>

              {/* ── Terms (sign-up only) ── */}
              {displayedMode === 'signup' && (
                <RNText
                  style={{
                    fontSize: 11,
                    fontFamily: 'SpaceGrotesk_400Regular',
                    color: C.muted,
                    textAlign: 'center',
                    lineHeight: 17,
                    marginBottom: 32,
                  }}
                >
                  By continuing you agree to our Terms of Service{'\n'}and Privacy Policy.
                </RNText>
              )}

              {/* ── Footer toggle ── */}
              <View
                style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }}
              >
                <RNText
                  style={{ color: C.muted, fontSize: 14, fontFamily: 'SpaceGrotesk_400Regular' }}
                >
                  {displayedMode === 'signin' ? "Don't have an account?" : 'Already have an account?'}
                </RNText>
                <Pressable
                  onPress={() => switchMode(displayedMode === 'signin' ? 'signup' : 'signin')}
                  hitSlop={8}
                >
                  <RNText
                    style={{ color: C.accent, fontSize: 14, fontFamily: 'SpaceGrotesk_600SemiBold' }}
                  >
                    {displayedMode === 'signin' ? 'Create one' : 'Sign in'}
                  </RNText>
                </Pressable>
              </View>
            </Animated.View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
