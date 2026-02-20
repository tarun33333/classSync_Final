import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, Dimensions,
    RefreshControl, TouchableOpacity, Alert, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PieChart, LineChart } from 'react-native-chart-kit';
import client from '../api/client';
import { useTheme } from '../context/ThemeContext';

const screenWidth = Dimensions.get('window').width;

const CHART_COLORS = ['#7c6af7', '#26D0CE', '#f59e0b', '#f87171', '#4ade80', '#aa4b6b'];

const StudentSummaryScreen = () => {
    const { colors: COLORS, gradient: GRADIENT, isDark } = useTheme();
    const styles = getStyles(COLORS, GRADIENT, isDark);

    const [stats, setStats] = useState([]);
    const [graphData, setGraphData] = useState([]);
    const [selectedSem, setSelectedSem] = useState(null);
    const [userCurrentSem, setUserCurrentSem] = useState(1);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => { fetchStats(); }, [selectedSem]);

    const fetchStats = async () => {
        try {
            const url = selectedSem ? `/attendance/stats?semester=${selectedSem}` : '/attendance/stats';
            const res = await client.get(url);
            const chartData = res.data.stats.map((item, i) => ({
                name: item._id,
                population: item.presentCount,
                color: CHART_COLORS[i % CHART_COLORS.length],
                legendFontColor: COLORS.textSecondary,
                legendFontSize: 13,
            }));
            setStats(chartData);
            if (res.data.graphData) {
                setGraphData(res.data.graphData.sort((a, b) => a.semester - b.semester));
            }
            if (!selectedSem) {
                setUserCurrentSem(res.data.currentSemester);
                setSelectedSem(res.data.currentSemester);
            }
        } catch { }
    };

    const onRefresh = async () => { setRefreshing(true); await fetchStats(); setRefreshing(false); };

    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
            <LinearGradient colors={GRADIENT} style={StyleSheet.absoluteFill} />

            <ScrollView
                style={styles.scroll}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} colors={[COLORS.accent]} />
                }
            >
                <Text style={styles.pageTitle}>Academic Performance</Text>

                {/* Line Chart */}
                <View style={styles.chartCard}>
                    <Text style={styles.chartTitle}>Semester Trends</Text>
                    {graphData.length > 0 ? (
                        <LineChart
                            data={{
                                labels: graphData.map(g => `S${g.semester}`),
                                datasets: [{ data: graphData.map(g => g.percentage) }],
                            }}
                            width={screenWidth - 64}
                            height={200}
                            yAxisSuffix="%"
                            chartConfig={{
                                backgroundColor: 'transparent',
                                backgroundGradientFrom: COLORS.bgMid,
                                backgroundGradientTo: COLORS.bgMid,
                                decimalPlaces: 0,
                                color: (opacity = 1) => `rgba(124,106,247,${opacity})`,
                                labelColor: () => COLORS.textSecondary,
                                propsForDots: { r: '5', strokeWidth: '2', stroke: COLORS.accent },
                                propsForBackgroundLines: { stroke: COLORS.border },
                            }}
                            bezier
                            style={{ borderRadius: 12 }}
                            onDataPointClick={({ value, index }) => {
                                Alert.alert('Semester Performance', `Semester ${graphData[index].semester}: ${value}%`);
                            }}
                        />
                    ) : (
                        <Text style={styles.noData}>Not enough data for trends.</Text>
                    )}
                </View>

                {/* Semester Selector */}
                <View style={styles.selectorRow}>
                    <Text style={styles.selectorLabel}>Semester:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {Array.from({ length: userCurrentSem }, (_, i) => i + 1).map(sem => (
                            <TouchableOpacity
                                key={sem}
                                style={[styles.semBtn, selectedSem === sem && styles.semBtnActive]}
                                onPress={() => setSelectedSem(sem)}
                            >
                                <Text style={[styles.semText, selectedSem === sem && styles.semTextActive]}>
                                    Sem {sem}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Pie Chart */}
                <View style={styles.chartCard}>
                    <Text style={styles.chartTitle}>Subject Breakdown (Sem {selectedSem})</Text>
                    {stats.length > 0 ? (
                        <PieChart
                            data={stats}
                            width={screenWidth - 64}
                            height={200}
                            chartConfig={{ color: () => COLORS.accent }}
                            accessor="population"
                            backgroundColor="transparent"
                            paddingLeft="10"
                            absolute
                        />
                    ) : (
                        <Text style={styles.noData}>No attendance recorded for Semester {selectedSem}.</Text>
                    )}
                </View>

                {/* Summary */}
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryText}>
                        Total Classes Attended (Sem {selectedSem}):{' '}
                        <Text style={styles.summaryCount}>
                            {stats.reduce((acc, curr) => acc + curr.population, 0)}
                        </Text>
                    </Text>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
};

const getStyles = (COLORS, GRADIENT, isDark) => StyleSheet.create({
    root: { flex: 1, backgroundColor: COLORS.bg },
    scroll: { flex: 1, padding: 20 },
    pageTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 20, textAlign: 'center' },
    chartCard: { backgroundColor: COLORS.bgCard, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 20, alignItems: 'center' },
    chartTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 14, alignSelf: 'flex-start' },
    noData: { color: COLORS.textMuted, marginVertical: 20, textAlign: 'center' },
    selectorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 12 },
    selectorLabel: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary },
    semBtn: { backgroundColor: COLORS.bgCard, paddingVertical: 8, paddingHorizontal: 18, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: COLORS.border },
    semBtnActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
    semText: { color: COLORS.textSecondary, fontWeight: '600', fontSize: 13 },
    semTextActive: { color: '#fff' },
    summaryCard: { backgroundColor: COLORS.accentLight, borderRadius: 14, padding: 18, alignItems: 'center', borderWidth: 1, borderColor: COLORS.borderAccent },
    summaryText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '500' },
    summaryCount: { fontSize: 16, fontWeight: 'bold', color: COLORS.accent },
});

export default StudentSummaryScreen;
