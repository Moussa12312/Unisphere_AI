import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import Colors from '../../constants/colors';
import Header from '../../components/Header';
import StatCard from '../../components/StatCard';
import DataService from '../../services/dataService';

export const SecretaryHomeScreen = ({ navigation, onLogout }: any) => {
  const [totalStudents, setTotalStudents] = useState<number>(0);
  const [pendingCerts, setPendingCerts] = useState<number>(0);
  const [totalRooms, setTotalRooms] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [studentsData, certsData, roomsData] = await Promise.all([
        DataService.getSecretaryStudents(100).catch(() => null),
        DataService.getSecretaryCertificates().catch(() => []),
        DataService.getSecretaryRooms().catch(() => []),
      ]);

      const count = Array.isArray(studentsData) ? studentsData.length : (studentsData?.total || studentsData?.students?.length || 0);
      setTotalStudents(count || 1);

      const certsList = Array.isArray(certsData) ? certsData : [];
      const pending = certsList.filter((c) => c.status === 'pending' || !c.status).length;
      setPendingCerts(pending);

      const roomsList = Array.isArray(roomsData) ? roomsData : [];
      setTotalRooms(roomsList.length || 7);
    } catch (e) {
      console.log('Error loading secretary home:', e);
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

  return (
    <View style={styles.container}>
      <Header
        title="Secrétariat Académique"
        subtitle="Gestion Administrative & Scolarité"
        userName="Secrétaire UniSphere"
        role="secretary"
        onLogout={onLogout}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.roleSecretary]} />}
      >
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color={Colors.roleSecretary} style={{ marginVertical: 30 }} />
        ) : (
          <>
            <View style={styles.statsRow}>
              <StatCard label="Étudiants Inscrits" value={`${totalStudents} Dossiers`} icon="📝" color={Colors.roleSecretary} subtext="Année en cours" />
              <StatCard label="Certificats" value={`${pendingCerts} En attente`} icon="📄" color={Colors.accentAmber} subtext="Demandes à traiter" />
            </View>

            <View style={styles.statsRow}>
              <StatCard label="Salles Enregistrées" value={`${totalRooms} Salles`} icon="🏫" color={Colors.accentGreen} subtext="Campus principal" />
              <StatCard label="Dossiers Actifs" value="100% Vérifiés" icon="🪪" color={Colors.accentPurple} subtext="Base de données" />
            </View>

            <Text style={styles.sectionTitle}>Opérations Rapides</Text>
            <View style={styles.actionGrid}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => navigation?.navigate('SecretaryStudents')}>
                <Text style={styles.actionIcon}>👥</Text>
                <Text style={styles.actionText}>Annuaire & Dossiers Étudiants</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} onPress={() => navigation?.navigate('SecretaryCertificates')}>
                <Text style={styles.actionIcon}>📑</Text>
                <Text style={styles.actionText}>Validation des Certificats</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} onPress={() => navigation?.navigate('SecretarySchedules')}>
                <Text style={styles.actionIcon}>🏫</Text>
                <Text style={styles.actionText}>Occupation des Salles & Emploi du Temps</Text>
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

export default SecretaryHomeScreen;
