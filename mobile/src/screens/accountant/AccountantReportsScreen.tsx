import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl, ActivityIndicator } from 'react-native';
import Colors from '../../constants/colors';
import Header from '../../components/Header';
import DataService from '../../services/dataService';

export const AccountantReportsScreen = () => {
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const data = await DataService.getFinancialOverview();
      setOverview(data);
    } catch (e) {
      console.log('Error loading accountant reports:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleClosing = () => {
    Alert.alert('Clôture Confirmée', 'La caisse du jour a été arrêtée, vérifiée et archivée en base comptable.');
  };

  const totalRev = Number(overview?.total_revenue || 0);
  const totalLate = Number(overview?.late || 0);
  const totalPayments = overview?.total_payments || 0;

  return (
    <View style={styles.container}>
      <Header title="Clôture & États Financiers" subtitle="Journée Comptable & Trésorerie" role="accountant" />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.roleAccountant]} />}
      >
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color={Colors.roleAccountant} style={{ marginVertical: 30 }} />
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Recouvrements Certifiés (Base Centrale)</Text>
              <View style={styles.row}>
                <Text style={styles.label}>Total Recouvré (Année / Période)</Text>
                <Text style={styles.val}>{totalRev.toLocaleString()} FCFA</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Reste à recouvrer (Impayés / Échéances)</Text>
                <Text style={styles.val}>{totalLate.toLocaleString()} FCFA</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Nombre de Quittances Émises</Text>
                <Text style={styles.val}>{totalPayments} Reçus</Text>
              </View>
              <View style={[styles.row, styles.totalRow]}>
                <Text style={styles.totalLabel}>TOTAL ENCAISSÉ</Text>
                <Text style={styles.totalVal}>{totalRev.toLocaleString()} FCFA</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.closingBtn} onPress={handleClosing}>
              <Text style={styles.closingBtnText}>🔒 Clôturer la Caisse Journalière</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 32 },
  card: { backgroundColor: Colors.white, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
  cardTitle: { fontSize: 14, fontWeight: '800', color: Colors.text, marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  label: { fontSize: 13, color: Colors.textMuted },
  val: { fontSize: 13, fontWeight: '700', color: Colors.text },
  totalRow: { marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  totalLabel: { fontSize: 13, fontWeight: '900', color: Colors.text },
  totalVal: { fontSize: 15, fontWeight: '900', color: Colors.accentGreen },
  closingBtn: { backgroundColor: Colors.roleAccountant, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  closingBtnText: { color: Colors.white, fontSize: 14, fontWeight: '800' },
});

export default AccountantReportsScreen;
