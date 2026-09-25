import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { supabase } from "../services/supabaseClient";
import { addPlayerLevel } from "../utils/gaymMarketConfig";

export default function PaymentScreen() {
  const router = useRouter();
  const { total, type, plan, planName } = useLocalSearchParams();

  const [session, setSession] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("promptpay");

  const isDevSubscription = type === "dev_sub";
  const amountToPay = parseFloat(total || "0");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
    });
  }, []);

  const handleConfirmPayment = async () => {
    if (!session) {
      Alert.alert("แจ้งเตือน", "กรุณาเข้าสู่ระบบก่อนชำระเงิน");
      return;
    }

    setProcessing(true);
    try {
      if (isDevSubscription) {
        const expireDate = new Date();
        if (plan === "yearly") {
          expireDate.setFullYear(expireDate.getFullYear() + 1);
        } else {
          expireDate.setMonth(expireDate.getMonth() + 1);
        }

        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            is_dev: true,
            subscription_ends_at: expireDate.toISOString(),
          })
          .eq("id", session.user.id);

        if (updateError) throw updateError;

        Alert.alert(
          "ชำระเงินสำเร็จ!",
          `คุณได้สมัคร "${planName || "DEV Program"}" เรียบร้อยแล้ว`,
          [{ text: "ดูสถานะแพ็กเกจ", onPress: () => router.back() }],
        );
      } else {
        // ชำระเงินจากตะกร้าสินค้า (รวมทั้งซื้อเกม และ ซื้อแพ็กเกจ GAYM Coin)
        const { data: cartItems, error: cartError } = await supabase
          .from("user_cart")
          .select("game_id, games ( id, tag, coin_amount )")
          .eq("user_id", session.user.id);

        if (cartError) throw cartError;

        let totalCoinsToAdd = 0;
        let coinPacksCount = 0;
        const gameLibraryInserts = [];

        (cartItems || []).forEach((item) => {
          const coinAmt = item.games?.coin_amount || 0;
          const isCoin =
            item.games?.tag === "GAYM_COIN" ||
            coinAmt > 0 ||
            [999001, 999005, 999010].includes(Number(item.game_id));

          if (isCoin) {
            coinPacksCount += 1;
            if (coinAmt > 0) {
              totalCoinsToAdd += coinAmt;
            } else if (Number(item.game_id) === 999001) {
              totalCoinsToAdd += 1;
            } else if (Number(item.game_id) === 999005) {
              totalCoinsToAdd += 5;
            } else if (Number(item.game_id) === 999010) {
              totalCoinsToAdd += 10;
            }
          } else {
            gameLibraryInserts.push({
              user_id: session.user.id,
              game_id: item.game_id,
            });
          }
        });

        if (gameLibraryInserts.length > 0) {
          const { error: libError } = await supabase
            .from("user_library")
            .insert(gameLibraryInserts);
          if (libError) throw libError;
        }

        if (totalCoinsToAdd > 0) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("gaym_coins")
            .eq("id", session.user.id)
            .single();

          const currentCoins = profileData?.gaym_coins || 0;
          const { error: coinError } = await supabase
            .from("profiles")
            .update({ gaym_coins: currentCoins + totalCoinsToAdd })
            .eq("id", session.user.id);

          if (coinError) throw coinError;
        }

        // ✅ คำนวณและบวก LV. ให้ผู้เล่น (ซื้อเกม +1 LV./เกม และ ซื้อ GAYM Coin +1 LV./แพ็ก)
        const gainedLevels = gameLibraryInserts.length + coinPacksCount;
        const newLv = await addPlayerLevel(
          session.user.id,
          gainedLevels > 0 ? gainedLevels : 1,
        );

        await supabase
          .from("user_cart")
          .delete()
          .eq("user_id", session.user.id);

        if (totalCoinsToAdd > 0 && gameLibraryInserts.length > 0) {
          Alert.alert(
            "ชำระเงินสำเร็จ! 🎉",
            `ได้รับ +${totalCoinsToAdd} GAYM Coin, เพิ่มเกม ${gameLibraryInserts.length} เกม และอัปเลเวลเป็น LV.${newLv}!`,
            [
              {
                text: "ไปที่ GAYM Market",
                onPress: () => router.replace("/gaym-market"),
              },
              {
                text: "ไปที่คลังเกม",
                onPress: () => router.replace("/(tabs)/library"),
              },
            ],
          );
        } else if (totalCoinsToAdd > 0) {
          Alert.alert(
            "เติม GAYM Coin สำเร็จ! 🎉",
            `ได้รับ +${totalCoinsToAdd} GAYM Coin และอัปเลเวลเป็น LV.${newLv}!`,
            [
              {
                text: "ไปช้อปที่ GAYM Market",
                onPress: () => router.replace("/gaym-market"),
              },
            ],
          );
        } else {
          Alert.alert(
            "ซื้อเกมสำเร็จ! 🎉",
            `เพิ่มเกมเข้าสู่คลังและอัปเลเวลเป็น LV.${newLv} เรียบร้อยแล้ว!`,
            [
              {
                text: "ไปที่คลังเกม",
                onPress: () => router.replace("/(tabs)/library"),
              },
            ],
          );
        }
      }
    } catch (error) {
      Alert.alert("เกิดข้อผิดพลาด", error.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ชำระเงิน (Payment)</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>
            {isDevSubscription
              ? "รายการสมัครสมาชิก (Subscription)"
              : "ยอดชำระรวมทั้งหมด (เกม & GAYM Coin)"}
          </Text>
          {isDevSubscription && (
            <View style={styles.planBadge}>
              <Ionicons name="shield-checkmark" size={16} color="#10b981" />
              <Text style={styles.planBadgeText}>{planName}</Text>
            </View>
          )}
          <Text style={styles.totalAmount}>
            ฿{amountToPay.toLocaleString()}
          </Text>
          <Text style={styles.summarySub}>
            {isDevSubscription
              ? "ยกเลิกได้ตลอดเวลา"
              : "ทุกการซื้อเกมและเติม GAYM Coin จะได้รับ +LV. เพิ่มขึ้นทันที!"}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>เลือกช่องทางการชำระเงิน</Text>

        {[
          {
            id: "promptpay",
            name: "QR PromptPay (พร้อมเพย์)",
            icon: "qr-code-outline",
            color: "#3b82f6",
          },
          {
            id: "truemoney",
            name: "TrueMoney Wallet",
            icon: "wallet-outline",
            color: "#f59e0b",
          },
          {
            id: "credit",
            name: "บัตรเครดิต / เดบิต (Credit/Debit)",
            icon: "card-outline",
            color: "#10b981",
          },
        ].map((method) => (
          <TouchableOpacity
            key={method.id}
            style={[
              styles.methodCard,
              paymentMethod === method.id && styles.methodCardActive,
            ]}
            onPress={() => setPaymentMethod(method.id)}
          >
            <Ionicons name={method.icon} size={24} color={method.color} />
            <Text style={styles.methodName}>{method.name}</Text>
            <Ionicons
              name={
                paymentMethod === method.id
                  ? "checkmark-circle"
                  : "ellipse-outline"
              }
              size={22}
              color={paymentMethod === method.id ? "#10b981" : "#6b7280"}
            />
          </TouchableOpacity>
        ))}

        {paymentMethod === "promptpay" && (
          <View style={styles.qrBox}>
            <Ionicons name="qr-code" size={140} color="#0a0a1a" />
            <Text style={styles.qrHint}>
              สแกน QR เพื่อชำระยอด ฿{amountToPay.toLocaleString()}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.confirmBtn, processing && { opacity: 0.6 }]}
          onPress={handleConfirmPayment}
          disabled={processing}
        >
          {processing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="lock-closed" size={20} color="#fff" />
              <Text style={styles.confirmBtnText}>
                ยืนยันการชำระเงิน (฿{amountToPay.toLocaleString()})
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a1a" },
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
  content: { padding: 20, paddingBottom: 40 },
  summaryCard: {
    backgroundColor: "#1a1a2e",
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2a2a4a",
    marginBottom: 25,
  },
  summaryLabel: { color: "#9ca3af", fontSize: 14 },
  planBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
    marginTop: 10,
  },
  planBadgeText: { color: "#10b981", fontSize: 13, fontWeight: "bold" },
  totalAmount: {
    color: "#fff",
    fontSize: 40,
    fontWeight: "bold",
    marginVertical: 12,
  },
  summarySub: {
    color: "#10b981",
    fontSize: 12,
    textAlign: "center",
    fontWeight: "bold",
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
  },
  methodCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a2e",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2a2a4a",
    marginBottom: 12,
    gap: 12,
  },
  methodCardActive: {
    borderColor: "#10b981",
    backgroundColor: "rgba(16, 185, 129, 0.08)",
  },
  methodName: { color: "#fff", fontSize: 15, fontWeight: "600", flex: 1 },
  qrBox: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginVertical: 15,
    alignSelf: "center",
    width: 220,
  },
  qrHint: { color: "#1f2937", fontSize: 13, fontWeight: "bold", marginTop: 10 },
  confirmBtn: {
    flexDirection: "row",
    backgroundColor: "#0000ff",
    paddingVertical: 16,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 15,
  },
  confirmBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
