import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import Colors from '../../constants/colors';
import Header from '../../components/Header';

export const CenseurBulletinsScreen = () => {
  const [classes, setClasses] = useState([
    { name: 'Licence 3 Informatique', count: 48, validated: 48, status: 'Prêt' },
    { name: 'Master 1 IA & Big Data', count: 32, validated: 32, status: 'Prêt' },
    { name: 'Licence 2 Gestion & Finance', count: 54, validated: 50, status: 'En cours' },
    { name: 'Licence 1 Sciences Économiques', count: 75, validated: 60, status: 'En cours' },
  ]);

  const handlePublishAll = () => {
    Alert.alert('Publication Réussie', 'Tous les bulletins validés sont désormais visibles par les étudiants et parents.');
  };

  return (
    <View style={styles.container}>
      <Header title="Bulletins & Délibérations" subtitle="Validation Finale du Semestre" role="censeur" />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topAction}>
          <TouchableOpacity style={styles.publishBtn} onPress={handlePublishAll}>
            <Text style={styles.publishBtnText}>🚀 Publier les Bulletins Validés</Text>
          </TouchableOpacity>
        </View>

        {classes.map((cls, idx) => {
          const isReady = cls.status === 'Prêt';
          return (
            <View key={idx} style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.className}>{cls.name}</Text>
                  <Text style={styles.meta}>Effectif : {cls.count} étudiants</Text>
                </View>
                <View style={[styles.badge, isReady ? styles.bgReady : styles.bgPending]}>
                  <Text style={[styles.badgeText, isReady ? styles.textReady : styles.textPending]}>
                    {cls.status}
                  </Text>
                </View>
              </View>

              <View style={styles.progressRow}>
                <Text style={styles.progressText}>Notes saisies : {cls.validated} / {cls.count}</Text>
                <Text style={styles.calcLink}>Calculer Moyennes ➔</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 32 },
  topAction: { marginBottom: 14 },
  publishBtn: { backgroundColor: Colors.roleCenseur, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  publishBtnText: { color: Colors.white, fontSize: 13, fontWeight: '800' },
  card: { backgroundColor: Colors.white, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  className: { fontSize: 15, fontWeight: '800', color: Colors.text },
  meta: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  bgReady: { backgroundColor: '#ECFDF5' },
  bgPending: { backgroundColor: '#FEF3C7' },
  badgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  textReady: { color: Colors.accentGreen },
  textPending: { color: Colors.accentAmber },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  progressText: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },
  calcLink: { fontSize: 12, color: Colors.roleCenseur, fontWeight: '700' },
});

export default CenseurBulletinsScreen;
