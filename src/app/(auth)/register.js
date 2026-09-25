import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { supabase } from "../../services/supabaseClient";

export default function RegisterScreen() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // วัน/เดือน/ปีเกิด
  const [birthDate, setBirthDate] = useState(new Date(2000, 0, 1));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const calculateAge = (dob) => {
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return Math.max(1, age);
  };

  const handleRegister = async () => {
    if (
      !username.trim() ||
      !email.trim() ||
      !password.trim() ||
      !confirmPassword.trim()
    ) {
      Alert.alert("แจ้งเตือน", "กรุณากรอกข้อมูลให้ครบทุกช่อง");
      return;
    }

    if (password.length < 6) {
      Alert.alert("แจ้งเตือน", "รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(
        "รหัสผ่านไม่ตรงกัน",
        "กรุณาพิมพ์รหัสผ่านและยืนยันรหัสผ่านให้ตรงกัน",
      );
      return;
    }

    setLoading(true);
    try {
      // 1. เช็คว่ามีชื่อ Username นี้ซ้ำในระบบหรือยัง
      const { data: existingUser } = await supabase
        .from("profiles")
        .select("id")
        .ilike("username", username.trim())
        .maybeSingle();

      if (existingUser) {
        throw new Error(
          "ชื่อผู้ใช้นี้ (Username) มีคนใช้งานแล้ว กรุณาใช้ชื่ออื่น",
        );
      }

      // 2. สมัครสมาชิกกับ Supabase Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp(
        {
          email: email.trim(),
          password: password,
          options: {
            data: {
              username: username.trim(),
            },
          },
        },
      );

      if (signUpError) throw signUpError;

      // 3. บันทึกข้อมูลลงตาราง profiles (ส่งค่า email และเซ็ต gaym_coins เริ่มต้นที่ 0)
      if (authData?.user) {
        const userAge = calculateAge(birthDate);
        const { error: profileError } = await supabase.from("profiles").upsert({
          id: authData.user.id,
          email: email.trim(), // ✅ ส่งค่า email เพื่อป้องกันข้อผิดพลาด not-null constraint
          username: username.trim(),
          age: userAge,
          level: 1,
          gaym_coins: 0,
        });

        if (profileError) {
          console.log("Profile upsert note:", profileError.message);
        }
      }

      Alert.alert("สมัครสมาชิกสำเร็จ!", "ยินดีต้อนรับเข้าสู่ GAYM Store", [
        {
          text: "เข้าสู่ระบบ",
          onPress: () => router.replace("/(tabs)"),
        },
      ]);
    } catch (error) {
      Alert.alert("เกิดข้อผิดพลาด", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>เข้าร่วมชุมชนเกมเมอร์ GAYM Store</Text>

        {/* Username */}
        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          placeholder="ตั้งชื่อผู้ใช้ของคุณ..."
          placeholderTextColor="#6b7280"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />

        {/* Email */}
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="example@email.com"
          placeholderTextColor="#6b7280"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        {/* Password */}
        <Text style={styles.label}>Password</Text>
        <View style={styles.passwordWrapper}>
          <TextInput
            style={styles.passwordInput}
            placeholder="รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)"
            placeholderTextColor="#6b7280"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeBtn}
          >
            <Ionicons
              name={showPassword ? "eye-off-outline" : "eye-outline"}
              size={22}
              color="#9ca3af"
            />
          </TouchableOpacity>
        </View>

        {/* Confirm Password */}
        <Text style={styles.label}>
          Confirm Password (ยืนยันรหัสผ่านอีกครั้ง)
        </Text>
        <View
          style={[
            styles.passwordWrapper,
            confirmPassword.length > 0 &&
              password !== confirmPassword && { borderColor: "#ef4444" },
          ]}
        >
          <TextInput
            style={styles.passwordInput}
            placeholder="พิมพ์รหัสผ่านอีกครั้งเพื่อยืนยัน"
            placeholderTextColor="#6b7280"
            secureTextEntry={!showConfirmPassword}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          <TouchableOpacity
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            style={styles.eyeBtn}
          >
            <Ionicons
              name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
              size={22}
              color="#9ca3af"
            />
          </TouchableOpacity>
        </View>
        {confirmPassword.length > 0 && password !== confirmPassword && (
          <Text style={styles.errorHint}>
            * รหัสผ่านทั้งสองช่องยังไม่ตรงกัน
          </Text>
        )}

        {/* วัน/เดือน/ปีเกิด */}
        <Text style={styles.label}>วัน/เดือน/ปีเกิด</Text>
        <TouchableOpacity
          style={styles.dateBox}
          onPress={() => setShowDatePicker(true)}
        >
          <Ionicons name="calendar-outline" size={20} color="#9ca3af" />
          <Text style={styles.dateText}>
            {birthDate.toLocaleDateString("th-TH", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={birthDate}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            maximumDate={new Date()}
            onValueChange={(event, selectedDate) => {
              if (selectedDate) setBirthDate(selectedDate);
            }}
            onDismiss={() => setShowDatePicker(false)}
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) setBirthDate(selectedDate);
            }}
          />
        )}

        {/* ปุ่ม REGISTER */}
        <TouchableOpacity
          style={[styles.registerBtn, loading && { opacity: 0.6 }]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.registerBtnText}>REGISTER</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a1a" },
  scrollContent: { padding: 24, paddingBottom: 50 },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#1a1a2e",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: { color: "#fff", fontSize: 30, fontWeight: "bold" },
  subtitle: { color: "#9ca3af", fontSize: 15, marginTop: 6, marginBottom: 28 },
  label: { color: "#9ca3af", fontSize: 14, fontWeight: "600", marginBottom: 8 },
  input: {
    backgroundColor: "#121224",
    color: "#fff",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1f1f3a",
    fontSize: 15,
    marginBottom: 18,
  },
  passwordWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#121224",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1f1f3a",
    marginBottom: 18,
  },
  passwordInput: {
    flex: 1,
    color: "#fff",
    padding: 16,
    fontSize: 15,
  },
  eyeBtn: { paddingHorizontal: 14 },
  errorHint: {
    color: "#ef4444",
    fontSize: 12,
    marginTop: -12,
    marginBottom: 14,
  },
  dateBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#121224",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1f1f3a",
    gap: 10,
    marginBottom: 28,
  },
  dateText: { color: "#e5e7eb", fontSize: 15 },
  registerBtn: {
    backgroundColor: "#0000b3",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  registerBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 1,
  },
});
