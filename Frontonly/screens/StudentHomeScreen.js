import React, { useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    RefreshControl, ScrollView, StatusBar, Animated
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../context/AuthContext';
import client from '../api/client';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { formatTime } from '../utils/timeUtils';
import { useTheme } from '../context/ThemeContext';

const StudentHomeScreen = ({ navigation }) => {
    const { colors: COLORS, gradient: GRADIENT, isDark } = useTheme();
    const styles = getStyles(COLORS, GRADIENT, isDark);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning 🌅';
        if (hour < 17) return 'Good Afternoon ☀️';
        if (hour < 21) return 'Good Evening 🌇';
        return 'Good Night 🌙';
    };

    const { userInfo } = useContext(AuthContext);
    const [periods, setPeriods] = useState([]);

    const [showIntro, setShowIntro] = useState(true);
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const scaleAnim = useRef(new Animated.Value(0.9)).current;

    useEffect(() => {
        Animated.sequence([
            // Slight pop-in scale
            Animated.timing(scaleAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
            // Hold for a moment
            Animated.delay(1000),
            // Fade out and scale up slightly
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
                Animated.timing(scaleAnim, { toValue: 1.1, duration: 500, useNativeDriver: true })
            ])
        ]).start(() => setShowIntro(false));
    }, []);

    const [refreshing, setRefreshing] = useState(false);
    const [activePeriod, setActivePeriod] = useState(null);

    const fetchDashboard = async () => {
        try {
            const res = await client.get('/attendance/dashboard');
            setPeriods(res.data);
            const ongoing = res.data.find(p => p.status === 'ongoing');
            setActivePeriod(ongoing || null);
        } catch (error) {
            if (error.response && (error.response.status === 401 || error.response.status === 403)) {
                navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
            }
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchDashboard();
            const intervalId = setInterval(() => {
                client.get('/attendance/dashboard').then(res => {
                    setPeriods(res.data);
                    const ongoing = res.data.find(p => p.status === 'ongoing');
                    setActivePeriod(ongoing || null);
                }).catch(() => { });
            }, 2000);
            return () => clearInterval(intervalId);
        }, [])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchDashboard();
        setRefreshing(false);
    };

    const handleAction = (sessionId, mode) => {
        if (!sessionId) return;
        navigation.navigate('StudentAttendance', { sessionId, mode });
    };

    const [now, setNow] = useState(new Date());

    // Tick every 30 seconds so the highlight updates without a full refresh
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 30000);
        return () => clearInterval(timer);
    }, []);

    // Returns true if the current local time falls within the period's startTime..endTime.
    // Handles both '09:30' (24h) and '09:30 AM' (12h) formats.
    const isCurrentPeriod = (start, end) => {
        if (!start || !end || start === 'Live') return false;
        const parse = (t) => {
            const parts = t.trim().split(' ');
            let [h, m] = parts[0].split(':').map(Number);
            if (parts[1]) { // 12-hour format
                if (parts[1].toUpperCase() === 'PM' && h !== 12) h += 12;
                if (parts[1].toUpperCase() === 'AM' && h === 12) h = 0;
            }
            return h * 60 + m;
        };
        const cur = now.getHours() * 60 + now.getMinutes();
        return cur >= parse(start) && cur < parse(end);
    };

    const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });

    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
            <LinearGradient colors={GRADIENT} style={StyleSheet.absoluteFill} />

            <ScrollView
                style={styles.container}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={COLORS.accent}
                        colors={[COLORS.accent]}
                    />
                }
            >
                {/* Header */}
                <View style={styles.headerContainer}>
                    <View>
                        <Text style={styles.greeting}>{getGreeting()}</Text>
                        <Text style={styles.userName}>{userInfo?.name}</Text>
                    </View>
                    <View style={styles.dateBadge}>
                        <Text style={styles.dateText}>{currentDay}</Text>
                    </View>
                </View>

                {/* Hero Card for Active Session */}
                {activePeriod ? (
                    <View style={styles.heroCard}>
                        <View style={styles.heroHeader}>
                            <Text style={styles.liveBadge}>🔴 LIVE</Text>
                            <Text style={styles.heroTime}>
                                {formatTime(activePeriod.startTime)} – {formatTime(activePeriod.endTime)}
                            </Text>
                        </View>
                        <Text style={styles.heroSubject}>{activePeriod.subject}</Text>
                        <Text style={styles.heroTeacher}>Teacher: {activePeriod.teacherName || 'Faculty'}</Text>
                        <Text style={styles.actionLabel}>Mark Your Attendance:</Text>
                        <View style={styles.buttonRow}>
                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: COLORS.accent }]}
                                onPress={() => handleAction(activePeriod.sessionId, 'otp')}
                            >
                                <Ionicons name="keypad-outline" size={22} color="#fff" />
                                <Text style={styles.btnText}>Enter OTP</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: COLORS.accentDark }]}
                                onPress={() => handleAction(activePeriod.sessionId, 'qr')}
                            >
                                <Ionicons name="qr-code-outline" size={22} color="#fff" />
                                <Text style={styles.btnText}>Scan QR</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <View style={styles.heroPlaceholder}>
                        <Ionicons name="cafe-outline" size={38} color={COLORS.textMuted} />
                        <Text style={styles.placeholderText}>No classes going on right now.</Text>
                    </View>
                )}

                {/* Quick Actions */}
                <Text style={styles.sectionTitle}>Quick Actions</Text>
                <View style={styles.quickGrid}>
                    {[
                        { label: 'Weekly Schedule', icon: 'calendar-outline', screen: 'Timetable', params: { role: 'student' }, color: COLORS.accent },
                        { label: 'Apply On-Duty', icon: 'document-text-outline', screen: 'ODApply', color: '#26D0CE' },
                        { label: 'Notice Board', icon: 'megaphone-outline', screen: 'Announcements', color: '#aa4b6b' },
                        { label: 'AI Assistant', icon: 'sparkles-outline', screen: 'AIChat', color: '#f59e0b' },
                        { label: 'Join Quiz', icon: 'pencil-outline', screen: 'StudentQuizJoin', color: '#4ade80' },
                    ].map((item) => (
                        <TouchableOpacity
                            key={item.screen}
                            style={styles.quickCard}
                            onPress={() => navigation.navigate(item.screen, item.params)}
                        >
                            <View style={[styles.quickIcon, { backgroundColor: item.color + '33' }]}>
                                <Ionicons name={item.icon} size={24} color={item.color} />
                            </View>
                            <Text style={styles.quickLabel}>{item.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Schedule List */}
                <Text style={styles.sectionTitle}>Today's Schedule</Text>
                {periods
                    .filter(p => p.day === currentDay)
                    .sort((a, b) => a.startTime.localeCompare(b.startTime))
                    .map((item, index) => {
                        const isLive = isCurrentPeriod(item.startTime, item.endTime);
                        return (
                            <View
                                key={index}
                                style={[
                                    styles.classCard,
                                    (item.status === 'ongoing' || isLive) && styles.activeBorder,
                                ]}
                            >
                                <View style={styles.timeColumn}>
                                    <Text style={[styles.startTime, isLive && { color: COLORS.accent }]}>
                                        {formatTime(item.startTime)}
                                    </Text>
                                    <Text style={styles.endTime}>{formatTime(item.endTime)}</Text>
                                </View>
                                <View style={styles.infoColumn}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        {isLive && <View style={styles.liveDot} />}
                                        <Text style={styles.listSubject}>{item.subject}</Text>
                                    </View>
                                    <Text style={[
                                        styles.statusText,
                                        item.status === 'present' ? styles.statusPresent :
                                            item.status === 'absent' ? styles.statusAbsent :
                                                isLive ? styles.statusLive : styles.statusUpcoming
                                    ]}>
                                        {isLive && item.status !== 'present' ? 'NOW' :
                                            item.status ? item.status.toUpperCase() : 'UPCOMING'}
                                    </Text>
                                </View>
                                {item.status === 'present' && (
                                    <Ionicons name="checkmark-circle" size={22} color={COLORS.success} />
                                )}
                                {isLive && item.status !== 'present' && (
                                    <Ionicons name="radio-button-on" size={18} color={COLORS.danger} />
                                )}
                            </View>
                        );
                    })}

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Intro Greeting Animation Overlay */}
            {showIntro && (
                <Animated.View style={[
                    StyleSheet.absoluteFill,
                    {
                        backgroundColor: COLORS.bg,
                        zIndex: 999,
                        justifyContent: 'center',
                        alignItems: 'center',
                        opacity: fadeAnim,
                    }
                ]}>
                    <LinearGradient colors={GRADIENT} style={StyleSheet.absoluteFill} />
                    <Animated.View style={{ transform: [{ scale: scaleAnim }], alignItems: 'center' }}>
                        <Text style={{ fontSize: 32, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8 }}>{getGreeting()}</Text>
                        <Text style={{ fontSize: 44, fontWeight: '900', color: COLORS.textPrimary }}>{userInfo?.name}</Text>
                    </Animated.View>
                </Animated.View>
            )}
        </View>
    );
};

