import React from 'react';
import { StyleSheet, Text, View, ScrollView, Image, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';
import { MOCK_GAMES } from '../mockData';

export default function HomeScreen({ navigation }) {
  const renderGameCard = ({ item }) => (
    <TouchableOpacity style={styles.gameCard} onPress={() => navigation.navigate('GameDetail', { game: item })}>
      <Image source={{ uri: item.image }} style={styles.gameImage} />
      <View style={styles.gameInfo}>
        <Text style={styles.gameTitle}>{item.title}</Text>
        <Text style={styles.gamePrice}>{item.price}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerGreeting}>Welcome back,</Text>
          <Text style={styles.headerName}>PlayerX</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('SearchFilter')}>
            <Ionicons name="search" size={20} color={COLORS.text} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('Cart')}>
            <Ionicons name="cart" size={20} color={COLORS.text} />
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.iconButton, { backgroundColor: COLORS.cardLight }]} onPress={() => navigation.navigate('AIAdvisor')}>
            <Ionicons name="hardware-chip" size={20} color={COLORS.secondary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.bannerContainer}>
          <Image source={{ uri: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80' }} style={styles.bannerImage} />
          <View style={styles.bannerOverlay}>
            <Text style={styles.bannerTag}>FEATURED</Text>
            <Text style={styles.bannerTitle}>GAYM of the Year</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Trending Now</Text>
          <TouchableOpacity><Text style={styles.seeAll}>See All</Text></TouchableOpacity>
        </View>
        <FlatList
          data={MOCK_GAMES}
          renderItem={renderGameCard}
          keyExtractor={item => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20 }}
        />
        
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>New Indie Releases</Text>
        </View>
        <View style={{ paddingHorizontal: 20 }}>
           {MOCK_GAMES.map(item => (
              <TouchableOpacity key={item.id} style={styles.listCard} onPress={() => navigation.navigate('GameDetail', { game: item })}>
                <Image source={{ uri: item.image }} style={styles.listImage} />
                <View style={styles.listInfo}>
                  <Text style={styles.gameTitle}>{item.title}</Text>
                  <Text style={styles.textDim}>{item.tags.join(' • ')}</Text>
                  <Text style={styles.gamePrice}>{item.price}</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color={COLORS.primary} />
              </TouchableOpacity>
           ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  textDim: { color: COLORS.textDim, fontSize: 14, fontFamily: 'Prompt_400Regular' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  iconButton: { backgroundColor: COLORS.card, padding: 12, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  bannerContainer: { marginHorizontal: 20, height: 200, borderRadius: 24, overflow: 'hidden', marginBottom: 30 },
  bannerImage: { width: '100%', height: '100%' },
  bannerOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: 'rgba(0,0,0,0.5)' },
  bannerTag: { color: COLORS.secondary, fontWeight: 'bold', fontSize: 12, marginBottom: 4, fontFamily: 'Prompt_700Bold' },
  bannerTitle: { color: COLORS.text, fontSize: 28, fontWeight: 'bold', fontFamily: 'Prompt_700Bold' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 20, marginBottom: 15, marginTop: 10 },
  seeAll: { color: COLORS.primary, fontWeight: '600', fontFamily: 'Prompt_500Medium' },
  gameCard: { width: 160, backgroundColor: COLORS.card, borderRadius: 20, marginRight: 15, padding: 10 },
  gameImage: { width: '100%', height: 140, borderRadius: 16, marginBottom: 10 },
  gameInfo: { paddingHorizontal: 5 },
  gameTitle: { color: COLORS.text, fontSize: 16, fontWeight: 'bold', marginBottom: 4, fontFamily: 'Prompt_700Bold' },
  gamePrice: { color: COLORS.secondary, fontWeight: 'bold', fontFamily: 'Prompt_700Bold' },
  listCard: { flexDirection: 'row', backgroundColor: COLORS.card, borderRadius: 20, padding: 12, marginBottom: 15, alignItems: 'center' },
  listImage: { width: 70, height: 70, borderRadius: 12, marginRight: 15 },
  headerGreeting: { 
    color: COLORS.textDim, 
    fontSize: 14, 
    fontFamily: 'Prompt_400Regular'
  },
  headerName: { 
    color: COLORS.text, 
    fontSize: 24, 
    fontFamily: 'Prompt_700Bold'
  },
  sectionTitle: { 
    color: COLORS.text, 
    fontSize: 20, 
    fontFamily: 'Prompt_700Bold' 
  },
  listInfo: { flex: 1 },
});