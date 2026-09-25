import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Switch,
  Image,
  Modal,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import { supabase } from "../services/supabaseClient";

// ✅ ชุดคำแปล 2 ภาษา (ไทย / English)
const TRANSLATIONS = {
  th: {
    headerTitle: "ตั้งค่า (Settings)",
    accountSection: "บัญชีผู้ใช้ (Account)",
    changeUsername: "เปลี่ยนชื่อผู้ใช้ (Username)",
    currentPass: "รหัสผ่านเดิม (Current Password)",
    currentPassPlaceholder: "รหัสผ่านปัจจุบัน",
    newPass: "รหัสผ่านใหม่ (New Password)",
    newPassPlaceholder: "เว้นว่างไว้หากไม่ต้องการเปลี่ยน",
    confirmNewPass: "ยืนยันรหัสผ่านใหม่ (Confirm New Password)",
    confirmNewPassPlaceholder: "พิมพ์รหัสผ่านใหม่อีกครั้งเพื่อยืนยัน",
    saveAccountBtn: "บันทึกข้อมูลบัญชี",
    donateSection: "ระบบสนับสนุน / โดเนท (สำหรับยศ DEV)",
    donateDesc:
      "อัปโหลดรูป QR Code รับเงินจากเครื่องของคุณเพื่อให้ผู้เล่นสามารถกดโดเนทสนับสนุนได้จากหน้าโปรไฟล์",
    changeQr: "เปลี่ยนรูป QR",
    removeQr: "ลบรูป QR",
    uploadQr: "อัปโหลด QR Code รับโดเนทจากเครื่อง",
    prefSection: "การตั้งค่าแอป (Preferences)",
    darkMode: "โหมดกลางคืน (Dark Mode)",
    notifications: "การแจ้งเตือน (Notifications)",
    soundEffects: "เสียงเอฟเฟกต์ (Sound Effects)",
    othersSection: "อื่นๆ (Others)",
    languageLabel: "ภาษา (Language)",
    languageValue: "ไทย",
    supportLabel: "ติดต่อช่วยเหลือ & ผู้พัฒนา (Support)",
    appVersion: "เวอร์ชันแอปพลิเคชัน",
    dangerSection: "พื้นที่อันตราย (Danger Zone)",
    deleteAccountBtn: "ลบบัญชีผู้ใช้ถาวร (Delete Account)",
    selectLangTitle: "เลือกภาษา (Select Language)",
    supportModalTitle: "ติดต่อช่วยเหลือ & คณะผู้จัดทำ",
    courseTitle: "ส่วนหนึ่งของรายวิชา",
    teamTitle: "สมาชิกกลุ่มผู้พัฒนา (Developers)",
    closeBtn: "ปิดหน้าต่าง",
  },
  en: {
    headerTitle: "Settings",
    accountSection: "Account",
    changeUsername: "Change Username",
    currentPass: "Current Password",
    currentPassPlaceholder: "Enter current password",
    newPass: "New Password",
    newPassPlaceholder: "Leave blank to keep current",
    confirmNewPass: "Confirm New Password",
    confirmNewPassPlaceholder: "Re-enter new password to confirm",
    saveAccountBtn: "Save Account Changes",
    donateSection: "Developer Support / Donate (DEV Only)",
    donateDesc:
      "Upload your payment QR Code from your device so players can support you on your profile.",
    changeQr: "Change QR",
    removeQr: "Remove QR",
    uploadQr: "Upload Donate QR Code",
    prefSection: "Preferences",
    darkMode: "Dark Mode",
    notifications: "Notifications",
    soundEffects: "Sound Effects",
    othersSection: "Others",
    languageLabel: "Language",
    languageValue: "English",
    supportLabel: "Support & Developers",
    appVersion: "App Version",
    dangerSection: "Danger Zone",
    deleteAccountBtn: "Delete Account Permanently",
    selectLangTitle: "Select Language",
    supportModalTitle: "Support & Development Team",
    courseTitle: "Part of Course",
    teamTitle: "Development Team Members",
    closeBtn: "Close",
  },
};