const getStyles = (COLORS, GRADIENT, isDark) => StyleSheet.create({
    root: { flex: 1, backgroundColor: COLORS.bg },
    container: { flex: 1, padding: 20 },
    headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, marginTop: 10 },
    greeting: { fontSize: 15, color: COLORS.textSecondary },
    userName: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary },
    dateBadge: { backgroundColor: COLORS.accentLight, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: COLORS.borderAccent },
    dateText: { color: COLORS.accent, fontWeight: '700', fontSize: 13 },
    heroCard: {
        backgroundColor: COLORS.bgCard,
        borderRadius: 20,
        padding: 20,
        marginBottom: 28,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    heroHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    liveBadge: { color: COLORS.danger, fontWeight: 'bold', fontSize: 12, backgroundColor: COLORS.dangerBg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    heroTime: { color: COLORS.textSecondary, fontWeight: '600', fontSize: 13 },
    heroSubject: { fontSize: 22, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 4 },
    heroTeacher: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 18 },
    actionLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 12 },
    buttonRow: { flexDirection: 'row', gap: 10 },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 13, borderRadius: 12, gap: 8 },
    btnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
    heroPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bgCard, borderRadius: 20, padding: 30, marginBottom: 28, borderStyle: 'dashed', borderWidth: 1, borderColor: COLORS.border },
    placeholderText: { color: COLORS.textMuted, marginTop: 10, fontWeight: '500' },
    sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 14, marginTop: 4 },
    quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 },
    quickCard: { width: '47%', backgroundColor: COLORS.bgCard, borderRadius: 14, padding: 16, alignItems: 'flex-start', borderWidth: 1, borderColor: COLORS.border },
    quickIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    quickLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
    classCard: { backgroundColor: COLORS.bgCard, flexDirection: 'row', padding: 14, borderRadius: 12, marginBottom: 10, alignItems: 'center', borderLeftWidth: 3, borderLeftColor: COLORS.border, borderWidth: 1, borderColor: COLORS.border },
    activeBorder: { borderLeftColor: COLORS.accent, borderLeftWidth: 4, backgroundColor: COLORS.accentLight },
    liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.danger },
    timeColumn: { marginRight: 14, borderRightWidth: 1, borderRightColor: COLORS.border, paddingRight: 14, alignItems: 'center' },
    startTime: { fontWeight: 'bold', color: COLORS.textPrimary, fontSize: 13 },
    endTime: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
    infoColumn: { flex: 1 },
    listSubject: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 3 },
    statusText: { fontSize: 11, fontWeight: 'bold' },
    statusPresent: { color: COLORS.success },
    statusAbsent: { color: COLORS.danger },
    statusLive: { color: COLORS.accent },
    statusUpcoming: { color: COLORS.textMuted },
});

export default StudentHomeScreen;
