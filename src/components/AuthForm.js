import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../services/supabaseClient";
import { Ionicons } from "@expo/vector-icons";

export default function AuthForm({ type }) {
  const router = useRouter();
  const isLogin = type === "login";

  // State สำหรับข้อมูลฟอร์ม
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [birthDate, setBirthDate] = useState(""); // รูปแบบ DD/MM/YYYY

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    let isValid = true;
    let newErrors = {};

    // 1. ตรวจสอบ Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      newErrors.email = "กรุณากรอกอีเมล";
      isValid = false;
    } else if (!emailRegex.test(email)) {
      newErrors.email = "รูปแบบอีเมลไม่ถูกต้อง";
      isValid = false;
    }

    // 2. ตรวจสอบ Password
    if (!password) {
      newErrors.password = "กรุณากรอกรหัสผ่าน";
      isValid = false;
    } else if (password.length < 6) {
      newErrors.password = "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร";
      isValid = false;
    }

    // 3. ตรวจสอบข้อมูลเฉพาะหน้า Register
    if (!isLogin) {
      if (!username.trim()) {
        newErrors.username = "กรุณากรอก Username";
        isValid = false;
      } else if (username.length < 3) {
        newErrors.username = "Username ต้องมีอย่างน้อย 3 ตัวอักษร";
        isValid = false;
      }

      if (password !== confirmPassword) {
        newErrors.confirmPassword = "รหัสผ่านไม่ตรงกัน";
        isValid = false;
      }

      const dateRegex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[012])\/\d{4}$/;
      if (!birthDate.trim()) {
        newErrors.birthDate = "กรุณากรอกวันเกิด (DD/MM/YYYY)";
        isValid = false;
      } else if (!dateRegex.test(birthDate)) {
        newErrors.birthDate = "รูปแบบวันเกิดไม่ถูกต้อง เช่น 25/12/2000";
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const getThaiErrorMessage = (errorMsg) => {
    if (errorMsg.includes("Invalid login credentials"))
      return "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
    if (errorMsg.includes("User already registered"))
      return "อีเมลนี้มีผู้ใช้งานแล้ว";
    return "เกิดข้อผิดพลาด: " + errorMsg;
  };

  const handleAuth = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setErrors({ general: "" });

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.replace("/(tabs)");
      } else {
        // ส่งข้อมูลเพิ่มเติมไปเก็บใน Metadata ของระบบ Auth
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username,
              birth_date: birthDate,
            },
          },
        });
        if (error) throw error;
        Alert.alert(
          "สำเร็จ!",
          "สร้างบัญชีเรียบร้อยแล้ว คุณสามารถล็อกอินได้เลย",
        );
        router.replace("/(auth)/login");
      }
    } catch (error) {
      setErrors({ general: getThaiErrorMessage(error.message) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.formContainer}
      showsVerticalScrollIndicator={false}
    >
      {errors.general ? (
        <Text style={styles.errorGeneral}>{errors.general}</Text>
      ) : null}

      {/* ฟิลด์เฉพาะหน้า Register: Username */}
      {!isLogin && (
        <View style={styles.inputWrapper}>
          <TextInput
            style={[styles.input, errors.username && styles.inputError]}
            placeholder="Username (ชื่อผู้ใช้)"
            placeholderTextColor="#6b7280"
            value={username}
            onChangeText={(text) => {
              setUsername(text);
              setErrors({ ...errors, username: "" });
            }}
          />
          {errors.username ? (
            <Text style={styles.errorText}>{errors.username}</Text>
          ) : null}
        </View>
      )}

      {/* ฟิลด์หลัก: Email */}
      <View style={styles.inputWrapper}>
        <TextInput
          style={[styles.input, errors.email && styles.inputError]}
          placeholder="Email address"
          placeholderTextColor="#6b7280"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            setErrors({ ...errors, email: "" });
          }}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        {errors.email ? (
          <Text style={styles.errorText}>{errors.email}</Text>
        ) : null}
      </View>

      {/* ฟิลด์เฉพาะหน้า Register: Birth Date */}
      {!isLogin && (
        <View style={styles.inputWrapper}>
          <TextInput
            style={[styles.input, errors.birthDate && styles.inputError]}
            placeholder="วัน/เดือน/ปีเกิด (เช่น 25/12/2000)"
            placeholderTextColor="#6b7280"
            value={birthDate}
            onChangeText={(text) => {
              setBirthDate(text);
              setErrors({ ...errors, birthDate: "" });
            }}
            keyboardType="numeric"
            maxLength={10}
          />
          {errors.birthDate ? (
            <Text style={styles.errorText}>{errors.birthDate}</Text>
          ) : null}
        </View>
      )}

      {/* ฟิลด์หลัก: Password */}
      <View style={styles.inputWrapper}>
        <View style={styles.passwordContainer}>
          <TextInput
            style={[styles.inputPassword, errors.password && styles.inputError]}
            placeholder="Password"
            placeholderTextColor="#6b7280"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setErrors({ ...errors, password: "" });
            }}
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Ionicons
              name={showPassword ? "eye-off" : "eye"}
              size={24}
              color="#6b7280"
            />
          </TouchableOpacity>
        </View>
        {errors.password ? (
          <Text style={styles.errorText}>{errors.password}</Text>
        ) : null}
      </View>

      {/* ฟิลด์เฉพาะหน้า Register: Confirm Password */}
      {!isLogin && (
        <View style={styles.inputWrapper}>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[
                styles.inputPassword,
                errors.confirmPassword && styles.inputError,
              ]}
              placeholder="Confirm Password"
              placeholderTextColor="#6b7280"
              secureTextEntry={!showConfirmPassword}
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                setErrors({ ...errors, confirmPassword: "" });
              }}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <Ionicons
                name={showConfirmPassword ? "eye-off" : "eye"}
                size={24}
                color="#6b7280"
              />
            </TouchableOpacity>
          </View>
          {errors.confirmPassword ? (
            <Text style={styles.errorText}>{errors.confirmPassword}</Text>
          ) : null}
        </View>
      )}

      <TouchableOpacity
        style={[
          styles.actionButton,
          loading && { opacity: 0.7 },
          !isLogin && { marginTop: 20, marginBottom: 40 },
        ]}
        onPress={handleAuth}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.actionButtonText}>
            {isLogin ? "LOGIN" : "CREATE ACCOUNT"}
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  formContainer: { width: "100%", maxWidth: 400 },
  inputWrapper: { marginBottom: 15 },
  input: {
    backgroundColor: "#1a1a2e",
    color: "#ffffff",
    borderRadius: 8,
    padding: 15,
    borderWidth: 1,
    borderColor: "#2a2a4a",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a2e",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2a2a4a",
  },
  inputPassword: { flex: 1, color: "#ffffff", padding: 15 },
  eyeIcon: { padding: 15 },
  inputError: { borderColor: "#ef4444" },
  errorText: { color: "#ef4444", fontSize: 12, marginTop: 5, marginLeft: 5 },
  errorGeneral: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    color: "#ef4444",
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    textAlign: "center",
    overflow: "hidden",
  },
  actionButton: {
    backgroundColor: "#0000ff",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    shadowColor: "#0000ff",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  actionButtonText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 16,
    letterSpacing: 1,
  },
});
