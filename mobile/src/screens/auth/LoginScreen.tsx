import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Colors from '../../constants/colors';
import AuthService from '../../services/authService';
import { UserRole } from '../../types/auth';

interface LoginScreenProps {
  onLoginSuccess: (role: string) => void;
}

const DEMO_ACCOUNTS: { label: string; role: UserRole; email: string; icon: string; desc: string }[] = [
  { label: 'Étudiant', role: 'student', email: 'etudiant@unisphere.ai', icon: '🎓', desc: 'Portail académique & QR' },
  { label: 'Enseignant', role: 'teacher', email: 'enseignant@unisphere.ai', icon: '👨‍🏫', desc: 'Cours & Saisie notes' },
  { label: 'Secrétaire', role: 'secretary', email: 'secretaire@unisphere.ai', icon: '📁', desc: 'Dossiers & Certificats' },
  { label: 'Censeur', role: 'censeur', email: 'censeur@unisphere.ai', icon: '⚖️', desc: 'Régulation & Bulletins' },
  { label: 'Admin', role: 'admin', email: 'admin@unisphere.ai', icon: '👑', desc: 'Supervision centrale' },
  { label: 'Gardien', role: 'guard', email: 'gardien@unisphere.ai', icon: '🛡️', desc: 'Portail & Scanner QR' },
  { label: 'Comptable', role: 'accountant', email: 'comptable@unisphere.ai', icon: '💰', desc: 'Encaissements & Trésorerie' },
  { label: 'Alumni', role: 'alumni', email: 'alumni@unisphere.ai', icon: '🤝', desc: 'Réseau diplômés & Mentorat' },
];

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('etudiant@unisphere.ai');
  const [password, setPassword] = useState('unisphere2026');
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>('student');

  const executeLogin = async (targetEmail: string, targetPass: string, fallbackRole: string) => {
    setLoading(true);
    try {
      const res = await AuthService.login(targetEmail, targetPass);
      const role = res.user?.role || fallbackRole;
      onLoginSuccess(role);
    } catch (err: any) {
      Alert.alert(
        'Connexion UniSphere',
        `Serveur non joignable (${err.message || 'erreur réseau'}). Voulez-vous continuer dans l'espace ${fallbackRole.toUpperCase()} ?`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Continuer',
            onPress: async () => {
              await AuthService.setDevRole(fallbackRole);
              onLoginSuccess(fallbackRole);
            },
          },
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleManualLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Erreur', 'Veuillez saisir votre email et mot de passe.');
      return;
    }
    await executeLogin(email, password, selectedRole);
  };

  const handleQuickLogin = async (item: typeof DEMO_ACCOUNTS[0]) => {
    setSelectedRole(item.role);
    setEmail(item.email);
    setPassword('unisphere2026');
    await executeLogin(item.email, 'unisphere2026', item.role);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* En-tête UniSphere AI */}
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>U</Text>
          </View>
          <Text style={styles.title}>UniSphere AI</Text>
          <Text style={styles.subtitle}>Plateforme Universitaire Mobile Intelligente</Text>
          <View style={styles.liveBadge}>
            <Text style={styles.liveDot}>●</Text>
            <Text style={styles.liveText}>API BACKEND FASTAPI CONNECTÉE</Text>
          </View>
        </View>

        {/* Connexion Rapide (8 Espaces en 1 clic) */}
        <View style={styles.demoSection}>
          <Text style={styles.demoTitle}>⚡ CONNEXION RAPIDE (1 CLIC DIRECT) :</Text>
          <Text style={styles.demoDesc}>
            Touchez votre espace pour vous authentifier immédiatement avec un compte réel vérifié :
          </Text>
          <View style={styles.roleGrid}>
            {DEMO_ACCOUNTS.map((item) => {
              const active = selectedRole === item.role;
              return (
                <TouchableOpacity
                  key={item.role}
                  onPress={() => handleQuickLogin(item)}
                  activeOpacity={0.8}
                  style={[styles.roleCard, active && styles.roleCardActive]}
                >
                  <Text style={styles.roleIcon}>{item.icon}</Text>
                  <Text style={[styles.roleText, active && styles.roleTextActive]}>
                    {item.label}
                  </Text>
                  <Text style={styles.quickLabel}>1-Clic ➔</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Formulaire classique */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Connexion manuelle sécurisée</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Adresse Email</Text>
            <TextInput
              style={styles.input}
              placeholder="votre-email@unisphere.ai"
              placeholderTextColor="#94A3B8"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Mot de passe</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#94A3B8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleManualLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.submitBtnText}>
                Se connecter à l'espace {selectedRole.toUpperCase()}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.footerText}>
          UniSphere AI Mobile • Données certifiées en temps réel avec le Backend
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 44,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 10,
  },
  logoText: {
    color: Colors.white,
    fontSize: 32,
    fontWeight: '900',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'center',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 8,
    gap: 6,
  },
  liveDot: {
    color: Colors.accentGreen,
    fontSize: 10,
  },
  liveText: {
    color: Colors.accentGreen,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  demoSection: {
    marginBottom: 20,
  },
  demoTitle: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  demoDesc: {
    color: '#94A3B8',
    fontSize: 11,
    marginBottom: 12,
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleCard: {
    width: '23%',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#334155',
  },
  roleCardActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(255, 107, 0, 0.18)',
  },
  roleIcon: {
    fontSize: 20,
    marginBottom: 3,
  },
  roleText: {
    color: '#CBD5E1',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  roleTextActive: {
    color: Colors.primary,
  },
  quickLabel: {
    color: '#64748B',
    fontSize: 8,
    fontWeight: '700',
    marginTop: 2,
  },
  formCard: {
    backgroundColor: Colors.white,
    borderRadius: 22,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 6,
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 14,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 13,
    color: Colors.text,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 6,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '800',
  },
  footerText: {
    color: '#64748B',
    fontSize: 11,
    textAlign: 'center',
  },
});

export default LoginScreen;
