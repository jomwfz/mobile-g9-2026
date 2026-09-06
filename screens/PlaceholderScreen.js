import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';

export default function PlaceholderScreen({ title }) {
  return (
    <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
      <Ionicons name="construct-outline" size={64} color={COLORS.primary} />
      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>{title}</Text>
      <Text style={styles.textDim}>Work in progress...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  sectionTitle: { color: COLORS.text, fontSize: 20, fontWeight: 'bold' },
  textDim: { color: COLORS.textDim, fontSize: 14, marginTop: 10 },
});