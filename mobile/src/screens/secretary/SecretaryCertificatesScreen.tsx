import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl, ActivityIndicator } from 'react-native';
import Colors from '../../constants/colors';
import Header from '../../components/Header';
import DataService from '../../services/dataService';

export const SecretaryCertificatesScreen = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRequests = async () => {
    try {
      const data = await DataService.getSecretaryCertificates();
      setRequests(Array.isArray(data) ? data : []);
    } catch (e) {
      console.log('Error loading certificate requests:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadRequests();
  };

  const handleAction = (id: number, action: 'Approuver' | 'Rejeter') => {
    Alert.alert('Action confirmée', `La demande #${id} a été marquée comme : ${action}.`);
    setRequests(requests.filter((r) => r.id !== id));
  };

  return (
    <View style={styles.container}>
      <Header title="Demandes de Certificats" subtitle="Validation & Signature Numérique" role="secretary" />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.roleSecretary]} />}
      >
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color={Colors.roleSecretary} style={{ marginVertical: 30 }} />
        ) : requests.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Toutes les demandes ont été traitées !</Text>
            <Text style={styles.emptySubtitle}>Les nouvelles requêtes des étudiants apparaîtront ici.</Text>
          </View>
        ) : (
          requests.map((req) => (
            <View key={req.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View>
                  <Text style={styles.typeText}>{req.type || req.request_type || 'Certificat de Scolarité'}</Text>
                  <Text style={styles.studentName}>{req.student_name || 'Étudiant'}</Text>
                  <Text style={styles.meta}>
                    {req.matricule || 'ETU-2026'} • Demandé le {req.created_at ? new Date(req.created_at).toLocaleDateString('fr-FR') : 'Récent'}
                  </Text>
                </View>
              </View>

              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[styles.btn, styles.btnReject]}
                  onPress={() => handleAction(req.id, 'Rejeter')}
                >
                  <Text style={styles.rejectText}>✕ Rejeter</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btn, styles.btnApprove]}
                  onPress={() => handleAction(req.id, 'Approuver')}
                >
                  <Text style={styles.approveText}>✓ Valider & Générer</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 32 },
  emptyBox: { padding: 40, alignItems: 'center' },
  emptyTitle: { color: Colors.text, fontSize: 15, fontWeight: '700' },
  emptySubtitle: { color: Colors.textMuted, fontSize: 12, marginTop: 4, textAlign: 'center' },
  card: { backgroundColor: Colors.white, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  cardTop: { marginBottom: 14 },
  typeText: { fontSize: 11, fontWeight: '800', color: Colors.roleSecretary, textTransform: 'uppercase' },
  studentName: { fontSize: 15, fontWeight: '800', color: Colors.text, marginTop: 2 },
  meta: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  actionsRow: { flexDirection: 'row', gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  btn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  btnReject: { backgroundColor: '#FEF2F2' },
  btnApprove: { backgroundColor: Colors.roleSecretary },
  rejectText: { color: Colors.accentRed, fontSize: 12, fontWeight: '700' },
  approveText: { color: Colors.white, fontSize: 12, fontWeight: '800' },
});

export default SecretaryCertificatesScreen;
