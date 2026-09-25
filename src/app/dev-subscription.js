import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { supabase } from "../services/supabaseClient";

export default function DevSubscriptionScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState("monthly"); // 'monthly' | 'yearly'

  // ข้อมูลแพ็กเกจ DEV
  const plans = {
    monthly: {
      id: "monthly",
      title: "แพ็กเกจรายเดือน (Monthly)",
      price: 199,
      periodText: "ต่อเดือน",
      desc: "เรียกเก็บเงินทุกๆ 1 เดือน ยกเลิกได้ตลอดเวลา",
    },
    yearly: {
      id: "yearly",
      title: "แพ็กเกจรายปี (Yearly)",
      price: 1990,
      periodText: "ต่อปี (ประหยัดกว่า 16%)",
      desc: "เรียกเก็บเงินทุกๆ 12 เดือน คุ้มค่าสำหรับนักพัฒนาตัวจริง",
    },
  };

  // โหลดข้อมูลสถานะ DEV ใหม่ทุกครั้งที่กลับมาหน้านี้ (เช่น หลังชำระเงินเสร็จ)
  useFocusEffect(
    useCallback(() => {
      checkSubscriptionStatus();
    }, []),
  );

  const checkSubscriptionStatus = async () => {
    try {
      setLoading(true);
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      if (!currentSession) {
        Alert.alert("แจ้งเตือน", "กรุณาเข้าสู่ระบบก่อนทำรายการ");
        router.replace("/(auth)/login");
        return;
      }
      setSession(currentSession);

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentSession.user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error("Error fetching subscription:", error.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ พาไปหน้า Payment ทันทีโดยไม่ผ่าน Cart พร้อมส่งราคาและแพ็กเกจที่เลือกไป
  const handleProceedToPayment = () => {
    const chosen = plans[selectedPlan];
    router.push({
      pathname: "/payment",
      params: {
        total: chosen.price.toString(),
        type: "dev_sub",
        plan: chosen.id,
        planName: chosen.title,
      },
    });
  };

  // ✅ ฟังก์ชันยกเลิกการสมัครแพ็กเกจ DEV
  const handleCancelSubscription = () => {
    Alert.alert(
      "ยืนยันการยกเลิกแพ็กเกจ DEV",
      "หากยกเลิกแพ็กเกจ คุณจะสูญเสียป้ายยศ DEV และไม่สามารถเข้าใช้งาน Studio อัปโหลดเกมหรือระบบรับโดเนทได้อีก ยืนยันหรือไม่?",
      [
        { text: "ไม่ยกเลิก", style: "cancel" },
        {
          text: "ยืนยันการยกเลิก",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              const { error } = await supabase
                .from("profiles")
                .update({
                  is_dev: false,
                  subscription_ends_at: null,
                })
                .eq("id", session.user.id);

              if (error) throw error;

              Alert.alert(
                "ยกเลิกสำเร็จ",
                "คุณได้ยกเลิกการเป็นสมาชิก DEV Program เรียบร้อยแล้ว",
              );
              checkSubscriptionStatus();
            } catch (error) {
              Alert.alert("เกิดข้อผิดพลาด", error.message);
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  // เช็คว่าเป็น DEV ที่ยังไม่หมดอายุหรือไม่
  const isCurrentlyDev =
    profile?.is_dev === true &&
    (!profile?.subscription_ends_at ||
      new Date(profile.subscription_ends_at) > new Date());

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>GAYM DEV Program</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {isCurrentlyDev ? (
          // ========================================================
          // ✅ หน้าจอเมื่อซื้อแพ็กเกจแล้ว (แสดงสถานะ + ปุ่มยกเลิกการสมัคร)
          // ========================================================
          <View style={styles.activeSubCard}>
            <View style={styles.activeIconCircle}>
              <Ionicons name="shield-checkmark" size={56} color="#10b981" />
            </View>
            <View style={styles.activeBadgePill}>
              <Text style={styles.activeBadgeText}>ACTIVE SUBSCRIPTION</Text>
            </View>
            <Text style={styles.activeTitle}>คุณซื้อแพ็กเกจ DEV แล้ว!</Text>
            <Text style={styles.activeSubText}>
              บัญชีของคุณได้รับสิทธิ์นักพัฒนาเกม (DEV) เรียบร้อยแล้ว
              สามารถเข้าใช้งาน Studio อัปโหลดเกมและระบบรับโดเนทได้ทันที
            </Text>

            <View style={styles.infoBox}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>สถานะปัจจุบัน:</Text>
                <Text style={[styles.infoValue, { color: "#10b981" }]}>
                  เปิดใช้งาน (DEV)
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>วันหมดอายุรอบบิล:</Text>
                <Text style={styles.infoValue}>
                  {profile?.subscription_ends_at
                    ? new Date(profile.subscription_ends_at).toLocaleDateString(
                        "th-TH",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        },
                      )
                    : "ไม่มีกำหนด"}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.goStudioBtn}
              onPress={() => router.push("/upload-game")}
            >
              <Ionicons name="cloud-upload" size={20} color="#fff" />
              <Text style={styles.goStudioBtnText}>
                ไปยัง Studio อัปโหลดเกม
              </Text>
            </TouchableOpacity>

            {/* ปุ่มยกเลิกการสมัครแพ็กเกจ */}
            <TouchableOpacity
              style={styles.cancelSubBtn}
              onPress={handleCancelSubscription}
            >
              <Ionicons name="close-circle-outline" size={20} color="#ef4444" />
              <Text style={styles.cancelSubBtnText}>
                ยกเลิกการสมัครแพ็กเกจ (Cancel Plan)
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          // ========================================================
          // 🛒 หน้าจอเลือกแพ็กเกจสำหรับผู้ที่ยังไม่ได้เป็น DEV
          // ========================================================
          <>
            <View style={styles.heroBox}>
              <Ionicons name="code-slash" size={48} color="#10b981" />
              <Text style={styles.heroTitle}>อัปเกรดเป็นนักพัฒนา (DEV)</Text>
              <Text style={styles.heroSub}>
                ปลดล็อกฟีเจอร์ระดับมืออาชีพในการวางจำหน่ายเกมและสร้างรายได้บน
                GAYM Store
              </Text>
            </View>

            {/* สิทธิประโยชน์ */}
            <View style={styles.benefitsCard}>
              <Text style={styles.sectionTitle}>สิทธิพิเศษสำหรับยศ DEV</Text>
              {[
                "ปลดล็อกปุ่ม Studio อัปโหลดเกม (รองรับทั้ง URL และไฟล์ .APK)",
                "ได้รับป้ายยศ [DEV] สีเขียวต่อท้ายชื่อในหน้าโปรไฟล์และแชทชุมชน",
                "เปิดระบบรับเงินโดเนท (QR Code) ทั้งในหน้าโปรไฟล์และหน้าเกม",
                "ส่งเกมให้ Admin ตรวจสอบเพื่อรับเครื่องหมายติ๊กถูก (Verified)",
              ].map((benefit, index) => (
                <View key={index} style={styles.benefitRow}>
                  <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                  <Text style={styles.benefitText}>{benefit}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.sectionTitle}>เลือกแพ็กเกจที่ต้องการสมัคร</Text>

            {/* ตัวเลือกแพ็กเกจ รายเดือน */}
            <TouchableOpacity
              style={[
                styles.planCard,
                selectedPlan === "monthly" && styles.planCardSelected,
              ]}
              onPress={() => setSelectedPlan("monthly")}
              activeOpacity={0.85}
            >
              <View style={styles.planHeader}>
                <View>
                  <Text style={styles.planTitle}>{plans.monthly.title}</Text>
                  <Text style={styles.planDesc}>{plans.monthly.desc}</Text>
                </View>
                <Ionicons
                  name={
                    selectedPlan === "monthly"
                      ? "radio-button-on"
                      : "radio-button-off"
                  }
                  size={24}
                  color={selectedPlan === "monthly" ? "#10b981" : "#6b7280"}
                />
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.planPrice}>฿{plans.monthly.price}</Text>
                <Text style={styles.planPeriod}>
                  {" "}
                  / {plans.monthly.periodText}
                </Text>
              </View>
            </TouchableOpacity>

            {/* ตัวเลือกแพ็กเกจ รายปี */}
            <TouchableOpacity
              style={[
                styles.planCard,
                selectedPlan === "yearly" && styles.planCardSelected,
              ]}
              onPress={() => setSelectedPlan("yearly")}
              activeOpacity={0.85}
            >
              <View style={styles.bestValueBadge}>
                <Text style={styles.bestValueText}>
                  คุ้มค่าที่สุด (BEST VALUE)
                </Text>
              </View>
              <View style={styles.planHeader}>
                <View>
                  <Text style={styles.planTitle}>{plans.yearly.title}</Text>
                  <Text style={styles.planDesc}>{plans.yearly.desc}</Text>
                </View>
                <Ionicons
                  name={
                    selectedPlan === "yearly"
                      ? "radio-button-on"
                      : "radio-button-off"
                  }
                  size={24}
                  color={selectedPlan === "yearly" ? "#10b981" : "#6b7280"}
                />
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.planPrice}>฿{plans.yearly.price}</Text>
                <Text style={styles.planPeriod}>
                  {" "}
                  / {plans.yearly.periodText}
                </Text>
              </View>
            </TouchableOpacity>

            {/* ปุ่มกดไปหน้าชำระเงินทันที */}
            <TouchableOpacity
              style={styles.payNowBtn}
              onPress={handleProceedToPayment}
            >
              <Ionicons name="card-outline" size={22} color="#fff" />
              <Text style={styles.payNowBtnText}>
                ดำเนินการชำระเงิน (฿{plans[selectedPlan].price})
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a1a" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0a0a1a",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a2e",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1a1a2e",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  content: { padding: 20, paddingBottom: 50 },

  heroBox: { alignItems: "center", marginBottom: 25 },
  heroTitle: { color: "#fff", fontSize: 24, fontWeight: "bold", marginTop: 10 },
  heroSub: {
    color: "#9ca3af",
    fontSize: 14,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
  },

  benefitsCard: {
    backgroundColor: "#1a1a2e",
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2a2a4a",
    marginBottom: 25,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 14,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  benefitText: { color: "#e5e7eb", fontSize: 13, flex: 1, lineHeight: 19 },

  planCard: {
    backgroundColor: "#1a1a2e",
    borderRadius: 16,
    padding: 18,
    borderWidth: 2,
    borderColor: "#2a2a4a",
    marginBottom: 15,
    position: "relative",
  },
  planCardSelected: {
    borderColor: "#10b981",
    backgroundColor: "rgba(16, 185, 129, 0.08)",
  },
  bestValueBadge: {
    backgroundColor: "#f59e0b",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  bestValueText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
  planHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  planTitle: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  planDesc: { color: "#9ca3af", fontSize: 12, marginTop: 4 },
  priceRow: { flexDirection: "row", alignItems: "baseline", marginTop: 12 },
  planPrice: { color: "#10b981", fontSize: 26, fontWeight: "bold" },
  planPeriod: { color: "#9ca3af", fontSize: 13 },

  payNowBtn: {
    flexDirection: "row",
    backgroundColor: "#10b981",
    paddingVertical: 16,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  payNowBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },

  // สไตล์หน้าแสดงสถานะเมื่อซื้อแพ็กเกจแล้ว
  activeSubCard: {
    backgroundColor: "#1a1a2e",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#10b981",
    marginTop: 10,
  },
  activeIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  activeBadgePill: {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 10,
  },
  activeBadgeText: { color: "#10b981", fontSize: 11, fontWeight: "bold" },
  activeTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 8,
  },
  activeSubText: {
    color: "#9ca3af",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },

  infoBox: {
    width: "100%",
    backgroundColor: "#0a0a1a",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#2a2a4a",
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 6,
  },
  infoLabel: { color: "#9ca3af", fontSize: 14 },
  infoValue: { color: "#fff", fontSize: 14, fontWeight: "bold" },

  goStudioBtn: {
    width: "100%",
    flexDirection: "row",
    backgroundColor: "#3b82f6",
    paddingVertical: 15,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  goStudioBtnText: { color: "#fff", fontSize: 15, fontWeight: "bold" },

  cancelSubBtn: {
    width: "100%",
    flexDirection: "row",
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    paddingVertical: 15,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.4)",
    gap: 8,
  },
  cancelSubBtnText: { color: "#ef4444", fontSize: 15, fontWeight: "bold" },
});
