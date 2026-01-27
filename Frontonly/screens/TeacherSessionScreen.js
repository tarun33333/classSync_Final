import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, FlatList, Alert } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import client from '../api/client';

const TeacherSessionScreen = ({ route, navigation }) => {
    const { session } = route.params;
    const [attendanceList, setAttendanceList] = useState([]);
    const [refreshInterval, setRefreshInterval] = useState(null);
    const [qrInterval, setQrInterval] = useState(null);
    const [qrValue, setQrValue] = useState(session.qrCode);

    useEffect(() => {
        fetchAttendance();
        const interval = setInterval(fetchAttendance, 5000); // Poll attendance every 5s
        setRefreshInterval(interval);

        // Dynamic QR Rotation
        const qrTimer = setInterval(refreshQr, 5000); // Rotate QR every 5s
        setQrInterval(qrTimer);

        return () => {
            clearInterval(interval);
            clearInterval(qrTimer);
        };
    }, []);

    const fetchAttendance = async () => {
        try {
            const res = await client.get(`/attendance/session/${session._id}`);
            setAttendanceList(res.data);
        } catch (error) {
            console.log('Error fetching attendance');
        }
    };

    const refreshQr = async () => {
        try {
            const res = await client.post('/sessions/refresh-qr', { sessionId: session._id });
            setQrValue(res.data.qrCode);
            console.log('QR Code Rotated:', res.data.qrCode);
        } catch (error) {
            console.log('Error rotating QR:', error);
        }
    };

    const endSession = async () => {
        try {
            console.log('Ending session:', session._id);
            const res = await client.post('/sessions/end', { sessionId: session._id });
            console.log('Session ended response:', res.data);
            clearInterval(refreshInterval);
            clearInterval(qrInterval);
            navigation.navigate('TeacherMain');
        } catch (error) {
            console.error('End Session Error:', error);
            if (error.response) {
                console.log('End Session Error Data:', error.response.data);
                console.log('End Session Error Status:', error.response.status);
            }
            const errorMessage = error.response?.data?.message || 'Failed to end session';
            Alert.alert('Error', errorMessage);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Session Active: {session.subject}</Text>

            <View style={styles.infoBox}>
                <Text style={styles.infoText}>OTP: {session.otp}</Text>
                <View style={styles.qrContainer}>
                    <QRCode value={qrValue} size={150} />
                </View>
                <Text style={styles.infoText}>Scan to Mark Attendance</Text>
                <Text style={{ color: 'gray', fontSize: 12 }}>QR rotates every 5s</Text>
            </View>

            <Text style={styles.subHeader}>Live Attendance ({attendanceList.length})</Text>
            <FlatList
                data={attendanceList}
                keyExtractor={(item) => item.student._id}
                renderItem={({ item }) => (
                    <View style={styles.listItem}>
                        <Text>{item.student.name} ({item.student.rollNumber})</Text>
                        <Text style={[styles.method, { color: item.status === 'present' ? 'green' : 'red' }]}>
                            {item.status === 'present' ? item.method.toUpperCase() : 'ABSENT'}
                        </Text>
                    </View>
                )}
            />

            <Button title="End Session" onPress={endSession} color="red" />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20 },
    header: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    infoBox: { alignItems: 'center', marginBottom: 20, padding: 10, borderWidth: 1, borderColor: '#ddd' },
    infoText: { fontSize: 20, fontWeight: 'bold', marginVertical: 10 },
    qrContainer: { marginVertical: 10 },
    subHeader: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
    listItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
    method: { fontWeight: 'bold', color: 'green' }
});

export default TeacherSessionScreen;
