import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, ActivityIndicator, Platform, FlatList, Dimensions } from 'react-native';
import client from '../api/client';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { PieChart } from 'react-native-chart-kit';

const { StorageAccessFramework } = FileSystem;
const screenWidth = Dimensions.get('window').width;

const TeacherAnalyticsScreen = () => {
    // Master Data
    const [teacherClasses, setTeacherClasses] = useState([]);

    // Selection State
    const [selectedDept, setSelectedDept] = useState(null);
    const [selectedBatch, setSelectedBatch] = useState(null);
    const [selectedSemester, setSelectedSemester] = useState(null);
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [selectedSection, setSelectedSection] = useState('A'); // Default hardcoded for now

    // Dropdown Data (Derived)
    const [deptList, setDeptList] = useState([]);
    const [batchList, setBatchList] = useState([]);
    const [semList, setSemList] = useState([]);
    const [subjectList, setSubjectList] = useState([]);

    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [modalType, setModalType] = useState(null); // 'dept', 'batch', 'sem', 'sub'
    const [modalData, setModalData] = useState([]);

    // Date State
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);

    // Report State
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState(null);
    const [stats, setStats] = useState(null);

    useEffect(() => {
        fetchClasses();
    }, []);

    const fetchClasses = async () => {
        try {
            const res = await client.get('/routines/teacher/classes');
            setTeacherClasses(res.data);

            // Extract Unique Depts
            const depts = [...new Set(res.data.map(item => item.dept))];
            setDeptList(depts);
        } catch (error) {
            console.log('Error fetching classes');
            Alert.alert('Error', 'Could not load classes');
        }
    };

    // Cascading Logic
    useEffect(() => {
        if (selectedDept) {
            const batches = [...new Set(teacherClasses
                .filter(item => item.dept === selectedDept)
                .map(item => item.batch))];
            setBatchList(batches);
            setSelectedBatch(null);
            setSelectedSemester(null);
            setSelectedSubject(null);
        }
    }, [selectedDept]);

    useEffect(() => {
        if (selectedBatch) {
            const sems = [...new Set(teacherClasses
                .filter(item => item.dept === selectedDept && item.batch === selectedBatch)
                .map(item => item.semester))];
            setSemList(sems.sort((a, b) => a - b)); // numeric sort
            setSelectedSemester(null);
            setSelectedSubject(null);
        }
    }, [selectedBatch]);

    useEffect(() => {
        if (selectedSemester) {
            const subs = [...new Set(teacherClasses
                .filter(item => item.dept === selectedDept && item.batch === selectedBatch && item.semester === selectedSemester)
                .map(item => item.subject))];
            setSubjectList(subs);
            setSelectedSubject(null);
        }
    }, [selectedSemester]);


    const openModal = (type) => {
        setModalType(type);
        if (type === 'dept') setModalData(deptList);
        else if (type === 'batch') setModalData(batchList);
        else if (type === 'sem') setModalData(semList);
        else if (type === 'sub') setModalData(subjectList);
        setModalVisible(true);
    };

    const handleSelect = (item) => {
        if (modalType === 'dept') setSelectedDept(item);
        else if (modalType === 'batch') setSelectedBatch(item);
        else if (modalType === 'sem') setSelectedSemester(item);
        else if (modalType === 'sub') setSelectedSubject(item);
        setModalVisible(false);
    };

    const generateReport = async () => {
        if (!selectedDept || !selectedBatch || !selectedSemester || !selectedSubject) {
            Alert.alert('Error', 'Please select all fields (Dept, Batch, Sem, Subject)');
            return;
        }

        setLoading(true);
        setReportData(null);
        setStats(null);

        try {
            const payload = {
                dept: selectedDept,
                semester: selectedSemester,
                subject: selectedSubject,
                section: selectedSection, // Default 'A'
                startDate,
                endDate
            };

            const res = await client.post('/attendance/report/generate', payload);
            setReportData(res.data);
            calculateStats(res.data.report);
        } catch (error) {
            Alert.alert('Error', 'Failed to generate report');
            console.log(error);
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (data) => {
        if (!data || data.length === 0) {
            setStats({ present: 0, absent: 0, avgValidation: 0 });
            return;
        }

        let totalPresent = 0;
        let totalClassesExpected = 0;

        data.forEach(student => {
            totalPresent += student.present;
            totalClassesExpected += student.total;
        });

        const totalAbsent = totalClassesExpected - totalPresent;
        const avgPercentage = totalClassesExpected > 0 ? ((totalPresent / totalClassesExpected) * 100).toFixed(1) : 0;

        setStats({ present: totalPresent, absent: totalAbsent, avgValidation: avgPercentage });
    };

    const downloadPdf = async () => {
        if (!reportData) return;

        // Similar to before...
        const html = `
            <html>
            <head>
                <style>
                    body { font-family: Helvetica; padding: 20px; }
                    h1 { color: #4834d4; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                    th { background-color: #f2f2f2; color: #333; }
                    .low-attendance { color: red; font-weight: bold; }
                </style>
            </head>
            <body>
                 <h1>Attendance Analytics</h1>
                <p><strong>Subject:</strong> ${selectedSubject}</p>
                <p><strong>Class:</strong> ${selectedDept} - Sem ${selectedSemester} (Batch ${selectedBatch})</p>
                <p><strong>Date Range:</strong> ${new Date(reportData.range.start).toLocaleDateString()} to ${new Date(reportData.range.end).toLocaleDateString()}</p>
                <p><strong>Total Classes Held:</strong> ${reportData.totalClasses}</p>
                <p><strong>Average Class Attendance:</strong> ${stats ? stats.avgValidation : 0}%</p>
                
                <table>
                    <thead>
                        <tr>
                            <th>Roll No</th>
                            <th>Name</th>
                            <th>Present</th>
                            <th>Percentage</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${reportData.report.map(item => `
                            <tr>
                                <td>${item.rollNumber || '-'}</td>
                                <td>${item.name}</td>
                                <td>${item.present}/${item.total}</td>
                                <td class="${item.percentage < 75 ? 'low-attendance' : ''}">${item.percentage}%</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </body>
            </html>
        `;

        try {
            const { uri } = await Print.printToFileAsync({ html });
            if (Platform.OS === 'android' && StorageAccessFramework) {
                try {
                    const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
                    if (permissions.granted) {
                        const fileName = `Analytics_${selectedSubject}_${new Date().getTime()}.pdf`;
                        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
                        const createdUri = await StorageAccessFramework.createFileAsync(permissions.directoryUri, fileName, 'application/pdf');
                        await FileSystem.writeAsStringAsync(createdUri, base64, { encoding: FileSystem.EncodingType.Base64 });
                        Alert.alert('Success', 'PDF saved!');
                        return;
                    }
                } catch (e) { console.log('SAF Error', e); }
            }
            await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
        } catch (error) {
            Alert.alert('Error', 'Could not generate or share PDF.');
        }
    };

    const RenderDateBtn = ({ date, setShow }) => (
        <TouchableOpacity style={styles.dateBtn} onPress={() => setShow(true)}>
            <Ionicons name="calendar-outline" size={20} color="#666" />
            <Text style={styles.dateText}>{date.toLocaleDateString()}</Text>
        </TouchableOpacity>
    );

    const chartConfig = {
        backgroundGradientFrom: "#ffffff",
        backgroundGradientTo: "#ffffff",
        color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
        strokeWidth: 2,
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.controls}>
                <Text style={styles.headerTitle}>Analytics Filters</Text>

                {/* Dept Selector */}
                <Text style={styles.label}>Department</Text>
                <TouchableOpacity style={styles.selector} onPress={() => openModal('dept')}>
                    <Text style={styles.selectorText}>{selectedDept || 'Select Department'}</Text>
                    <Ionicons name="chevron-down" size={20} color="#666" />
                </TouchableOpacity>

                {/* Batch Selector */}
                <Text style={styles.label}>Batch</Text>
                <TouchableOpacity style={[styles.selector, !selectedDept && styles.disabled]} onPress={() => selectedDept && openModal('batch')} disabled={!selectedDept}>
                    <Text style={styles.selectorText}>{selectedBatch || 'Select Batch'}</Text>
                    <Ionicons name="chevron-down" size={20} color="#666" />
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    {/* Sem Selector */}
                    <View style={{ flex: 1, marginRight: 5 }}>
                        <Text style={styles.label}>Semester</Text>
                        <TouchableOpacity style={[styles.selector, !selectedBatch && styles.disabled]} onPress={() => selectedBatch && openModal('sem')} disabled={!selectedBatch}>
                            <Text style={styles.selectorText}>{selectedSemester ? `Sem ${selectedSemester}` : 'Select'}</Text>
                            <Ionicons name="chevron-down" size={20} color="#666" />
                        </TouchableOpacity>
                    </View>

                    {/* Subject Selector */}
                    <View style={{ flex: 1.5, marginLeft: 5 }}>
                        <Text style={styles.label}>Subject</Text>
                        <TouchableOpacity style={[styles.selector, !selectedSemester && styles.disabled]} onPress={() => selectedSemester && openModal('sub')} disabled={!selectedSemester}>
                            <Text style={styles.selectorText} numberOfLines={1}>{selectedSubject || 'Select Subject'}</Text>
                            <Ionicons name="chevron-down" size={20} color="#666" />
                        </TouchableOpacity>
                    </View>
                </View>

                <Text style={styles.label}>Date Range</Text>
                <View style={styles.dateRow}>
                    <RenderDateBtn date={startDate} setShow={setShowStartPicker} />
                    <Text style={{ marginHorizontal: 10 }}>to</Text>
                    <RenderDateBtn date={endDate} setShow={setShowEndPicker} />
                </View>

                {showStartPicker && (
                    <DateTimePicker value={startDate} mode="date" display="default"
                        onChange={(event, selected) => { setShowStartPicker(Platform.OS === 'ios'); if (selected) setStartDate(selected); }}
                    />
                )}
                {showEndPicker && (
                    <DateTimePicker value={endDate} mode="date" display="default"
                        onChange={(event, selected) => { setShowEndPicker(Platform.OS === 'ios'); if (selected) setEndDate(selected); }}
                    />
                )}

                <TouchableOpacity style={[styles.generateBtn, (!selectedSubject) && { opacity: 0.7 }]} onPress={generateReport} disabled={loading || !selectedSubject}>
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Generate Report</Text>}
                </TouchableOpacity>
            </View>

            {/* Analytics Dashboard */}
            {reportData && stats && (
                <View style={styles.dashboard}>
                    {reportData.report.length === 0 ? (
                        <Text style={styles.noDataText}>No attendance records found.</Text>
                    ) : (
                        <>
                            <Text style={styles.sectionTitle}>Overview</Text>
                            <View style={styles.statsRow}>
                                <View style={[styles.statCard, { backgroundColor: '#e3f2fd' }]}>
                                    <Text style={styles.statLabel}>Avg Attendance</Text>
                                    <Text style={[styles.statValue, { color: '#1976d2' }]}>{stats.avgValidation}%</Text>
                                </View>
                                <View style={[styles.statCard, { backgroundColor: '#e8f5e9' }]}>
                                    <Text style={styles.statLabel}>Total Classes</Text>
                                    <Text style={[styles.statValue, { color: '#2e7d32' }]}>{reportData.totalClasses}</Text>
                                </View>
                            </View>

                            <ScrollView horizontal={true} contentContainerStyle={{ alignItems: 'center', width: '100%' }}>
                                <PieChart
                                    data={[
                                        { name: "Present", population: stats.present, color: "#4caf50", legendFontColor: "#7F7F7F", legendFontSize: 14 },
                                        { name: "Absent", population: stats.absent, color: "#f44336", legendFontColor: "#7F7F7F", legendFontSize: 14 }
                                    ]}
                                    width={screenWidth - 40}
                                    height={200}
                                    chartConfig={chartConfig}
                                    accessor={"population"}
                                    backgroundColor={"transparent"}
                                    paddingLeft={"15"}
                                    absolute
                                />
                            </ScrollView>

                            <View style={styles.resultHeader}>
                                <Text style={styles.sectionTitle}>Student Details</Text>
                                <TouchableOpacity style={styles.downloadIconBtn} onPress={downloadPdf}>
                                    <Ionicons name="download-outline" size={24} color="#4834d4" />
                                    <Text style={styles.downloadText}>PDF</Text>
                                </TouchableOpacity>
                            </View>

                            {reportData.report.map((item, index) => (
                                <View key={item.studentId} style={styles.row}>
                                    <View style={{ flex: 2 }}>
                                        <Text style={styles.name}>{index + 1}. {item.name}</Text>
                                        <Text style={styles.roll}>{item.rollNumber}</Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={styles.present}>{item.present}/{item.total}</Text>
                                        <Text style={[styles.percentage, { color: item.percentage < 75 ? 'red' : 'green' }]}>{item.percentage}%</Text>
                                    </View>
                                </View>
                            ))}
                        </>
                    )}
                </View>
            )}

            <Modal animationType="fade" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Select Option</Text>
                        <FlatList
                            data={modalData}
                            keyExtractor={(item, index) => index.toString()}
                            renderItem={({ item }) => (
                                <TouchableOpacity style={styles.modalItem} onPress={() => handleSelect(item)}>
                                    <Text style={styles.modalItemText}>{item}</Text>
                                </TouchableOpacity>
                            )}
                        />
                        <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                            <Text style={styles.closeBtnText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fa', padding: 15 },
    controls: { backgroundColor: '#fff', padding: 15, borderRadius: 12, elevation: 2, marginBottom: 15 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 15 },
    label: { fontSize: 13, color: '#666', marginBottom: 5, fontWeight: '600' },
    selector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f5f5f5', padding: 12, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#eee' },
    disabled: { opacity: 0.5, backgroundColor: '#eee' },
    selectorText: { fontSize: 15, color: '#333' },

    dateRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    dateBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', padding: 10, borderRadius: 8, justifyContent: 'center', borderWidth: 1, borderColor: '#eee' },
    dateText: { marginLeft: 5, fontWeight: '600', color: '#444' },

    generateBtn: { backgroundColor: '#4834d4', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
    btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

    dashboard: { backgroundColor: '#fff', borderRadius: 12, padding: 15, elevation: 2, marginBottom: 30 },
    noDataText: { textAlign: 'center', marginVertical: 20, color: '#888', fontStyle: 'italic' },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#333' },

    statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    statCard: { flex: 1, padding: 15, borderRadius: 10, marginHorizontal: 5, alignItems: 'center' },
    statLabel: { fontSize: 12, color: '#666', marginBottom: 5 },
    statValue: { fontSize: 20, fontWeight: 'bold' },

    resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, marginTop: 10, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 15 },
    downloadIconBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e3f2fd', padding: 5, borderRadius: 5, paddingHorizontal: 10 },
    downloadText: { marginLeft: 5, color: '#4834d4', fontWeight: 'bold', fontSize: 12 },

    row: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f9f9f9', alignItems: 'center', justifyContent: 'space-between' },
    name: { fontWeight: '600', fontSize: 15, color: '#333' },
    roll: { fontSize: 12, color: '#666' },
    present: { fontSize: 14, color: '#444', textAlign: 'right' },
    percentage: { fontWeight: 'bold', fontSize: 15, textAlign: 'right' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: 'white', borderRadius: 15, padding: 20, maxHeight: 400 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
    modalItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee', alignItems: 'center' },
    modalItemText: { fontSize: 16, color: '#333' },
    closeBtn: { marginTop: 15, padding: 12, alignItems: 'center', backgroundColor: '#f0f0f0', borderRadius: 8 },
    closeBtnText: { fontWeight: 'bold', color: '#666' }
});

export default TeacherAnalyticsScreen;
