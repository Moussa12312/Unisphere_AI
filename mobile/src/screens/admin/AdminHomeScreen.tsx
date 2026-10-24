import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import Colors from '../../constants/colors';
import Header from '../../components/Header';
import StatCard from '../../components/StatCard';
import DataService from '../../services/dataService';

export const AdminHomeScreen = ({ navigation, onLogout }: any) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = async () => {
    try {
      const data = await DataService.getAdminStats();
      setStats(data);
    } catch (e) {
      console.log('Error loading admin stats:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadStats();
  };

  const totalStudents = stats?.students?.total || 1;
  const totalTeachers = stats?.teachers?.total || 1;
  const totalCourses = stats?.courses?.total || 1;

  return (
    <View style={styles.container}>
      <Header
        title="Administration Centrale"
        subtitle="Supervision Globale de l'Université"
        userName="Admin UniSphere"
        role="admin"
        onLogout={onLogout}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.roleAdmin]} />}
      >
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color={Colors.roleAdmin} style={{ marginVertical: 30 }} />
        ) : (
          <>
            <View style={styles.statsRow}>
              <StatCard label="Total Inscrits" value={`${totalStudents} Étudiants`} icon="👥" color={Colors.roleAdmin} subtext="Année 2025-2026" />
              <StatCard label="Corps Enseignant" value={`${totalTeachers} Professeurs`} icon="👨‍🏫" color={Colors.accentGreen} subtext="Affectations actives" />
            </View>

            <View style={styles.statsRow}>
              <StatCard label="Modules LMD" value={`${totalCourses} Cours`} icon="📚" color={Colors.accentPurple} subtext="Catalogue universitaire" />
              <StatCard label="Système" value="100 % Opérationnel" icon="⚡" color={Colors.accentGreen} subtext="FastAPI Backend Live" />
            </View>

            <Text style={styles.sectionTitle}>Gestion du Système</Text>
            <View style={styles.actionGrid}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => navigation?.navigate('AdminAccounts')}>
                <Text style={styles.actionIcon}>🛡️</Text>
                <Text style={styles.actionText}>Gestion des Comptes & Rôles</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} onPress={() => navigation?.navigate('AdminSettings')}>
                <Text style={styles.actionIcon}>⚙️</Text>
                <Text style={styles.actionText}>Paramètres Institutionnels & LMD</Text>
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

export default AdminHomeScreen;