// ✅ รายชื่อสมาชิกกลุ่มและรหัสนักศึกษา
const TEAM_MEMBERS = [
  { name: "นายณัฐนนท หลินมา", id: "6710210096" },
  { name: "นายภัทรพล รสทิพย์", id: "6710210266" },
  { name: "นายภูมิพัฒน์ ตั้งศิริเสถียร", id: "6710210273" },
  { name: "นายเตโชดม จันทร์ดี", id: "6710210594" },
];

export default function SettingsScreen() {
  const router = useRouter();
  const [session, setSession] = useState(null);

  // State สำหรับฟอร์ม
  const [username, setUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // State สำหรับระบบ QR Code โดเนท (เฉพาะยศ DEV)
  const [isDev, setIsDev] = useState(false);
  const [donateQrUrl, setDonateQrUrl] = useState(null);
  const [qrUploading, setQrUploading] = useState(false);

  // State สำหรับการตั้งค่าแอป
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // ✅ State สำหรับเปลี่ยนภาษา ('th' | 'en') และ Modal ติดต่อช่วยเหลือ
  const [language, setLanguage] = useState("th");
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [supportModalVisible, setSupportModalVisible] = useState(false);

  const t = TRANSLATIONS[language];

  // กำหนดชุดสี (Theme Colors)
  const theme = {
    bg: isDarkMode ? "#0a0a1a" : "#f3f4f6",
    card: isDarkMode ? "#1a1a2e" : "#ffffff",
    text: isDarkMode ? "#ffffff" : "#1f2937",
    subText: isDarkMode ? "#9ca3af" : "#6b7280",
    border: isDarkMode ? "#2a2a4a" : "#e5e7eb",
    inputBg: isDarkMode ? "#1a1a2e" : "#f9fafb",
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
    });
  }, []);

  const fetchProfile = async (userId) => {
    const { data } = await supabase
      .from("profiles")
      .select("username, is_dev, donate_qr_url")
      .eq("id", userId)
      .maybeSingle();
    if (data) {
      setUsername(data.username || "");
      setIsDev(!!data.is_dev);
      setDonateQrUrl(data.donate_qr_url || null);
    }
  };

  // ฟังก์ชันอัปโหลดและลบ QR Code รับเงินโดเนท (เฉพาะยศ DEV)
  const handlePickAndUploadQr = async () => {
    if (!isDev || !session) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });

      if (result.canceled) return;

      setQrUploading(true);
      const localUri = result.assets[0].uri;
      const fileExt =
        localUri.substring(localUri.lastIndexOf(".") + 1) || "jpeg";
      const fileName = `qrs/profile-qr-${session.user.id}-${Date.now()}.${fileExt}`;
      const base64 = await FileSystem.readAsStringAsync(localUri, {
        encoding: "base64",
      });

      const { error: uploadError } = await supabase.storage
        .from("images")
        .upload(fileName, decode(base64), {
          contentType: `image/${fileExt}`,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("images")
        .getPublicUrl(fileName);
      const finalUrl = publicUrlData.publicUrl;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ donate_qr_url: finalUrl })
        .eq("id", session.user.id);

      if (updateError) throw updateError;

      setDonateQrUrl(finalUrl);
      Alert.alert(
        "สำเร็จ",
        "อัปโหลด QR Code สำหรับรับโดเนทในหน้าโปรไฟล์เรียบร้อยแล้ว",
      );
    } catch (error) {
      Alert.alert("เกิดข้อผิดพลาด", error.message);
    } finally {
      setQrUploading(false);
    }
  };

  const handleRemoveDonateQr = () => {
    Alert.alert(
      "ลบรูป QR Code โดเนท",
      "คุณต้องการนำรูป QR Code ออกจากหน้าโปรไฟล์ใช่หรือไม่?",
      [
        { text: "ยกเลิก", style: "cancel" },
        {
          text: "ลบออก",
          style: "destructive",
          onPress: async () => {
            try {
              setQrUploading(true);
              const { error } = await supabase
                .from("profiles")
                .update({ donate_qr_url: null })
                .eq("id", session.user.id);

              if (error) throw error;
              setDonateQrUrl(null);
              Alert.alert(
                "สำเร็จ",
                "ลบ QR Code ออกจากหน้าโปรไฟล์เรียบร้อยแล้ว",
              );
            } catch (error) {
              Alert.alert("เกิดข้อผิดพลาด", error.message);
            } finally {
              setQrUploading(false);
            }
          },
        },
      ],
    );
  };

  // บันทึกข้อมูลบัญชี
  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      let isUpdated = false;

      if (username.trim()) {
        const { data, error: profileError } = await supabase
          .from("profiles")
          .update({ username: username.trim() })
          .eq("id", session.user.id)
          .select();

        if (profileError) throw profileError;
        if (!data || data.length === 0) {
          throw new Error(
            "บันทึกชื่อผู้ใช้ไม่สำเร็จ (กรุณาเช็ค RLS ใน Supabase)",
          );
        }
        isUpdated = true;
      }

      if (newPassword.trim() || confirmNewPassword.trim()) {
        if (!currentPassword.trim()) {
          throw new Error("กรุณากรอกรหัสผ่านเดิมเพื่อยืนยันการเปลี่ยนรหัสผ่าน");
        }

        if (newPassword.length < 6) {
          throw new Error("รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
        }

        if (newPassword !== confirmNewPassword) {
          throw new Error("รหัสผ่านใหม่และการยืนยันรหัสผ่านใหม่ไม่ตรงกัน");
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: session.user.email,
          password: currentPassword,
        });

        if (signInError) {
          throw new Error("รหัสผ่านเดิมไม่ถูกต้อง");
        }

        const { error: updateAuthError } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (updateAuthError) throw updateAuthError;

        isUpdated = true;
        setCurrentPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
      }

      if (isUpdated) {
        Alert.alert(
          language === "th" ? "สำเร็จ" : "Success",
          language === "th"
            ? "อัปเดตข้อมูลบัญชีเรียบร้อยแล้ว"
            : "Account updated successfully.",
        );
      }
    } catch (error) {
      Alert.alert("เกิดข้อผิดพลาด", error.message);
    } finally {
      setLoading(false);
    }
  };

  // ลบบัญชีผู้ใช้
  const handleDeleteAccount = async () => {
    Alert.alert(
      "คำเตือน: ยืนยันการลบบัญชี?",
      "ข้อมูลทั้งหมดของคุณ รวมถึงเกมในคลัง ประวัติการแชท และสถานะเพื่อน จะถูกลบอย่างถาวรและไม่สามารถกู้คืนได้",
      [
        { text: "ยกเลิก", style: "cancel" },
        {
          text: "ลบบัญชีถาวร",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              const { error } = await supabase.rpc("delete_my_account");
              if (error) throw error;

              await supabase.auth.signOut();
              Alert.alert("สำเร็จ", "บัญชีของคุณถูกลบเรียบร้อยแล้ว", [
                {
                  text: "ตกลง",
                  onPress: () => router.replace("/(auth)/login"),
                },
              ]);
            } catch (error) {
              console.error("Error deleting account:", error);
              Alert.alert(
                "เกิดข้อผิดพลาด",
                "ไม่สามารถลบบัญชีได้ในขณะนี้ กรุณาลองใหม่ภายหลัง",
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: theme.card }]}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {t.headerTitle}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* หมวดหมู่: บัญชีผู้ใช้ */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          {t.accountSection}
        </Text>
        <View
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.label, { color: theme.subText }]}>
            {t.changeUsername}
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.inputBg,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            value={username}
            onChangeText={setUsername}
            placeholderTextColor={theme.subText}
          />

          <Text style={[styles.label, { color: theme.subText }]}>
            {t.currentPass}
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.inputBg,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder={t.currentPassPlaceholder}
            placeholderTextColor={theme.subText}
            secureTextEntry
          />

          <Text style={[styles.label, { color: theme.subText }]}>
            {t.newPass}
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.inputBg,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder={t.newPassPlaceholder}
            placeholderTextColor={theme.subText}
            secureTextEntry
          />

          <Text style={[styles.label, { color: theme.subText }]}>
            {t.confirmNewPass}
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.inputBg,
                color: theme.text,
                borderColor:
                  confirmNewPassword.length > 0 &&
                  newPassword !== confirmNewPassword
                    ? "#ef4444"
                    : theme.border,
                marginBottom: 10,
              },
            ]}
            value={confirmNewPassword}
            onChangeText={setConfirmNewPassword}
            placeholder={t.confirmNewPassPlaceholder}
            placeholderTextColor={theme.subText}
            secureTextEntry
          />

          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSaveProfile}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>{t.saveAccountBtn}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* หมวดหมู่: ระบบสนับสนุน / โดเนท (เฉพาะ DEV) */}
        {isDev && (
          <>
            <Text
              style={[
                styles.sectionTitle,
                { color: theme.text, marginTop: 25 },
              ]}
            >
              {t.donateSection}
            </Text>
            <View
              style={[
                styles.card,
                { backgroundColor: theme.card, borderColor: "#f59e0b" },
              ]}
            >
              <Text
                style={[styles.label, { color: theme.subText, lineHeight: 20 }]}
              >
                {t.donateDesc}
              </Text>

              {donateQrUrl ? (
                <View style={styles.qrPreviewContainer}>
                  <Image
                    source={{ uri: donateQrUrl }}
                    style={styles.qrImagePreview}
                  />
                  <View style={styles.qrBtnRow}>
                    <TouchableOpacity
                      style={styles.qrChangeBtn}
                      onPress={handlePickAndUploadQr}
                      disabled={qrUploading}
                    >
                      <Ionicons name="image-outline" size={18} color="#fff" />
                      <Text style={styles.qrBtnText}>{t.changeQr}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.qrRemoveBtn}
                      onPress={handleRemoveDonateQr}
                      disabled={qrUploading}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color="#ef4444"
                      />
                      <Text style={[styles.qrBtnText, { color: "#ef4444" }]}>
                        {t.removeQr}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.qrUploadBtn}
                  onPress={handlePickAndUploadQr}
                  disabled={qrUploading}
                >
                  {qrUploading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="qr-code-outline" size={20} color="#fff" />
                      <Text style={styles.qrBtnText}>{t.uploadQr}</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        {/* หมวดหมู่: การแสดงผลและแอปพลิเคชัน */}
        <Text
          style={[styles.sectionTitle, { color: theme.text, marginTop: 25 }]}
        >
          {t.prefSection}
        </Text>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              paddingVertical: 5,
            },
          ]}
        >
          <View
            style={[
              styles.rowConfig,
              { borderBottomColor: theme.border, borderBottomWidth: 1 },
            ]}
          >
            <View style={styles.rowConfigLeft}>
              <Ionicons
                name={isDarkMode ? "moon" : "sunny"}
                size={22}
                color={isDarkMode ? "#818cf8" : "#f59e0b"}
              />
              <Text style={[styles.rowConfigText, { color: theme.text }]}>
                {t.darkMode}
              </Text>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={setIsDarkMode}
              trackColor={{ false: "#d1d5db", true: "#3b82f6" }}
              thumbColor={"#fff"}
            />
          </View>

          <View
            style={[
              styles.rowConfig,
              { borderBottomColor: theme.border, borderBottomWidth: 1 },
            ]}
          >
            <View style={styles.rowConfigLeft}>
              <Ionicons name="notifications" size={22} color="#10b981" />
              <Text style={[styles.rowConfigText, { color: theme.text }]}>
                {t.notifications}
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: "#d1d5db", true: "#3b82f6" }}
              thumbColor={"#fff"}
            />
          </View>

          <View style={styles.rowConfig}>
            <View style={styles.rowConfigLeft}>
              <Ionicons name="volume-high" size={22} color="#ef4444" />
              <Text style={[styles.rowConfigText, { color: theme.text }]}>
                {t.soundEffects}
              </Text>
            </View>
            <Switch
              value={soundEnabled}
              onValueChange={setSoundEnabled}
              trackColor={{ false: "#d1d5db", true: "#3b82f6" }}
              thumbColor={"#fff"}
            />
          </View>
        </View>

        {/* หมวดหมู่: ข้อมูลเพิ่มเติม (ภาษา & ติดต่อช่วยเหลือ) */}
        <Text
          style={[styles.sectionTitle, { color: theme.text, marginTop: 25 }]}
        >
          {t.othersSection}
        </Text>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              paddingVertical: 5,
            },
          ]}
        >
          {/* ✅ 1. ปุ่มเปลี่ยนภาษา (ไทย / อังกฤษ) ใช้งานได้จริง */}
          <TouchableOpacity
            style={[
              styles.rowConfig,
              { borderBottomColor: theme.border, borderBottomWidth: 1 },
            ]}
            onPress={() => setLangModalVisible(true)}
          >
            <View style={styles.rowConfigLeft}>
              <Ionicons name="language" size={20} color="#3b82f6" />
              <Text style={[styles.rowConfigText, { color: theme.text }]}>
                {t.languageLabel}
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text
                style={{ color: "#3b82f6", fontWeight: "bold", marginRight: 6 }}
              >
                {t.languageValue}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={theme.subText}
              />
            </View>
          </TouchableOpacity>

          {/* ✅ 2. ปุ่มติดต่อช่วยเหลือ (Support & สมาชิกกลุ่มวิชา 344-312) */}
          <TouchableOpacity
            style={[
              styles.rowConfig,
              { borderBottomColor: theme.border, borderBottomWidth: 1 },
            ]}
            onPress={() => setSupportModalVisible(true)}
          >
            <View style={styles.rowConfigLeft}>
              <Ionicons name="information-circle" size={22} color="#10b981" />
              <Text style={[styles.rowConfigText, { color: theme.text }]}>
                {t.supportLabel}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.subText} />
          </TouchableOpacity>

          <View style={styles.rowConfig}>
            <Text
              style={[
                styles.rowConfigText,
                { color: theme.text, marginLeft: 0 },
              ]}
            >
              {t.appVersion}
            </Text>
            <Text style={{ color: theme.subText }}>v1.0.0</Text>
          </View>
        </View>

        {/* พื้นที่อันตราย */}
        <Text
          style={[styles.sectionTitle, { color: "#ef4444", marginTop: 35 }]}
        >
          {t.dangerSection}
        </Text>
        <TouchableOpacity
          style={styles.deleteAccountBtn}
          onPress={handleDeleteAccount}
          disabled={loading}
        >
          <Ionicons
            name="trash-outline"
            size={20}
            color="#ef4444"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.deleteAccountText}>{t.deleteAccountBtn}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ================================================================= */}
      {/* ✅ MODAL 1: เลือกภาษา (ไทย / English) */}
      {/* ================================================================= */}
      <Modal
        visible={langModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setLangModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalBox,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {t.selectLangTitle}
            </Text>

            <TouchableOpacity
              style={[
                styles.langOption,
                { borderColor: language === "th" ? "#3b82f6" : theme.border },
                language === "th" && {
                  backgroundColor: "rgba(59, 130, 246, 0.12)",
                },
              ]}
              onPress={() => {
                setLanguage("th");
                setLangModalVisible(false);
              }}
            >
              <Text style={[styles.langOptionText, { color: theme.text }]}>
                🇹🇭 ภาษาไทย (Thai)
              </Text>
              {language === "th" && (
                <Ionicons name="checkmark-circle" size={22} color="#3b82f6" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.langOption,
                { borderColor: language === "en" ? "#3b82f6" : theme.border },
                language === "en" && {
                  backgroundColor: "rgba(59, 130, 246, 0.12)",
                },
              ]}
              onPress={() => {
                setLanguage("en");
                setLangModalVisible(false);
              }}
            >
              <Text style={[styles.langOptionText, { color: theme.text }]}>
                🇬🇧 English (อังกฤษ)
              </Text>
              {language === "en" && (
                <Ionicons name="checkmark-circle" size={22} color="#3b82f6" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeModalBtn}
              onPress={() => setLangModalVisible(false)}
            >
              <Text style={styles.closeModalText}>{t.closeBtn}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ================================================================= */}
      {/* ✅ MODAL 2: ข้อมูลติดต่อ (Email Support) และรายชื่อสมาชิกกลุ่ม */}
      {/* ================================================================= */}
      <Modal
        visible={supportModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSupportModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalBox,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                marginBottom: 14,
              }}
            >
              <Ionicons name="school" size={24} color="#10b981" />
              <Text
                style={[
                  styles.modalTitle,
                  { color: theme.text, marginBottom: 0 },
                ]}
              >
                {t.supportModalTitle}
              </Text>
            </View>

            {/* กล่อง Email Support (แตะเพื่อส่งอีเมลได้ทันที) */}
            <TouchableOpacity
              style={styles.emailSupportCard}
              onPress={() => Linking.openURL("mailto:rosthip2549@gmail.com")}
            >
              <Ionicons name="mail" size={24} color="#3b82f6" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ color: "#9ca3af", fontSize: 12 }}>
                  Email Support
                </Text>
                <Text
                  style={{ color: "#3b82f6", fontSize: 15, fontWeight: "bold" }}
                >
                  rosthip2549@gmail.com
                </Text>
              </View>
              <Ionicons name="open-outline" size={18} color="#3b82f6" />
            </TouchableOpacity>

            {/* ข้อมูลรายวิชา */}
            <View style={styles.courseBadgeBox}>
              <Text
                style={{ color: "#10b981", fontSize: 12, fontWeight: "bold" }}
              >
                {t.courseTitle}
              </Text>
              <Text
                style={{
                  color: theme.text,
                  fontSize: 14,
                  fontWeight: "bold",
                  marginTop: 3,
                }}
              >
                344-312 MOBILE APPLICATION DEVELOPMENT
              </Text>
            </View>

            {/* รายชื่อสมาชิกกลุ่มทั้ง 4 คน */}
            <Text style={[styles.teamHeader, { color: theme.text }]}>
              {t.teamTitle}
            </Text>

            {TEAM_MEMBERS.map((member, index) => (
              <View
                key={member.id}
                style={[
                  styles.memberRow,
                  { backgroundColor: theme.bg, borderColor: theme.border },
                ]}
              >
                <View style={styles.memberNumberCircle}>
                  <Text style={styles.memberNumberText}>{index + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.memberName, { color: theme.text }]}>
                    {member.name}
                  </Text>
                  <Text style={{ color: theme.subText, fontSize: 12 }}>
                    รหัสนักศึกษา: {member.id}
                  </Text>
                </View>
              </View>
            ))}

            <TouchableOpacity
              style={[styles.closeModalBtn, { marginTop: 16 }]}
              onPress={() => setSupportModalVisible(false)}
            >
              <Text style={styles.closeModalText}>{t.closeBtn}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "bold" },
  scrollContent: { padding: 20 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
    marginLeft: 5,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  label: { marginBottom: 8, fontSize: 14, fontWeight: "600" },
  input: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    fontSize: 15,
  },
  saveBtn: {
    backgroundColor: "#0000ff",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  saveBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  rowConfig: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 5,
  },
  rowConfigLeft: { flexDirection: "row", alignItems: "center" },
  rowConfigText: { fontSize: 15, marginLeft: 12, fontWeight: "500" },
  qrPreviewContainer: { alignItems: "center", marginTop: 10 },
  qrImagePreview: {
    width: 170,
    height: 170,
    borderRadius: 12,
    backgroundColor: "#fff",
    marginBottom: 15,
  },
  qrBtnRow: { flexDirection: "row", gap: 10 },
  qrUploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f59e0b",
    padding: 15,
    borderRadius: 10,
    marginTop: 8,
    gap: 8,
  },
  qrChangeBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3b82f6",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  qrRemoveBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.35)",
    gap: 6,
  },
  qrBtnText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  deleteAccountBtn: {
    flexDirection: "row",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    marginTop: 5,
  },
  deleteAccountText: {
    color: "#ef4444",
    fontWeight: "bold",
    fontSize: 15,
  },

  // สไตล์สำหรับ Modal เลือกภาษา และ ติดต่อช่วยเหลือ
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalBox: {
    width: "100%",
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
  },
  langOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  langOptionText: {
    fontSize: 15,
    fontWeight: "bold",
  },
  emailSupportCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(59, 130, 246, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.4)",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  courseBadgeBox: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.35)",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    marginBottom: 14,
  },
  teamHeader: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  memberNumberCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  memberNumberText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
  memberName: { fontSize: 14, fontWeight: "bold" },
  closeModalBtn: {
    backgroundColor: "#ef4444",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 6,
  },
  closeModalText: { color: "#fff", fontSize: 15, fontWeight: "bold" },
});
