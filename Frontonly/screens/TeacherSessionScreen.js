import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, Alert,
    TouchableOpacity, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import client from '../api/client';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const TeacherSessionScreen = ({ route, navigation }) => {
    const { colors: COLORS, gradient: GRADIENT, isDark } = useTheme();
    const styles = getStyles(COLORS, GRADIENT, isDark);

    const { session } = route.params;
    const [attendanceList, setAttendanceList] = useState([]);
    const [refreshInterval, setRefreshInterval] = useState(null);
    const [qrInterval, setQrInterval] = useState(null);
    const [qrValue, setQrValue] = useState(session.qrCode);

    useEffect(() => {
        fetchAttendance();
        const interval = setInterval(fetchAttendance, 5000);
        setRefreshInterval(interval);
        const qrTimer = setInterval(refreshQr, 5000);
        setQrInterval(qrTimer);
        return () => { clearInterval(interval); clearInterval(qrTimer); };
    }, []);

    const fetchAttendance = async () => {
        try {
            const res = await client.get(`/attendance/session/${session._id}`);
            setAttendanceList(res.data);
        } catch { }
    };

    const refreshQr = async () => {
        try {
            const res = await client.post('/sessions/refresh-qr', { sessionId: session._id });
            setQrValue(res.data.qrCode);
        } catch { }
    };

    const endSession = async () => {
        Alert.alert('End Session', 'Are you sure you want to end this session?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'End Session', style: 'destructive',
                onPress: async () => {
                    try {
                        await client.post('/sessions/end', { sessionId: session._id });
                        clearInterval(refreshInterval);
                        clearInterval(qrInterval);
                        navigation.navigate('TeacherMain');
                    } catch (error) {
                        Alert.alert('Error', error.response?.data?.message || 'Failed to end session');
                    }
                }
            }
        ]);
    };

    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
            <LinearGradient colors={GRADIENT} style={StyleSheet.absoluteFill} />

            <FlatList
                data={attendanceList}
                keyExtractor={item => item.student._id}
                renderItem={({ item }) => (
                    <View style={styles.listItem}>
                        <View style={styles.studentInfo}>
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>{item.student.name?.charAt(0)}</Text>
                            </View>
                            <View>
                                <Text style={styles.studentName}>{item.student.name}</Text>
                                <Text style={styles.rollNo}>{item.student.rollNumber}</Text>
                            </View>
                        </View>
                        <View style={[
                            styles.statusBadge,
                            { backgroundColor: item.status === 'present' ? COLORS.successBg : COLORS.dangerBg }
                        ]}>
                            <Text style={[
                                styles.statusText,
                                { color: item.status === 'present' ? COLORS.success : COLORS.danger }
                            ]}>
                                {item.status === 'present' ? item.method?.toUpperCase() : 'ABSENT'}
                            </Text>
                        </View>
                    </View>
                )}
                ListHeaderComponent={() => (
                    <View>
                        {/* Subject Header */}
                        <Text style={styles.subject}>{session.subject}</Text>
                        <Text style={styles.sessionMeta}>Live Session · {session.section || 'Class'}</Text>

                        {/* OTP + QR Card */}
                        <View style={styles.card}>
                            <View style={styles.otpRow}>
                                <View style={styles.otpBox}>
                                    <Text style={styles.otpLabel}>OTP Code</Text>
                                    <Text style={styles.otpValue}>{session.otp}</Text>
                                </View>
                                <View style={styles.qrBox}>
                                    <View style={styles.qrWrapper}>
                                        <QRCode value={qrValue} size={120} backgroundColor="transparent" color="#fff" />
                                    </View>
                                    <Text style={styles.qrNote}>Rotates every 5s</Text>
                                </View>
                            </View>
                        </View>

                        {/* Attendance header */}
                        <View style={styles.attendanceHeader}>
                            <Text style={styles.sectionTitle}>Live Attendance</Text>
                            <View style={styles.countBadge}>
                                <Text style={styles.countText}>
                                    {attendanceList.filter(a => a.status === 'present').length} / {attendanceList.length} present
                                </Text>
                            </View>
                        </View>
                    </View>
                )}
                ListEmptyComponent={
                    <View style={styles.emptyBox}>
                        <Ionicons name="people-outline" size={36} color={COLORS.textMuted} />
                        <Text style={styles.emptyText}>Waiting for students...</Text>
                    </View>
                }
                contentContainerStyle={styles.list}
                ListFooterComponent={
                    <TouchableOpacity style={styles.endBtn} onPress={endSession}>
                        <Ionicons name="stop-circle-outline" size={20} color="#fff" />
                        <Text style={styles.endBtnText}>End Session</Text>
                    </TouchableOpacity>
                }
            />
        </View>
    );
};

const getStyles = (COLORS, GRADIENT, isDark) => StyleSheet.create({
    root: { flex: 1, backgroundColor: COLORS.bg },
    list: { padding: 20, paddingBottom: 40 },
    subject: { fontSize: 26, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 4 },
    sessionMeta: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 20 },
    card: { backgroundColor: COLORS.bgCard, borderRadius: 18, padding: 20, borderWidth: 1, borderColor: COLORS.border, marginBottom: 24 },
    otpRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    otpBox: {},
    otpLabel: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 6, fontWeight: '600' },
    otpValue: { fontSize: 38, fontWeight: 'bold', color: COLORS.accent, letterSpacing: 6 },
    qrBox: { alignItems: 'center' },
    qrWrapper: { padding: 12, backgroundColor: 'rgba(124,106,247,0.15)', borderRadius: 14, borderWidth: 1, borderColor: COLORS.border },
    qrNote: { fontSize: 11, color: COLORS.textMuted, marginTop: 6 },
    attendanceHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
    sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
    countBadge: { backgroundColor: COLORS.accentLight, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: COLORS.borderAccent },
    countText: { color: COLORS.accent, fontWeight: '700', fontSize: 13 },
    listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.bgCard, padding: 14, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
    studentInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.accentLight, justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: COLORS.accent, fontWeight: 'bold', fontSize: 15 },
    studentName: { color: COLORS.textPrimary, fontWeight: '600', fontSize: 14 },
    rollNo: { color: COLORS.textSecondary, fontSize: 12 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontWeight: 'bold', fontSize: 12 },
    emptyBox: { alignItems: 'center', paddingVertical: 24 },
    emptyText: { color: COLORS.textMuted, marginTop: 8 },
    endBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20, backgroundColor: COLORS.dangerBg, borderWidth: 1, borderColor: COLORS.danger, padding: 16, borderRadius: 14 },
    endBtnText: { color: COLORS.danger, fontWeight: 'bold', fontSize: 16 },
});

export default TeacherSessionScreen;
