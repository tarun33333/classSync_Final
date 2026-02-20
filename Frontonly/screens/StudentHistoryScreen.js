import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar } from 'react-native-calendars';
import client from '../api/client';
import { formatTime } from '../utils/timeUtils';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const StudentHistoryScreen = () => {
    const { colors: COLORS, gradient: GRADIENT, isDark } = useTheme();
    const styles = getStyles(COLORS, GRADIENT, isDark);

    const [history, setHistory] = useState([]);
    const [markedDates, setMarkedDates] = useState({});
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [dailyHistory, setDailyHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchHistory(); }, []);
    useEffect(() => { if (history.length > 0) filterHistoryByDate(selectedDate); }, [selectedDate, history]);

    const fetchHistory = async () => {
        try {
            const res = await client.get('/attendance/student');
            setHistory(res.data);
            const marks = {};
            res.data.forEach(item => {
                const dateRaw = item.timestamp || (item.session?.startTime) || item.createdAt;
                const date = dateRaw.split('T')[0];
                marks[date] = { marked: true, dotColor: item.status === 'present' ? COLORS.success : COLORS.danger };
            });
            setMarkedDates(marks);
        } catch { }
        finally { setLoading(false); }
    };

    const filterHistoryByDate = (date) => {
        setDailyHistory(history.filter(item => {
            const raw = item.timestamp || item.session?.startTime || item.createdAt;
            return raw.split('T')[0] === date;
        }));
    };

    const renderItem = ({ item }) => (
        <View style={[styles.card, { borderLeftColor: item.status === 'present' ? COLORS.success : COLORS.danger }]}>
            <View>
                <Text style={styles.subject}>{item.session?.subject || 'Archived Class'}</Text>
                <Text style={styles.time}>{formatTime(item.session?.startTime || item.createdAt)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
                <View style={[styles.badge, { backgroundColor: item.status === 'present' ? COLORS.successBg : COLORS.dangerBg }]}>
                    <Text style={[styles.statusText, { color: item.status === 'present' ? COLORS.success : COLORS.danger }]}>
                        {item.status.toUpperCase()}
                    </Text>
                </View>
                {item.method && <Text style={styles.method}>via {item.method.toUpperCase()}</Text>}
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={[styles.root, styles.center]}>
                <LinearGradient colors={GRADIENT} style={StyleSheet.absoluteFill} />
                <ActivityIndicator color={COLORS.accent} size="large" />
            </View>
        );
    }

    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
            <LinearGradient colors={GRADIENT} style={StyleSheet.absoluteFill} />

            <FlatList
                data={dailyHistory}
                keyExtractor={item => item._id}
                renderItem={renderItem}
                ListHeaderComponent={() => (
                    <View>
                        <Text style={styles.pageTitle}>History Calendar</Text>
                        <View style={styles.calendarWrapper}>
                            <Calendar
                                onDayPress={day => setSelectedDate(day.dateString)}
                                markedDates={{
                                    ...markedDates,
                                    [selectedDate]: { selected: true, selectedColor: COLORS.accent },
                                }}
                                theme={{
                                    backgroundColor: 'transparent',
                                    calendarBackground: 'transparent',
                                    textSectionTitleColor: COLORS.textSecondary,
                                    selectedDayBackgroundColor: COLORS.accent,
                                    selectedDayTextColor: '#fff',
                                    todayTextColor: COLORS.accent,
                                    dayTextColor: COLORS.textPrimary,
                                    textDisabledColor: COLORS.textMuted,
                                    dotColor: COLORS.accent,
                                    arrowColor: COLORS.accent,
                                    monthTextColor: COLORS.textPrimary,
                                    textDayFontWeight: '500',
                                    textMonthFontWeight: 'bold',
                                }}
                            />
                        </View>
                        <Text style={styles.subtitle}>Records for {selectedDate}</Text>
                    </View>
                )}
                ListEmptyComponent={
                    <View style={styles.emptyBox}>
                        <Ionicons name="calendar-outline" size={36} color={COLORS.textMuted} />
                        <Text style={styles.noData}>No classes recorded for this date.</Text>
                    </View>
                }
                contentContainerStyle={styles.list}
            />
        </View>
    );
};

const getStyles = (COLORS, GRADIENT, isDark) => StyleSheet.create({
    root: { flex: 1, backgroundColor: COLORS.bg },
    center: { justifyContent: 'center', alignItems: 'center' },
    list: { padding: 16, paddingBottom: 40 },
    pageTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 16 },
    calendarWrapper: { backgroundColor: COLORS.bgCard, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border, marginBottom: 20 },
    subtitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 14 },
    card: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.bgCard, padding: 14, marginBottom: 10, borderRadius: 12, borderLeftWidth: 4, borderWidth: 1, borderColor: COLORS.border },
    subject: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
    time: { color: COLORS.textSecondary, marginTop: 3, fontSize: 13 },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontWeight: 'bold', fontSize: 12 },
    method: { fontSize: 11, color: COLORS.textMuted, marginTop: 3 },
    emptyBox: { alignItems: 'center', paddingVertical: 30 },
    noData: { color: COLORS.textMuted, marginTop: 10, fontStyle: 'italic' },
});

export default StudentHistoryScreen;
