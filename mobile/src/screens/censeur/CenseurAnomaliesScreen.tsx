import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import Colors from '../../constants/colors';
import Header from '../../components/Header';
import DataService from '../../services/dataService';

export const CenseurAnomaliesScreen = () => {
  const [anomaliesData, setAnomaliesData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAnomalies = async () => {
    try {
      const data = await DataService.getCenseurAnomalies();
      setAnomaliesData(data);
    } catch (e) {
      console.log('Error loading censeur anomalies:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAnomalies();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadAnomalies();
  };

  const anomaliesList = Array.isArray(anomaliesData?.anomalies) ? anomaliesData.anomalies : [];

  return (
    <View style={styles.container}>
      <Header title="Audit des Anomalies" subtitle="Détection & Contrôle de Conformité LMD" role="censeur" />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.roleCenseur]} />}
      >
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color={Colors.roleCenseur} style={{ marginVertical: 30 }} />
        ) : anomaliesList.length > 0 ? (
          anomaliesList.map((a: any, i: number) => {
            const isCrit = a.severity === 'high' || a.severity === 'Critique';
            return (
              <View key={a.id || i} style={[styles.card, isCrit && styles.cardCrit]}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.type, isCrit && styles.typeCrit]}>{a.anomaly_type || 'Note Suspecte'}</Text>
                  <View style={[styles.badge, isCrit ? styles.bgCrit : styles.bgWarn]}>
                    <Text style={[styles.badgeText, isCrit ? styles.textCrit : styles.textWarn]}>
                      {a.severity?.toUpperCase() || 'MOYENNE'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.desc}>
                  Étudiant : {a.student_name || 'N/A'} (Matricule : {a.matricule || 'N/A'}) • Note : {a.score}/20
                </Text>
                <Text style={styles.module}>📍 Module : {a.course_title || 'Cours'} • Session : {a.session_name || 'Examen'}</Text>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🛡️</Text>
            <Text style={styles.emptyTitle}>Aucune anomalie détectée</Text>
            <Text style={styles.emptySubtitle}>
              Toutes les notes saisies respectent les barèmes officiels, seuils de validation et coefficients configurés.
            </Text>
          </View>
        )}
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
  emptyCard: { backgroundColor: Colors.white, borderRadius: 16, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: Colors.border, marginTop: 20 },
  emptyIcon: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: Colors.accentGreen, marginBottom: 6 },
  emptySubtitle: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', lineHeight: 18 },
});

export default CenseurAnomaliesScreen;
