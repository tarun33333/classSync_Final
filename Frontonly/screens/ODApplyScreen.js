import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, Platform, TouchableOpacity, ScrollView, Switch, StatusBar, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import client from '../api/client';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const ODApplyScreen = ({ navigation }) => {
    const { colors: COLORS, gradient: GRADIENT, isDark } = useTheme();
    const styles = getStyles(COLORS, GRADIENT, isDark);

    const [fromDate, setFromDate] = useState(new Date());
    const [toDate, setToDate] = useState(new Date());
    const [reason, setReason] = useState('');
    const [showFrom, setShowFrom] = useState(false);
    const [showTo, setShowTo] = useState(false);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // New Features
    const [isFullDay, setIsFullDay] = useState(true);
    const [selectedPeriods, setSelectedPeriods] = useState([]);
    const [history, setHistory] = useState([]);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const res = await client.get('/od/my');
            setHistory(res.data);
        } catch (error) {
            console.log('Error fetching history', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const stats = useMemo(() => {
        const total = history.length;
        const approved = history.filter(h => h.status === 'Approved').length;
        const rejected = history.filter(h => h.status === 'Rejected').length;
        const pending = history.filter(h => h.status === 'Pending').length;
        return { total, approved, rejected, pending };
    }, [history]);

    const onFromChange = (event, selectedDate) => {
        setShowFrom(Platform.OS === 'ios');
        if (selectedDate) {
            setFromDate(selectedDate);
            if (!isFullDay) setToDate(selectedDate);
        }
    };

    const onToChange = (event, selectedDate) => {
        setShowTo(Platform.OS === 'ios');
        if (selectedDate) setToDate(selectedDate);
    };

    const togglePeriod = (p) => {
        if (selectedPeriods.includes(p)) {
            setSelectedPeriods(selectedPeriods.filter(id => id !== p));
        } else {
            setSelectedPeriods([...selectedPeriods, p]);
        }
    };

    const submitOD = async () => {
        if (!reason.trim()) {
            Alert.alert('Required', 'Please provide a valid reason.');
            return;
        }
        if (!isFullDay && selectedPeriods.length === 0) {
            Alert.alert('Required', 'Please select at least one period.');
            return;
        }

        setSubmitting(true);
        try {
            await client.post('/od/apply', {
                fromDate,
                toDate: isFullDay ? toDate : fromDate,
                reason,
                odType: isFullDay ? 'FullDay' : 'Period',
                periods: isFullDay ? [] : selectedPeriods
            });
            Alert.alert('Success', 'OD Request Submitted successfully!');
            setReason('');
            setSelectedPeriods([]);
            fetchHistory();
        } catch (error) {
            Alert.alert('Error', 'Failed to submit application. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const StatCard = ({ label, count, color, icon }) => (
        <View style={[styles.statCard, { borderLeftColor: color }]}>
            <View style={[styles.iconBox, { backgroundColor: color + '20' }]}>
                <Ionicons name={icon} size={20} color={color} />
            </View>
            <View>
                <Text style={styles.statCount}>{count}</Text>
                <Text style={styles.statLabel}>{label}</Text>
            </View>
        </View>
    );

    const renderHistoryItem = (item) => (
        <View key={item._id} style={styles.historyCard}>
            <View style={styles.historyHeader}>
                <View style={[styles.statusBadge,
                item.status === 'Approved' ? styles.bgGreen :
                    item.status === 'Rejected' ? styles.bgRed : styles.bgYellow
                ]}>
                    <Text style={[styles.statusText,
                    item.status === 'Approved' ? styles.textGreen :
                        item.status === 'Rejected' ? styles.textRed : styles.textYellow
                    ]}>{item.status.toUpperCase()}</Text>
                </View>
                <Text style={styles.dateText}>
                    {new Date(item.createdAt).toLocaleDateString()}
                </Text>
            </View>

            <View style={styles.historyContent}>
                <View style={styles.row}>
                    <Ionicons name="calendar-outline" size={16} color="#666" style={{ marginRight: 6 }} />
                    <Text style={styles.historyDateRange}>
                        {new Date(item.fromDate).toLocaleDateString()}
                        {item.odType === 'Period'
                            ? ` (Periods: ${item.periods.join(', ')})`
                            : item.fromDate !== item.toDate ? ` - ${new Date(item.toDate).toLocaleDateString()}` : ''}
                    </Text>
                </View>
                <Text style={styles.historyReason} numberOfLines={2}>{item.reason}</Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
            <LinearGradient colors={GRADIENT} style={StyleSheet.absoluteFill} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>On-Duty Application</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchHistory(); }} />}
            >
                {/* Stats Section */}
                <Text style={styles.sectionHeader}>Overview</Text>
                <View style={styles.statsGrid}>
                    <StatCard label="Applied" count={stats.total} color="#4834d4" icon="paper-plane" />
                    <StatCard label="Approved" count={stats.approved} color="#2ecc71" icon="checkmark-circle" />
                    <StatCard label="Pending" count={stats.pending} color="#f1c40f" icon="time" />
                    <StatCard label="Rejected" count={stats.rejected} color="#e74c3c" icon="close-circle" />
                </View>

                {/* Application Form */}
                <Text style={styles.sectionHeader}>New Request</Text>
                <View style={styles.formCard}>
                    <View style={styles.toggleRow}>
                        <View style={styles.toggleLabelContainer}>
                            <Ionicons name={isFullDay ? "sunny" : "time"} size={20} color="#555" />
                            <Text style={styles.formLabel}>Full Day OD</Text>
                        </View>
                        <Switch
                            trackColor={{ false: "#767577", true: "#d1fae5" }}
                            thumbColor={isFullDay ? "#059669" : "#f4f3f4"}
                            onValueChange={(val) => {
                                setIsFullDay(val);
                                if (!val) setToDate(fromDate);
                            }}
                            value={isFullDay}
                        />
                    </View>

                    <View style={styles.dateRow}>
                        <View style={styles.dateField}>
                            <Text style={styles.inputLabel}>From</Text>
                            <TouchableOpacity onPress={() => setShowFrom(true)} style={styles.dateInput}>
                                <Text style={styles.dateInputValue}>{fromDate.toLocaleDateString()}</Text>
                                <Ionicons name="calendar" size={18} color="#4834d4" />
                            </TouchableOpacity>
                        </View>
                        {isFullDay && (
                            <View style={styles.dateField}>
                                <Text style={styles.inputLabel}>To</Text>
                                <TouchableOpacity onPress={() => setShowTo(true)} style={styles.dateInput}>
                                    <Text style={styles.dateInputValue}>{toDate.toLocaleDateString()}</Text>
                                    <Ionicons name="calendar" size={18} color="#4834d4" />
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    {showFrom && (<DateTimePicker value={fromDate} mode="date" display="default" onChange={onFromChange} />)}
                    {showTo && (<DateTimePicker value={toDate} mode="date" display="default" onChange={onToChange} />)}

                    {!isFullDay && (
                        <View style={styles.periodSection}>
                            <Text style={styles.inputLabel}>Select Periods</Text>
                            <View style={styles.periodGrid}>
                                {[1, 2, 3, 4, 5, 6].map(p => (
                                    <TouchableOpacity
                                        key={p}
                                        style={[styles.periodBtn, selectedPeriods.includes(p) && styles.periodBtnActive]}
                                        onPress={() => togglePeriod(p)}
                                    >
                                        <Text style={[styles.periodText, selectedPeriods.includes(p) && styles.periodTextActive]}>{p}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}

                    <Text style={[styles.inputLabel, { marginTop: 15 }]}>Reason</Text>
                    <TextInput
                        style={styles.textInput}
                        multiline
                        numberOfLines={3}
                        value={reason}
                        onChangeText={setReason}
                        placeholder="Why do you need OD?"
                        placeholderTextColor="#999"
                    />

                    <TouchableOpacity
                        style={[styles.submitBtn, submitting && styles.disabledBtn]}
                        onPress={submitOD}
                        disabled={submitting}
                    >
                        {submitting ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Text style={styles.submitBtnText}>Submit Application</Text>
                                <Ionicons name="arrow-forward" size={20} color="#fff" />
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Recent History */}
                <Text style={styles.sectionHeader}>Recent History</Text>
                <View style={styles.historyList}>
                    {history.length > 0 ? (
                        history.map(item => renderHistoryItem(item))
                    ) : (
                        <View style={styles.emptyState}>
                            <Ionicons name="document-text-outline" size={48} color="#ccc" />
                            <Text style={styles.emptyText}>No applications yet</Text>
                        </View>
                    )}
                </View>
                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
};

const getStyles = (COLORS, GRADIENT, isDark) => StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    backBtn: { padding: 5 },
    headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
    scrollContent: { padding: 20 },
    sectionHeader: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 14, marginTop: 5 },

    // Stats
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24 },
    statCard: {
        width: '48%',
        backgroundColor: COLORS.bgCard,
        padding: 14,
        borderRadius: 14,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderLeftWidth: 4,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    iconBox: { padding: 8, borderRadius: 10, marginRight: 10 },
    statCount: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
    statLabel: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '500' },

    // Form
    formCard: {
        backgroundColor: COLORS.bgCard,
        borderRadius: 18,
        padding: 18,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    toggleLabelContainer: { flexDirection: 'row', alignItems: 'center' },
    formLabel: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary, marginLeft: 10 },
    dateRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
    dateField: { flex: 0.48 },
    inputLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8 },
    dateInput: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 12,
        padding: 12,
    },
    dateInputValue: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
    periodSection: { marginBottom: 14 },
    periodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    periodBtn: {
        width: 40, height: 40,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.07)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1, borderColor: COLORS.border,
    },
    periodBtnActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
    periodText: { fontWeight: '700', color: COLORS.textSecondary },
    periodTextActive: { color: '#fff' },
    textInput: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 12,
        padding: 14,
        textAlignVertical: 'top',
        fontSize: 15,
        color: COLORS.textPrimary,
        marginBottom: 18,
    },
    submitBtn: {
        backgroundColor: COLORS.accent,
        paddingVertical: 16,
        borderRadius: 14,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    disabledBtn: { backgroundColor: COLORS.textMuted },
    submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700', marginRight: 8 },

    // History
    historyList: {},
    historyCard: {
        backgroundColor: COLORS.bgCard,
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    bgGreen: { backgroundColor: COLORS.successBg },
    bgRed: { backgroundColor: COLORS.dangerBg },
    bgYellow: { backgroundColor: COLORS.warningBg },
    textGreen: { color: COLORS.success, fontSize: 11, fontWeight: '800' },
    textRed: { color: COLORS.danger, fontSize: 11, fontWeight: '800' },
    textYellow: { color: COLORS.warning, fontSize: 11, fontWeight: '800' },
    statusText: {},
    dateText: { fontSize: 12, color: COLORS.textSecondary },
    historyContent: {},
    row: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    historyDateRange: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
    historyReason: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
    emptyState: { alignItems: 'center', padding: 40 },
    emptyText: { color: COLORS.textMuted, marginTop: 10, fontWeight: '500' },
});

export default ODApplyScreen;
