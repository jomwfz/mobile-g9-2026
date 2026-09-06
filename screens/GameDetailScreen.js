import React from 'react';
import { StyleSheet, Text, View, ScrollView, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';

export default function GameDetailScreen({ route, navigation }) {
  const { game } = route.params;
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <Image source={{ uri: game.image }} style={styles.detailHeroImage} />
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>

        <View style={styles.detailContent}>
          <View style={styles.detailHeaderRow}>
            <View>
              <Text style={styles.detailTitle}>{game.title}</Text>
              <Text style={styles.textDim}>By Indie Studio • {game.tags.join(', ')}</Text>
            </View>
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={16} color="#FFD700" />
              <Text style={styles.ratingText}>{game.rating}</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Overview</Text>
          <Text style={styles.description}>
            Dive into the immersive world of {game.title}. Experience breathtaking graphics, engaging gameplay, and an unforgettable storyline. Perfect for gamers who love {game.tags[0]}.
          </Text>

          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Price</Text>
            <Text style={styles.priceBig}>{game.price}</Text>
          </View>

          <TouchableOpacity style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Add to Cart</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  textDim: { color: COLORS.textDim, fontSize: 14 },
  detailHeroImage: { width: '100%', height: 350 },
  backButton: { position: 'absolute', top: 50, left: 20, backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 20 },
  detailContent: { backgroundColor: COLORS.background, borderTopLeftRadius: 30, borderTopRightRadius: 30, marginTop: -30, padding: 24 },
  detailHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  detailTitle: { color: COLORS.text, fontSize: 28, fontWeight: 'bold' },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  ratingText: { color: COLORS.text, marginLeft: 5, fontWeight: 'bold' },
  sectionTitle: { color: COLORS.text, fontSize: 20, fontWeight: 'bold', marginTop: 10 },
  description: { color: COLORS.textDim, lineHeight: 24, marginTop: 10, marginBottom: 24 },
  priceContainer: { backgroundColor: COLORS.card, padding: 20, borderRadius: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  priceLabel: { color: COLORS.textDim, fontSize: 16 },
  priceBig: { color: COLORS.secondary, fontSize: 24, fontWeight: 'bold' },
  primaryButton: { backgroundColor: COLORS.primary, padding: 18, borderRadius: 20, alignItems: 'center' },
  primaryButtonText: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
});