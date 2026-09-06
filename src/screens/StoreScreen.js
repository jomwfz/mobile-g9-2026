import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView } from 'react-native';

const MOCK_GAMES = [
  { id: '1', title: 'Dao Nam Tang', studio: 'Loserpop', genre: 'Music, Rhythm', price: 199, rating: '4.9', desc: 'ผจญภัยไปในอวกาศแห่งเสียงดนตรีอินดี้ป็อป' },
  { id: '2', title: 'President of the School', studio: 'Indie Dev', genre: 'Story Rich, RPG', price: 250, rating: '4.8', desc: 'สวมบทบาทประธานนักเรียน บริหารชมรมดนตรีและสภานักเรียนไปพร้อมกัน' },
  { id: '3', title: 'Object-Oriented Odyssey', studio: 'CS Studio', genre: 'Puzzle, Logic', price: 0, rating: '5.0', desc: 'ไขปริศนาดันเจี้ยนด้วยหลักการเขียนโปรแกรมเชิงวัตถุ' },
];

export default function StoreScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerTitle}>Discover Games</Text>
      <FlatList
        data={MOCK_GAMES}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.gameCard} 
            onPress={() => navigation.navigate('GameDetail', { game: item })}
          >
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imageText}>{item.title} Cover</Text>
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.gameTitle}>{item.title}</Text>
              <Text style={styles.gameStudio}>by {item.studio}</Text>
              <Text style={styles.gamePrice}>{item.price === 0 ? 'Free' : `฿${item.price}`}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#0F172A' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#F8FAFC', marginBottom: 16 },
  gameCard: { backgroundColor: '#1E293B', borderRadius: 12, marginBottom: 16, overflow: 'hidden' },
  imagePlaceholder: { height: 120, backgroundColor: '#334155', justifyContent: 'center', alignItems: 'center' },
  imageText: { color: '#94A3B8', fontWeight: 'bold' },
  cardContent: { padding: 16 },
  gameTitle: { fontSize: 18, fontWeight: 'bold', color: '#F8FAFC' },
  gameStudio: { fontSize: 14, color: '#94A3B8', marginBottom: 8 },
  gamePrice: { fontSize: 16, fontWeight: 'bold', color: '#10B981' },
});