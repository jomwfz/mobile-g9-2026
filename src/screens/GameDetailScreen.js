import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { StoreContext } from '../context/StoreContext';

export default function GameDetailScreen({ route, navigation }) {
  const { game } = route.params;
  const { addToCart, cart } = useContext(StoreContext);
  
  const isAlreadyInCart = cart.some(item => item.id === game.id);

  return (
    <View style={styles.container}>
      <View style={styles.coverBox}>
        <Text style={{color: '#fff', fontSize: 20}}>{game.title} Artwork</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{game.title}</Text>
        <Text style={styles.studio}>{game.studio} • {game.genre}</Text>
        <Text style={styles.desc}>{game.desc}</Text>
        
        <Text style={styles.price}>{game.price === 0 ? 'Free' : `฿${game.price}`}</Text>
        
        <TouchableOpacity 
          style={[styles.buyButton, isAlreadyInCart && styles.disabledButton]} 
          onPress={() => {
            if(!isAlreadyInCart) {
              addToCart(game);
              navigation.navigate('Cart');
            }
          }}
          disabled={isAlreadyInCart}
        >
          <Text style={styles.buyButtonText}>
            {isAlreadyInCart ? 'In Cart' : 'Add to Cart'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  coverBox: { height: 250, backgroundColor: '#334155', justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#F8FAFC' },
  studio: { fontSize: 16, color: '#10B981', marginVertical: 8 },
  desc: { fontSize: 16, color: '#94A3B8', lineHeight: 24, marginTop: 10 },
  price: { fontSize: 24, fontWeight: 'bold', color: '#F8FAFC', marginVertical: 20 },
  buyButton: { backgroundColor: '#8B5CF6', padding: 16, borderRadius: 12, alignItems: 'center' },
  disabledButton: { backgroundColor: '#475569' },
  buyButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 18 },
});