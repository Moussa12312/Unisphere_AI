import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, RefreshControl, ActivityIndicator } from 'react-native';
import Colors from '../../constants/colors';
import Header from '../../components/Header';
import DataService from '../../services/dataService';

export const AccountantPaymentsScreen = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPayments = async () => {
    try {
      const data = await DataService.getRecentPayments(30);
      const list = Array.isArray(data) ? data : (data?.payments || data?.items || []);
      setPayments(list);
    } catch (e) {
      console.log('Error loading accountant payments:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadPayments();
  };

  const filtered = payments.filter((p) => {
    const student = p.student_name || (p.student ? `${p.student.first_name || ''} ${p.student.last_name || ''}` : '');
    const receipt = p.receipt_number || p.reference || `REC-${p.id}`;
    const q = search.toLowerCase();
    return student.toLowerCase().includes(q) || receipt.toLowerCase().includes(q);
  });

  return (
    <View style={styles.container}>
      <Header title="Encaissements Scolarité" subtitle="Reçus de Paiement & Modes de Règlement" role="accountant" />

      <View style={styles.searchBox}>
        <TextInput
          style={styles.input}
          placeholder="Rechercher par étudiant ou N° reçu..."
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.roleAccountant]} />}
      >
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color={Colors.roleAccountant} style={{ marginVertical: 30 }} />
        ) : filtered.length > 0 ? (
          filtered.map((p, idx) => {
            const studentName = p.student_name || (p.student ? `${p.student.first_name || ''} ${p.student.last_name || ''}`.trim() : 'Étudiant');
            const receipt = p.receipt_number || p.reference || `REC-2026-${String(p.id).padStart(4, '0')}`;
            const amount = Number(p.amount || 0).toLocaleString();
            const dateStr = p.created_at ? new Date(p.created_at).toLocaleDateString('fr-FR') : (p.date || 'Récent');
            const method = p.payment_method || 'Virement / Espèces';
            return (
              <View key={p.id || idx} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.receipt}>#{receipt}</Text>
                    <Text style={styles.student}>{studentName}</Text>
                    <Text style={styles.meta}>
                      {p.matricule ? `${p.matricule} • ` : ''}{p.payment_type || 'Scolarité'}
                    </Text>
                  </View>
                  <Text style={styles.amount}>{amount} F</Text>
                </View>

                <View style={styles.cardBottom}>
                  <Text style={styles.method}>💳 {method}</Text>
                  <Text style={styles.date}>{dateStr}</Text>
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Aucun encaissement trouvé</Text>
            <Text style={styles.emptySubtitle}>Les paiements enregistrés par la comptabilité apparaîtront ici.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  searchBox: { padding: 16, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  input: { backgroundColor: '#F1F5F9', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, color: Colors.text },
  content: { padding: 16, paddingBottom: 32 },
  card: { backgroundColor: Colors.white, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  receipt: { fontSize: 11, fontWeight: '800', color: Colors.roleAccountant },
  student: { fontSize: 15, fontWeight: '800', color: Colors.text, marginTop: 2 },
  meta: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  amount: { fontSize: 16, fontWeight: '900', color: Colors.accentGreen },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  method: { fontSize: 12, color: Colors.text, fontWeight: '600' },
  date: { fontSize: 11, color: Colors.textLight },
  emptyCard: { backgroundColor: Colors.white, borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  emptySubtitle: { fontSize: 12, color: Colors.textMuted, textAlign: 'center' },
});

export default AccountantPaymentsScreen;
