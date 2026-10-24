import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Colors from '../constants/colors';
import RoleBadge from './RoleBadge';

interface HeaderProps {
  title: string;
  subtitle?: string;
  userName?: string;
  role?: string;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  userName,
  role,
  onLogout,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.brandRow}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>U</Text>
          </View>
          <View>
            <Text style={styles.brandTitle}>UniSphere AI</Text>
            {userName && <Text style={styles.userName}>{userName}</Text>}
          </View>
        </View>

        <View style={styles.rightActions}>
          {role && <RoleBadge role={role} />}
          {onLogout && (
            <TouchableOpacity onPress={onLogout} style={styles.logoutBtn} activeOpacity={0.7}>
              <Text style={styles.logoutText}>Déconnexion</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.titleSection}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.secondary,
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: Colors.white,
    fontWeight: '900',
    fontSize: 20,
  },
  brandTitle: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  userName: {
    color: Colors.textLight,
    fontSize: 12,
    fontWeight: '500',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  logoutText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '600',
  },
  titleSection: {
    marginTop: 4,
  },
  title: {
    color: Colors.white,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 2,
  },
});

export default Header;
