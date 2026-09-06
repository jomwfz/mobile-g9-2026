import React, { useState } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';

// ข้อมูลจำลองสำหรับตะกร้าสินค้า
const INITIAL_CART = [
  { id: '1', title: 'Cyber Hunter', price: 0, priceText: 'Free', image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=500&q=80', tags: ['Action', 'RPG'] },
  { id: '2', title: 'Neon Nights', price: 450, priceText: '450 THB', image: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&w=500&q=80', tags: ['Indie', 'Pixel'] },
];

export default function CartScreen({ navigation }) {
  const [cartItems, setCartItems] = useState(INITIAL_CART);

  // ฟังก์ชันลบเกมออกจากตะกร้า
  const removeItem = (id) => {
    setCartItems(cartItems.filter(item => item.id !== id));
  };

  // คำนวณยอดรวมทั้งหมด
  const totalAmount = cartItems.reduce((sum, item) => sum + item.price, 0);

  const renderItem = ({ item }) => (
    <View style={styles.cartCard}>
      <Image source={{ uri: item.image }} style={styles.itemImage} />
      <View style={styles.itemInfo}>
        <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.itemTags}>{item.tags.join(' • ')}</Text>
        <Text style={styles.itemPrice}>{item.priceText}</Text>
      </View>
      <TouchableOpacity style={styles.removeBtn} onPress={() => removeItem(item.id)}>
        <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Cart</Text>
        <View style={{ width: 44 }} /> {/* ใส่ไว้เพื่อดุลให้ Title อยู่ตรงกลาง */}
      </View>

      {/* Cart Items List */}
      <FlatList
        data={cartItems}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cart-outline" size={80} color={COLORS.cardLight} />
            <Text style={styles.emptyText}>Your cart is empty</Text>
            <TouchableOpacity style={styles.browseBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.browseBtnText}>Browse Games</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Order Summary Bottom Sheet */}
      {cartItems.length > 0 && (
        <View style={styles.summaryContainer}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{totalAmount} THB</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Discount</Text>
            <Text style={styles.summaryValue}>0 THB</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total Payment</Text>
            <Text style={styles.totalValue}>{totalAmount > 0 ? `${totalAmount} THB` : 'Free'}</Text>
          </View>

          <TouchableOpacity style={styles.checkoutBtn}>
            <Text style={styles.checkoutText}>Proceed to Checkout</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.text} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 60, backgroundColor: COLORS.background },
  backBtn: { backgroundColor: COLORS.card, padding: 10, borderRadius: 16 },
  headerTitle: { color: COLORS.text, fontSize: 20, fontFamily: 'Prompt_700Bold' },
  
  listContainer: { padding: 20, paddingBottom: 40 },
  cartCard: { flexDirection: 'row', backgroundColor: COLORS.card, borderRadius: 20, padding: 12, marginBottom: 15, alignItems: 'center', borderWidth: 1, borderColor: COLORS.cardLight },
  itemImage: { width: 80, height: 80, borderRadius: 12 },
  itemInfo: { flex: 1, marginLeft: 15, justifyContent: 'center' },
  itemTitle: { color: COLORS.text, fontSize: 16, fontFamily: 'Prompt_700Bold', marginBottom: 4 },
  itemTags: { color: COLORS.textDim, fontSize: 12, fontFamily: 'Prompt_400Regular', marginBottom: 6 },
  itemPrice: { color: COLORS.secondary, fontSize: 14, fontFamily: 'Prompt_700Bold' },
  removeBtn: { padding: 10, backgroundColor: 'rgba(255, 75, 75, 0.1)', borderRadius: 12 },
  
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyText: { color: COLORS.textDim, fontSize: 18, fontFamily: 'Prompt_500Medium', marginTop: 15, marginBottom: 20 },
  browseBtn: { backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 16 },
  browseBtnText: { color: COLORS.text, fontFamily: 'Prompt_700Bold' },

  summaryContainer: { backgroundColor: COLORS.card, padding: 25, borderTopLeftRadius: 35, borderTopRightRadius: 35, shadowColor: '#000', shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 15 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  summaryLabel: { color: COLORS.textDim, fontSize: 14, fontFamily: 'Prompt_400Regular' },
  summaryValue: { color: COLORS.text, fontSize: 14, fontFamily: 'Prompt_500Medium' },
  divider: { height: 1, backgroundColor: COLORS.cardLight, marginVertical: 15 },
  totalLabel: { color: COLORS.text, fontSize: 16, fontFamily: 'Prompt_700Bold' },
  totalValue: { color: COLORS.primary, fontSize: 20, fontFamily: 'Prompt_700Bold' },
  
  checkoutBtn: { flexDirection: 'row', backgroundColor: COLORS.primary, paddingVertical: 18, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginTop: 25 },
  checkoutText: { color: COLORS.text, fontSize: 16, fontFamily: 'Prompt_700Bold', marginRight: 8 },
});