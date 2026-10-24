import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Colors from '../../constants/colors';
import Header from '../../components/Header';

export const CenseurAnomaliesScreen = () => {
  const anomalies = [
    { type: 'Note Manquante', desc: 'Note d\'examen non saisie pour 3 étudiants', module: 'Génie Logiciel L3', severity: 'Moyenne' },
    { type: 'Écart de Barème', desc: 'Une note saisie est supérieure au barème max (22/20)', module: 'Statistiques L1', severity: 'Critique' },
    { type: 'Absentéisme Anormal', desc: 'Taux d\'absence supérieur à 35% sur le cours de jeudi', module: 'Anglais TD L2', severity: 'Faible' },
  ];

  return (
    <View style={styles.container}>
      <Header title="Audit des Anomalies" subtitle="Détection & Contrôle de Conformité" role="censeur" />

      <ScrollView contentContainerStyle={styles.content}>
        {anomalies.map((a, i) => {
          const isCrit = a.severity === 'Critique';
          return (
            <View key={i} style={[styles.card, isCrit && styles.cardCrit]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.type, isCrit && styles.typeCrit]}>{a.type}</Text>
                <View style={[styles.badge, isCrit ? styles.bgCrit : styles.bgWarn]}>
                  <Text style={[styles.badgeText, isCrit ? styles.textCrit : styles.textWarn]}>
                    {a.severity}
                  </Text>
                </View>
              </View>

              <Text style={styles.desc}>{a.desc}</Text>
              <Text style={styles.module}>📍 Module concerné : {a.module}</Text>
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
  card: { backgroundColor: Colors.white, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  cardCrit: { borderColor: '#FCA5A5', backgroundColor: '#FFF5F5' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  type: { fontSize: 14, fontWeight: '800', color: Colors.text },
  typeCrit: { color: Colors.accentRed },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  bgCrit: { backgroundColor: '#FEE2E2' },
  bgWarn: { backgroundColor: '#FEF3C7' },
  badgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  textCrit: { color: Colors.accentRed },
  textWarn: { color: Colors.accentAmber },
  desc: { fontSize: 13, color: Colors.text, marginTop: 4, lineHeight: 18 },
  module: { fontSize: 11, color: Colors.textMuted, marginTop: 8, fontWeight: '600' },
});

export default CenseurAnomaliesScreen;
