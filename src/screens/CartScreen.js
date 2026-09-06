import React, { useContext } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView } from 'react-native';
import { StoreContext } from '../context/StoreContext';

export default function CartScreen() {
  const { cart, removeFromCart } = useContext(StoreContext);
  
  const totalPrice = cart.reduce((sum, item) => sum + item.price, 0);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerTitle}>Your Cart</Text>
      
      {cart.length === 0 ? (
        <Text style={styles.emptyText}>ตะกร้าว่างเปล่า ลองหาเกมใหม่ๆ ดูสิ</Text>
      ) : (
        <View style={{ flex: 1 }}>
          <FlatList
            data={cart}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={styles.cartItem}>
                <View>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.itemPrice}>{item.price === 0 ? 'Free' : `฿${item.price}`}</Text>
                </View>
                <TouchableOpacity onPress={() => removeFromCart(item.id)}>
                  <Text style={styles.removeText}>Remove</Text>
                </TouchableOpacity>
              </View>
            )}
          />
          <View style={styles.checkoutBox}>
            <Text style={styles.totalText}>Total: ฿{totalPrice}</Text>
            <TouchableOpacity style={styles.checkoutButton}>
              <Text style={styles.checkoutButtonText}>Checkout</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#0F172A' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#F8FAFC', marginBottom: 16 },
  emptyText: { color: '#94A3B8', fontSize: 16, textAlign: 'center', marginTop: 40 },
  cartItem: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#1E293B', padding: 16, borderRadius: 12, marginBottom: 10, alignItems: 'center' },
  itemTitle: { fontSize: 16, color: '#F8FAFC', fontWeight: 'bold' },
  itemPrice: { fontSize: 14, color: '#10B981', marginTop: 4 },
  removeText: { color: '#EF4444', fontWeight: 'bold' },
  checkoutBox: { borderTopWidth: 1, borderColor: '#334155', paddingTop: 16, marginTop: 10 },
  totalText: { fontSize: 20, fontWeight: 'bold', color: '#F8FAFC', marginBottom: 16 },
  checkoutButton: { backgroundColor: '#10B981', padding: 16, borderRadius: 12, alignItems: 'center' },
  checkoutButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 18 },
});