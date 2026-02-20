import React, { useState, useEffect } from 'react';
import {
    View, Text, FlatList, StyleSheet, Alert,
    TouchableOpacity, StatusBar, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import client from '../api/client';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const AdvisorDashboard = () => {
    const { colors: COLORS, gradient: GRADIENT, isDark } = useTheme();
    const styles = getStyles(COLORS, GRADIENT, isDark);

    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchRequests(); }, []);

    const fetchRequests = async () => {
        try {
            const res = await client.get('/od/advisor');
            setRequests(res.data);
        } catch { }
        finally { setLoading(false); }
    };

    const handleDecision = async (id, status) => {
        try {
            await client.put(`/od/${id}`, { status });
            Alert.alert('Success', `Request ${status}`);
            fetchRequests();
        } catch {
            Alert.alert('Error', 'Action failed');
        }
    };

    const renderItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>{item.studentName?.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.name}>{item.studentName}</Text>
                    <Text style={styles.roll}>{item.studentRoll}</Text>
                </View>
            </View>
            <View style={styles.dateRow}>
                <Ionicons name="calendar-outline" size={14} color={COLORS.accent} />
                <Text style={styles.date}>
                    {new Date(item.fromDate).toDateString()}
                    {item.odType === 'Period'
                        ? ` (Periods: ${item.periods.join(', ')})`
                        : ` – ${new Date(item.toDate).toDateString()}`}
                </Text>
            </View>
            <Text style={styles.reason}>{item.reason}</Text>
            <View style={styles.actions}>
                <TouchableOpacity
                    style={[styles.btn, styles.rejectBtn]}
                    onPress={() => handleDecision(item._id, 'Rejected')}
                >
                    <Ionicons name="close" size={18} color="#fff" />
                    <Text style={styles.btnText}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.btn, styles.approveBtn]}
                    onPress={() => handleDecision(item._id, 'Approved')}
                >
                    <Ionicons name="checkmark" size={18} color="#fff" />
                    <Text style={styles.btnText}>Approve</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
            <LinearGradient colors={GRADIENT} style={StyleSheet.absoluteFill} />

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator color={COLORS.accent} size="large" />
                </View>
            ) : (
                <FlatList
                    data={requests}
                    keyExtractor={item => item._id}
                    renderItem={renderItem}
                    ListHeaderComponent={<Text style={styles.pageTitle}>📋 Pending Approvals</Text>}
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Ionicons name="checkmark-done-outline" size={40} color={COLORS.textMuted} />
                            <Text style={styles.noData}>No pending requests.</Text>
                        </View>
                    }
                    contentContainerStyle={styles.list}
                />
            )}
        </View>
    );
};

const getStyles = (COLORS, GRADIENT, isDark) => StyleSheet.create({
    root: { flex: 1, backgroundColor: COLORS.bg },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    list: { padding: 20, paddingBottom: 40 },
    pageTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 16 },
    card: { backgroundColor: COLORS.bgCard, borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: COLORS.border },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    avatarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.accentLight, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.borderAccent },
    avatarText: { color: COLORS.accent, fontWeight: 'bold', fontSize: 16 },
    name: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
    roll: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    date: { color: COLORS.accent, fontWeight: '600', fontSize: 13, flex: 1 },
    reason: { color: COLORS.textSecondary, marginBottom: 14, fontSize: 14, lineHeight: 20 },
    actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
    btn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10 },
    rejectBtn: { backgroundColor: COLORS.dangerBg, borderWidth: 1, borderColor: COLORS.danger },
    approveBtn: { backgroundColor: COLORS.successBg, borderWidth: 1, borderColor: COLORS.success },
    btnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
    noData: { color: COLORS.textMuted, marginTop: 12, fontSize: 15 },
});

export default AdvisorDashboard;
