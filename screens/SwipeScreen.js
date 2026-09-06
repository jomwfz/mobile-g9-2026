import React, { useState } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';
import { MOCK_GAMES } from '../mockData';

const { width, height } = Dimensions.get('window');

export default function SwipeScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const game = MOCK_GAMES[currentIndex % MOCK_GAMES.length]; 
  
  const fallbackDesc = "Experience breathtaking graphics, engaging gameplay, and an unforgettable storyline in this masterpiece.";

  return (
    <View style={styles.container}>
      <Text style={styles.headerGreeting}>Discover New Games</Text>
      
      <View style={styles.swipeCard}>
        <Image source={{ uri: game.image }} style={styles.swipeImage} />
        
        <View style={styles.swipeInfo}>
          <Text style={styles.detailTitle}>{game.title}</Text>
          
          <View style={styles.tagsContainer}>
            {game.tags.map((tag, index) => (
              <View key={index} style={styles.tagChip}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
          
          {/* Game Description */}
          <Text style={styles.descriptionText} numberOfLines={3}>
            {game.description || fallbackDesc}
          </Text>
        </View>
      </View>

      <View style={styles.swipeActions}>
        <TouchableOpacity 
          style={[styles.actionBtn, { borderColor: COLORS.danger }]} 
          onPress={() => setCurrentIndex(prev => prev + 1)}>
          <Ionicons name="close" size={32} color={COLORS.danger} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionBtn, { borderColor: COLORS.success }]} 
          onPress={() => setCurrentIndex(prev => prev + 1)}>
          <Ionicons name="heart" size={32} color={COLORS.success} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.background,
    justifyContent: 'center', 
    alignItems: 'center',
    paddingBottom: 100,
    paddingTop: 40,
  },
  headerGreeting: { 
    color: COLORS.textDim, 
    fontSize: 16, 
    marginBottom: 15,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: 'Prompt_700Bold',
  },
  swipeCard: { 
    width: width * 0.85, 
    height: height * 0.66, 
    backgroundColor: COLORS.card, 
    borderRadius: 30, 
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.cardLight,
  },
  swipeImage: { 
    width: '100%', 
    height: '48%' 
  },
  swipeInfo: { 
    paddingTop: 15, 
    paddingHorizontal: 20,
    flex: 1,
    justifyContent: 'flex-start',
  },
  detailTitle: { 
    color: COLORS.text, 
    fontSize: 24, 
    fontWeight: 'bold',
    fontFamily: 'Prompt_700Bold',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    marginBottom: 10,
  },
  tagChip: {
    backgroundColor: 'rgba(124, 77, 255, 0.15)',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  tagText: {
    color: COLORS.secondary,
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'Prompt_700Bold',
  },
  descriptionText: {
    color: COLORS.textDim,
    fontSize: 14,
    lineHeight: 22,
    fontFamily: 'Prompt_400Regular',
  },
  swipeActions: { 
    flexDirection: 'row', 
    marginTop: 20,
    width: '60%', 
    justifyContent: 'space-around' 
  },
  actionBtn: { 
    width: 64, 
    height: 64, 
    borderRadius: 32, 
    borderWidth: 2, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: COLORS.card,
    shadowColor: COLORS.background,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 8,
  },
});