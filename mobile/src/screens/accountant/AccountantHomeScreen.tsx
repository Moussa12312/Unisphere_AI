import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import Colors from '../../constants/colors';
import Header from '../../components/Header';
import StatCard from '../../components/StatCard';
import DataService from '../../services/dataService';

export const AccountantHomeScreen = ({ navigation, onLogout }: any) => {
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const data = await DataService.getFinancialOverview();
      setOverview(data);
    } catch (e) {
      console.log('Error loading accountant overview:', e);
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

  const revenue = overview?.total_revenue !== undefined ? `${Number(overview.total_revenue).toLocaleString()} FCFA` : '0 FCFA';
  const late = overview?.late !== undefined ? `${Number(overview.late).toLocaleString()} FCFA` : '0 FCFA';
  const collectionRate = overview?.collection_rate !== undefined ? `${overview.collection_rate}%` : '100%';
  const totalPayments = overview?.total_payments || 0;

  return (
    <View style={styles.container}>
      <Header
        title="Agence Comptable"
        subtitle="Gestion Financière & Recouvrement"
        userName="Comptable UniSphere"
        role="accountant"
        onLogout={onLogout}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.roleAccountant]} />}
      >
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color={Colors.roleAccountant} style={{ marginVertical: 30 }} />
        ) : (
          <>
            <View style={styles.statsRow}>
              <StatCard label="Total Encaissé" value={revenue} icon="💵" color={Colors.accentGreen} subtext="Année universitaire" />
              <StatCard label="Taux Recouvrement" value={collectionRate} icon="📈" color={Colors.roleAccountant} subtext="Tranches perçues" />
            </View>

            <View style={styles.statsRow}>
              <StatCard label="Restant / Impayés" value={late} icon="⏳" color={Colors.accentRed} subtext="Échéances en cours" />
              <StatCard label="Versements Reçus" value={`${totalPayments} Reçus`} icon="🏦" color={Colors.accentPurple} subtext="Enregistrés en base" />
            </View>

            <Text style={styles.sectionTitle}>Modules Comptables</Text>
            <View style={styles.actionGrid}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => navigation?.navigate('AccountantPayments')}>
                <Text style={styles.actionIcon}>🧾</Text>
                <Text style={styles.actionText}>Paiements & Reçus de Scolarité</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} onPress={() => navigation?.navigate('AccountantReports')}>
                <Text style={styles.actionIcon}>📊</Text>
                <Text style={styles.actionText}>Clôture Journalière & Rapports</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 32 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: Colors.text, marginTop: 12, marginBottom: 12 },
  actionGrid: { gap: 10 },
  actionBtn: { backgroundColor: Colors.white, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: Colors.border },
  actionIcon: { fontSize: 24 },
  actionText: { fontSize: 14, fontWeight: '700', color: Colors.text },
});

export default AccountantHomeScreen;
