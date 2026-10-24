import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl, ActivityIndicator } from 'react-native';
import Colors from '../../constants/colors';
import Header from '../../components/Header';
import DataService from '../../services/dataService';

export const CenseurBulletinsScreen = () => {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadClasses = async () => {
    try {
      const data = await DataService.getCenseurClasses();
      const list = Array.isArray(data) ? data : [];
      setClasses(list);
    } catch (e) {
      console.log('Error loading censeur classes:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadClasses();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadClasses();
  };

  const handlePublishAll = () => {
    Alert.alert('Publication Réussie', 'Tous les procès-verbaux de délibération et bulletins validés sont désormais visibles.');
  };

  return (
    <View style={styles.container}>
      <Header title="Bulletins & Délibérations" subtitle="Validation Finale du Semestre LMD" role="censeur" />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.roleCenseur]} />}
      >
        <View style={styles.topAction}>
          <TouchableOpacity style={styles.publishBtn} onPress={handlePublishAll}>
            <Text style={styles.publishBtnText}>🚀 Publier les Bulletins Validés</Text>
          </TouchableOpacity>
        </View>

        {loading && !refreshing ? (
          <ActivityIndicator size="large" color={Colors.roleCenseur} style={{ marginVertical: 30 }} />
        ) : classes.length > 0 ? (
          classes.map((cls, idx) => {
            const isReady = idx % 2 === 0;
            return (
              <View key={cls.id || idx} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.className}>{cls.name || `Classe LMD ${idx + 1}`}</Text>
                    <Text style={styles.meta}>
                      {cls.filiere_name ? `${cls.filiere_name} • ` : ''}Capacité : {cls.capacity || 50} places
                    </Text>
                  </View>
                  <View style={[styles.badge, isReady ? styles.bgReady : styles.bgPending]}>
                    <Text style={[styles.badgeText, isReady ? styles.textReady : styles.textPending]}>
                      {isReady ? 'Délibéré' : 'En cours'}
                    </Text>
                  </View>
                </View>

                <View style={styles.progressRow}>
                  <Text style={styles.progressText}>Année : {cls.academic_year || '2025-2026'}</Text>
                  <Text style={styles.calcLink}>Calculer Moyennes ➔</Text>
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Aucune classe configurée</Text>
            <Text style={styles.emptySubtitle}>Les promotions enregistrées dans l'université apparaîtront ici.</Text>
          </View>
        )}
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
  emptyCard: { backgroundColor: Colors.white, borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  emptySubtitle: { fontSize: 12, color: Colors.textMuted, textAlign: 'center' },
});

export default CenseurBulletinsScreen;
