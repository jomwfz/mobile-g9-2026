import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ImageBackground, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // ฟังก์ชันจำลองการล็อกอิน
  const handleLogin = () => {
    navigation.replace('TabNavigator'); 
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container}
    >
      <ImageBackground 
        source={{ uri: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1000&q=80' }} 
        style={styles.bgImage}
        imageStyle={{ opacity: 0.4 }}
      >
        <View style={styles.overlay}>
          {/* เพิ่ม ScrollView ครอบเนื้อหาทั้งหมดเพื่อป้องกันการตกขอบ */}
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            
            {/* Logo & Header */}
            <View style={styles.headerContainer}>
              <Ionicons name="game-controller" size={60} color={COLORS.primary} />
              <Text style={styles.appName}>GAYM</Text>
              <Text style={styles.subtitle}>Welcome back, Player.</Text>
            </View>

            {/* Input Form */}
            <View style={styles.formContainer}>
              
              <View style={styles.inputBox}>
                <Ionicons name="mail-outline" size={20} color={COLORS.textDim} style={styles.inputIcon} />
                <TextInput 
                  style={styles.input}
                  placeholder="Email or Username"
                  placeholderTextColor={COLORS.textDim}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputBox}>
                <Ionicons name="lock-closed-outline" size={20} color={COLORS.textDim} style={styles.inputIcon} />
                <TextInput 
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={COLORS.textDim}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={COLORS.textDim} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.forgotPassBtn}>
                <Text style={styles.forgotPassText}>Forgot Password?</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}>
                <Text style={styles.loginBtnText}>LOGIN</Text>
              </TouchableOpacity>
            </View>

            {/* Social Login */}
            <View style={styles.socialContainer}>
              <Text style={styles.socialText}>Or continue with</Text>
              <View style={styles.socialButtons}>
                <TouchableOpacity style={styles.socialBtn}>
                  <Ionicons name="logo-google" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.socialBtn}>
                  <Ionicons name="logo-discord" size={24} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Sign Up Link */}
            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>Don't have an account? </Text>
              <TouchableOpacity>
                <Text style={styles.signupLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>

          </ScrollView>
        </View>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  bgImage: { flex: 1, justifyContent: 'flex-end' },
  overlay: { flex: 1, backgroundColor: 'rgba(21, 22, 36, 0.85)' },
  
  // ปรับ scrollContent ให้ flexGrow: 1 และใช้ padding แทนเพื่อไม่ให้ของตกขอบ
  scrollContent: { 
    flexGrow: 1, 
    justifyContent: 'center', 
    paddingHorizontal: 30, 
    paddingVertical: 50 // เว้นระยะบน-ล่างให้ ScrollView 
  }, 
  
  headerContainer: { alignItems: 'center', marginBottom: 40 },
  appName: { color: COLORS.text, fontSize: 42, fontFamily: 'Prompt_700Bold', letterSpacing: 4, marginTop: 10 },
  subtitle: { color: COLORS.textDim, fontSize: 16, fontFamily: 'Prompt_400Regular', marginTop: 5 },
  
  formContainer: { width: '100%' },
  inputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardLight, borderRadius: 16, paddingHorizontal: 15, height: 60, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: COLORS.text, fontSize: 16, fontFamily: 'Prompt_400Regular' },
  
  forgotPassBtn: { alignSelf: 'flex-end', marginBottom: 30 },
  forgotPassText: { color: COLORS.primary, fontSize: 14, fontFamily: 'Prompt_500Medium' },
  
  loginBtn: { backgroundColor: COLORS.primary, height: 60, borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 5 },
  loginBtnText: { color: COLORS.text, fontSize: 18, fontFamily: 'Prompt_700Bold', letterSpacing: 1 },
  
  socialContainer: { marginTop: 40, alignItems: 'center' },
  socialText: { color: COLORS.textDim, fontSize: 14, fontFamily: 'Prompt_400Regular', marginBottom: 15 },
  socialButtons: { flexDirection: 'row', gap: 20 },
  socialBtn: { backgroundColor: COLORS.card, width: 60, height: 60, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.cardLight },
  
  signupContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 40, paddingBottom: 20 },
  signupText: { color: COLORS.textDim, fontSize: 14, fontFamily: 'Prompt_400Regular' },
  signupLink: { color: COLORS.secondary, fontSize: 14, fontFamily: 'Prompt_700Bold' },
});