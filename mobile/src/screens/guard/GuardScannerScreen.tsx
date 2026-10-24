import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import Colors from '../../constants/colors';
import Header from '../../components/Header';
import StatCard from '../../components/StatCard';
import DataService from '../../services/dataService';

export const GuardScannerScreen = ({ onLogout }: any) => {
  const [stats, setStats] = useState<any>(null);
  const [lastScanned, setLastScanned] = useState<any>(null);
  const [inputMatricule, setInputMatricule] = useState('ETU-2026-0842');
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [statsData, recentData] = await Promise.all([
        DataService.getGuardStats().catch(() => null),
        DataService.getRecentScans(1).catch(() => []),
      ]);
      setStats(statsData);
      if (Array.isArray(recentData) && recentData.length > 0) {
        setLastScanned({
          name: recentData[0].student_name,
          matricule: recentData[0].matricule,
          filiere: recentData[0].class_name || recentData[0].level,
          status: 'AUTORISÉ & ENREGISTRÉ',
          time: recentData[0].scan_time ? new Date(recentData[0].scan_time).toLocaleTimeString('fr-FR') : 'Aujourd\'hui',
        });
      }
    } catch (e) {
      console.log('Error loading guard data:', e);
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

  const handleScan = async (matToScan?: string) => {
    const mat = matToScan || inputMatricule.trim();
    if (!mat) {
      Alert.alert('Erreur', 'Veuillez saisir ou scanner un matricule.');
      return;
    }

    setScanning(true);
    try {
      const res = await DataService.scanQr(mat);
      setLastScanned({
        name: res.student_name,
        matricule: res.matricule,
        filiere: res.class_name || res.level,
        status: res.status === 'late' ? 'AUTORISÉ (EN RETARD)' : 'AUTORISÉ & PRÉSENT',
        time: 'À l\'instant',
      });
      Alert.alert('Accès Autorisé', `Badge validé avec succès en base de données pour : ${res.student_name} (${res.matricule}).`);
      loadData();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Étudiant non trouvé ou déjà scanné aujourd\'hui';
      Alert.alert('Contrôle d\'Accès', msg);
    } finally {
      setScanning(false);
    }
  };

  const presentCount = stats?.present || 0;
  const lateCount = stats?.late || 0;
  const totalEntries = presentCount + lateCount;

  return (
    <View style={styles.container}>
      <Header
        title="Poste de Garde"
        subtitle="Contrôle d'Accès & Scanner QR Direct"
        userName="Agent Gardien UniSphere"
        role="guard"
        onLogout={onLogout}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.roleGuard]} />}
      >
        <View style={styles.statsRow}>
          <StatCard label="Entrées Validées" value={`${totalEntries} Passages`} icon="🚪" color={Colors.accentGreen} subtext="Scans certifiés" />
          <StatCard label="Retards" value={`${lateCount} Notés`} icon="⏱️" color={Colors.accentAmber} subtext="Horodatage réel" />
        </View>

        {/* Caméra / Viseur de Scan */}
        <View style={styles.scannerBox}>
          <View style={styles.viewfinder}>
            <Text style={styles.scanTargetIcon}>📱</Text>
            <Text style={styles.scanTargetText}>Scanner QR / Contrôle de Matricule</Text>
            <TextInput
              style={styles.matriculeInput}
              value={inputMatricule}
              onChangeText={setInputMatricule}
              placeholder="Matricule (ex: ETU-2026-0842)"
              placeholderTextColor="#64748B"
              autoCapitalize="characters"
            />
          </View>

          <TouchableOpacity
            style={styles.scanTriggerBtn}
            onPress={() => handleScan()}
            disabled={scanning}
            activeOpacity={0.8}
          >
            {scanning ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.scanTriggerText}>⚡ Valider l'Entrée du Badge</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Résultat du dernier scan */}
        {lastScanned && (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultTitle}>Dernier Badge Scanné</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>{lastScanned.status}</Text>
              </View>
            </View>

            <Text style={styles.studentName}>{lastScanned.name}</Text>
            <Text style={styles.studentMat}>{lastScanned.matricule} • {lastScanned.filiere || 'Filière'}</Text>
            <Text style={styles.scanTime}>Horodatage : {lastScanned.time}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 32 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  scannerBox: { backgroundColor: '#0F172A', borderRadius: 20, padding: 20, alignItems: 'center', marginBottom: 16 },
  viewfinder: { width: '100%', borderRadius: 16, borderWidth: 2, borderColor: Colors.primary, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1E293B', marginBottom: 16, padding: 16 },
  scanTargetIcon: { fontSize: 36, marginBottom: 6 },
  scanTargetText: { color: '#94A3B8', fontSize: 11, textAlign: 'center', fontWeight: '700', marginBottom: 12 },
  matriculeInput: { width: '90%', backgroundColor: '#0F172A', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, color: Colors.white, fontSize: 13, fontWeight: '700', textAlign: 'center', borderWidth: 1, borderColor: '#334155' },
  scanTriggerBtn: { backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, width: '100%', alignItems: 'center' },
  scanTriggerText: { color: Colors.white, fontSize: 13, fontWeight: '800' },
  resultCard: { backgroundColor: Colors.white, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  resultTitle: { fontSize: 11, fontWeight: '800', color: Colors.textMuted, textTransform: 'uppercase' },
  statusBadge: { backgroundColor: '#ECFDF5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusBadgeText: { color: Colors.accentGreen, fontSize: 10, fontWeight: '900' },
  studentName: { fontSize: 16, fontWeight: '800', color: Colors.text },
  studentMat: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  scanTime: { fontSize: 11, color: Colors.textLight, marginTop: 6 },
});

export default GuardScannerScreen;
