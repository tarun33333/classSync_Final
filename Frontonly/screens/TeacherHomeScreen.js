import React, { useContext, useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, Alert, FlatList,
    TouchableOpacity, StatusBar, Animated
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../context/AuthContext';
import client from '../api/client';
import * as Network from 'expo-network';
import { formatTime } from '../utils/timeUtils';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const TeacherHomeScreen = ({ navigation }) => {
    const { colors: COLORS, gradient: GRADIENT, isDark } = useTheme();
    const styles = getStyles(COLORS, GRADIENT, isDark);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning ☕';
        if (hour < 17) return 'Good Afternoon ☀️';
        if (hour < 21) return 'Good Evening 🌇';
        return 'Good Night 🌙';
    };

    const { userInfo } = useContext(AuthContext);
    const [routines, setRoutines] = useState([]);

    const [showIntro, setShowIntro] = useState(true);
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const scaleAnim = useRef(new Animated.Value(0.9)).current;

    useEffect(() => {
        Animated.sequence([
            Animated.timing(scaleAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.delay(1000),
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
                Animated.timing(scaleAnim, { toValue: 1.1, duration: 500, useNativeDriver: true })
            ])
        ]).start(() => setShowIntro(false));
    }, []);

    const [now, setNow] = useState(new Date());

    useEffect(() => {
        fetchRoutines();
        const timer = setInterval(() => setNow(new Date()), 10000);
        return () => clearInterval(timer);
    }, []);

    const fetchRoutines = async () => {
        try {
            const res = await client.get('/routines/teacher');
            setRoutines(res.data);
        } catch (error) { }
    };

    const startSession = async (routine) => {
        try {
            const { isConnected } = await Network.getNetworkStateAsync();
            if (!isConnected) { Alert.alert('Error', 'No internet connection'); return; }
            const ipAddress = await Network.getIpAddressAsync();
            const sessionData = {
                subject: routine.subject,
                section: routine.section || 'A',
                batch: routine.batch,
                dept: routine.dept,
                semester: routine.semester,
                periodNo: routine.periodNo,
                day: routine.day,
                startTime: routine.startTime,
                endTime: routine.endTime,
                bssid: ipAddress || 'UNKNOWN',
                ssid: 'ClassWiFi',
            };
            const res = await client.post('/sessions/start', sessionData);
            navigation.navigate('TeacherSession', { session: res.data });
        } catch (error) {
            const msg = error.response?.data?.message || error.message || 'Failed to start session';
            Alert.alert('Error', msg);
        }
    };

    const isCurrentPeriod = (start, end) => {
        const cur = now.getHours() * 60 + now.getMinutes();
        const [sh, sm] = start.split(':').map(Number);
        const [eh, em] = end.split(':').map(Number);
        return cur >= sh * 60 + sm && cur < eh * 60 + em;
    };

    const todayRoutines = routines.filter(
        r => r.day === new Date().toLocaleDateString('en-US', { weekday: 'long' })
    );

    const renderRoutine = ({ item }) => {
        const canStart = isCurrentPeriod(item.startTime, item.endTime);
        return (
            <View style={[styles.card, canStart && styles.cardActive]}>
                <View style={styles.cardLeft}>
                    {canStart && <View style={styles.liveDot} />}
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={styles.subject}>{item.subject}</Text>
                            {canStart && (
                                <View style={styles.nowBadge}>
                                    <Text style={styles.nowBadgeText}>NOW</Text>
                                </View>
                            )}
                        </View>
                        <Text style={styles.details}>
                            {item.section} · {item.day} · {formatTime(item.startTime)} – {formatTime(item.endTime)}
                        </Text>
                    </View>
                </View>
                {canStart ? (
                    <TouchableOpacity style={styles.startBtn} onPress={() => startSession(item)}>
                        <Ionicons name="play-circle" size={18} color="#fff" />
                        <Text style={styles.startBtnText}>Start</Text>
                    </TouchableOpacity>
                ) : (
                    <Ionicons name="time-outline" size={20} color={COLORS.textMuted} />
                )}
            </View>
        );
    };

    const quickActions = [
        { label: 'Weekly Schedule', icon: 'calendar-outline', screen: 'Timetable', params: { role: 'teacher' }, color: COLORS.accent },
        { label: 'Notice Board', icon: 'megaphone-outline', screen: 'Announcements', params: { role: 'teacher' }, color: '#aa4b6b' },
        { label: 'AI Quiz', icon: 'sparkles-outline', screen: 'QuizGen', color: '#f59e0b' },
        ...(userInfo?.isAdvisor ? [{ label: 'Advisor Dashboard', icon: 'people-outline', screen: 'AdvisorDashboard', color: '#26D0CE' }] : []),
    ];

    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
            <LinearGradient colors={GRADIENT} style={StyleSheet.absoluteFill} />

            <FlatList
                data={todayRoutines}
                keyExtractor={(item, i) => item._id || `${item.subject}-${i}`}
                renderItem={renderRoutine}
                ListHeaderComponent={() => (
                    <View style={styles.header}>
                        {/* Greeting */}
                        <Text style={styles.greeting}>{getGreeting()}</Text>
                        <Text style={styles.name}>{userInfo?.name}</Text>
                        <Text style={styles.subtitle}>Your Schedule</Text>

                        {/* Quick Actions */}
                        <View style={styles.quickGrid}>
                            {quickActions.map(item => (
                                <TouchableOpacity
                                    key={item.screen}
                                    style={styles.quickCard}
                                    onPress={() => navigation.navigate(item.screen, item.params)}
                                >
                                    <View style={[styles.quickIcon, { backgroundColor: item.color + '33' }]}>
                                        <Ionicons name={item.icon} size={22} color={item.color} />
                                    </View>
                                    <Text style={styles.quickLabel}>{item.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.sectionTitle}>Today's Classes</Text>
                    </View>
                )}
                ListEmptyComponent={
                    <View style={styles.emptyBox}>
                        <Ionicons name="cafe-outline" size={36} color={COLORS.textMuted} />
                        <Text style={styles.noData}>No classes today.</Text>
                    </View>
                }
                contentContainerStyle={styles.list}
            />

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
    list: { padding: 20, paddingBottom: 40 },
    header: { marginBottom: 4 },
    greeting: { fontSize: 15, color: COLORS.textSecondary, marginTop: 10 },
    name: { fontSize: 26, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4 },
    subtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 20 },
    quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 },
    quickCard: { width: '47%', backgroundColor: COLORS.bgCard, borderRadius: 14, padding: 16, alignItems: 'flex-start', borderWidth: 1, borderColor: COLORS.border },
    quickIcon: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    quickLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
    sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 14 },
    card: { backgroundColor: COLORS.bgCard, borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    cardActive: { borderColor: COLORS.borderAccent, borderLeftWidth: 4, borderLeftColor: COLORS.accent, backgroundColor: COLORS.accentLight },
    cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
    liveDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: COLORS.danger, marginTop: 2 },
    nowBadge: { backgroundColor: COLORS.danger, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
    nowBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
    subject: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 3 },
    details: { fontSize: 13, color: COLORS.textSecondary },
    startBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.accent, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
    startBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
    emptyBox: { alignItems: 'center', paddingVertical: 30 },
    noData: { color: COLORS.textMuted, marginTop: 10, fontSize: 14 },
});

export default TeacherHomeScreen;
