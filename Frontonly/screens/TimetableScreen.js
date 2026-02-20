import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SectionList, ActivityIndicator, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import client from '../api/client';
import { formatTime } from '../utils/timeUtils';
import { useTheme } from '../context/ThemeContext';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const TimetableScreen = ({ route }) => {
    const { colors: COLORS, gradient: GRADIENT, isDark } = useTheme();
    const styles = getStyles(COLORS, GRADIENT, isDark);

    const { role } = route.params;
    const [timetable, setTimetable] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchTimetable(); }, []);

    const fetchTimetable = async () => {
        try {
            const endpoint = role === 'teacher' ? '/routines/teacher/full' : '/routines/student/full';
            const res = await client.get(endpoint);
            const grouped = DAYS.map(day => ({
                title: day,
                data: res.data.filter(i => i.day === day).sort((a, b) => a.startTime.localeCompare(b.startTime)),
            })).filter(s => s.data.length > 0);
            setTimetable(grouped);
        } catch { }
        finally { setLoading(false); }
    };

    const renderItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.timeCol}>
                <Text style={styles.startTime}>{formatTime(item.startTime)}</Text>
                <View style={styles.timeLine} />
                <Text style={styles.endTime}>{formatTime(item.endTime)}</Text>
            </View>
            <View style={styles.infoCol}>
                <Text style={styles.subject}>{item.subject}</Text>
                {role === 'student' && (
                    <Text style={styles.detail}>Teacher: {item.teacher?.name || 'Faculty'}</Text>
                )}
                {role === 'teacher' && (
                    <Text style={styles.detail}>{item.dept} · {item.batch}</Text>
                )}
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={[styles.root, styles.center]}>
                <LinearGradient colors={GRADIENT} style={StyleSheet.absoluteFill} />
                <ActivityIndicator size="large" color={COLORS.accent} />
            </View>
        );
    }

    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
            <LinearGradient colors={GRADIENT} style={StyleSheet.absoluteFill} />
            <SectionList
                sections={timetable}
                keyExtractor={(item, i) => i.toString()}
                renderItem={renderItem}
                renderSectionHeader={({ section: { title } }) => (
                    <View style={styles.dayHeader}>
                        <Text style={styles.dayText}>{title}</Text>
                    </View>
                )}
                ListHeaderComponent={<Text style={styles.pageTitle}>Weekly Schedule</Text>}
                ListEmptyComponent={<Text style={styles.noData}>No schedule found.</Text>}
                contentContainerStyle={styles.list}
            />
        </View>
    );
};

const getStyles = (COLORS, GRADIENT, isDark) => StyleSheet.create({
    root: { flex: 1, backgroundColor: COLORS.bg },
    center: { justifyContent: 'center', alignItems: 'center' },
    list: { padding: 16, paddingBottom: 40 },
    pageTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 12 },
    dayHeader: { backgroundColor: COLORS.accentLight, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, marginBottom: 8, marginTop: 10, borderWidth: 1, borderColor: COLORS.borderAccent },
    dayText: { fontSize: 15, fontWeight: '700', color: COLORS.accent },
    card: { flexDirection: 'row', backgroundColor: COLORS.bgCard, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
    timeCol: { alignItems: 'center', marginRight: 16, width: 55 },
    startTime: { fontSize: 13, fontWeight: 'bold', color: COLORS.textPrimary },
    timeLine: { width: 1, height: 14, backgroundColor: COLORS.border, marginVertical: 3 },
    endTime: { fontSize: 11, color: COLORS.textSecondary },
    infoCol: { flex: 1 },
    subject: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 3 },
    detail: { fontSize: 12, color: COLORS.textSecondary },
    noData: { textAlign: 'center', marginTop: 50, color: COLORS.textMuted, fontSize: 15 },
});

export default TimetableScreen;
