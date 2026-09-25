import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { supabase } from "../services/supabaseClient";

export default function CartScreen() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        Alert.alert("แจ้งเตือน", "กรุณาเข้าสู่ระบบเพื่อดูตะกร้าสินค้า");
        router.replace("/(auth)/login");
      }
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (session) fetchCart();
    }, [session]),
  );

  const fetchCart = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("user_cart")
        .select(
          `id, game_id, games ( id, title, price, discount_percent, image_url, is_reviewed, tag, coin_amount )`,
        )
        .eq("user_id", session.user.id)
        .order("added_at", { ascending: false });

      if (error) throw error;
      setCartItems(data || []);
    } catch (error) {
      console.error("Error fetching cart:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (cartId) => {
    try {
      await supabase.from("user_cart").delete().eq("id", cartId);
      fetchCart();
    } catch (error) {
      console.error("Remove error:", error.message);
    }
  };

  // คำนวณราคารวมทั้งเกมและแพ็กเกจ GAYM Coin ในตะกร้า
  const totalPrice = cartItems.reduce(
    (sum, item) => sum + (item.games?.price || 0),
    0,
  );

  const handleCheckout = () => {
    if (cartItems.length === 0) return;
    router.push(`/payment?total=${totalPrice}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons color="#fff" name="arrow-back" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Cart</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#0000ff" size="large" />
        </View>
      ) : cartItems.length === 0 ? (
        <View style={styles.center}>
          <Ionicons color="#1a1a2e" name="cart-outline" size={80} />
          <Text style={styles.emptyText}>ตะกร้าของคุณว่างเปล่า</Text>
        </View>
      ) : (
        <>
          <FlatList
            data={cartItems}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{ padding: 20 }}
            renderItem={({ item }) => {
              const isCoinPack =
                item.games?.tag === "GAYM_COIN" ||
                (item.games?.coin_amount || 0) > 0;

              return (
                <TouchableOpacity
                  style={[
                    styles.cartItem,
                    isCoinPack && { borderColor: "#facc15", borderWidth: 1 },
                  ]}
                  activeOpacity={0.8}
                  onPress={() =>
                    isCoinPack
                      ? router.push("/gaym-market")
                      : router.push(`/game/${item.game_id}`)
                  }
                >
                  {isCoinPack ? (
                    <View style={styles.coinCartThumb}>
                      <Ionicons name="logo-bitcoin" size={30} color="#facc15" />
                    </View>
                  ) : (
                    <Image
                      source={{ uri: item.games?.image_url }}
                      style={styles.image}
                    />
                  )}

                  <View style={styles.itemInfo}>
                    <View style={styles.titleRow}>
                      <Text numberOfLines={1} style={styles.title}>
                        {item.games?.title}
                      </Text>
                      {item.games?.is_reviewed && !isCoinPack && (
                        <Ionicons
                          name="checkmark-circle"
                          size={16}
                          color="#10b981"
                        />
                      )}
                    </View>

                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Text style={styles.price}>฿{item.games?.price}</Text>
                      {isCoinPack && item.games?.discount_percent === 50 && (
                        <>
                          <Text style={styles.oldPrice}>฿200</Text>
                          <View style={styles.discountBadge}>
                            <Text style={styles.discountText}>ลด 50%</Text>
                          </View>
                        </>
                      )}
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleRemove(item.id)}
                    style={styles.removeBtn}
                  >
                    <Ionicons color="#ef4444" name="trash-outline" size={24} />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            }}
          />
          <View style={styles.bottomBar}>
            <View>
              <Text style={styles.totalLabel}>Total Price</Text>
              <Text style={styles.totalPrice}>฿{totalPrice}</Text>
            </View>
            <TouchableOpacity
              onPress={handleCheckout}
              style={styles.checkoutBtn}
            >
              <Text style={styles.checkoutText}>CHECKOUT</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a1a" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { color: "#9ca3af", marginTop: 10, fontSize: 16 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1a1a2e",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  cartItem: {
    flexDirection: "row",
    backgroundColor: "#1a1a2e",
    borderRadius: 12,
    padding: 10,
    marginBottom: 15,
    alignItems: "center",
  },
  image: { width: 80, height: 60, borderRadius: 8, marginRight: 15 },
  coinCartThumb: {
    width: 80,
    height: 60,
    borderRadius: 8,
    marginRight: 15,
    backgroundColor: "rgba(250, 204, 21, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  itemInfo: { flex: 1 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 5,
  },
  title: { color: "#fff", fontWeight: "bold", fontSize: 15, flexShrink: 1 },
  price: { color: "#10b981", fontWeight: "bold", fontSize: 15 },
  oldPrice: {
    color: "#6b7280",
    fontSize: 12,
    textDecorationLine: "line-through",
  },
  discountBadge: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
  removeBtn: { padding: 10 },
  bottomBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#1a1a2e",
    borderTopWidth: 1,
    borderTopColor: "#2a2a4a",
  },
  totalLabel: { color: "#9ca3af", fontSize: 14 },
  totalPrice: { color: "#fff", fontSize: 24, fontWeight: "bold" },
  checkoutBtn: {
    backgroundColor: "#0000ff",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
  },
  checkoutText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
