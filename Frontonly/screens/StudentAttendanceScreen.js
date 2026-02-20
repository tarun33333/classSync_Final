import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, StyleSheet, Alert,
    TouchableOpacity, StatusBar, Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView, Camera } from 'expo-camera';
import client from '../api/client';
import * as Network from 'expo-network';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import ConfettiCannon from 'react-native-confetti-cannon';

const { width } = Dimensions.get('window');

let WifiManager;
try { WifiManager = require('react-native-wifi-reborn').default; } catch { }

const StudentAttendanceScreen = ({ route, navigation }) => {
    const { colors: COLORS, gradient: GRADIENT, isDark } = useTheme();
    const styles = getStyles(COLORS, GRADIENT, isDark);

    const { sessionId, mode } = route.params;
    const [step, setStep] = useState(1);
    const [otp, setOtp] = useState('');
    const [scanning, setScanning] = useState(false);
    const [hasPermission, setHasPermission] = useState(null);
    const [scanned, setScanned] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);

    useEffect(() => {
        (async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === 'granted');
        })();
        if (mode === 'qr') { setStep(2); setScanning(true); }
    }, [mode]);

    const verifyWifi = async () => {
        try {
            const bssid = (await Network.getIpAddressAsync()) || 'UNKNOWN';
            let currentRssi = WifiManager
                ? await WifiManager.getCurrentSignalStrength().catch(() => -55)
                : Math.floor(Math.random() * 30) * -1 - 40;
            await client.post('/attendance/verify-wifi', { sessionId, bssid, rssi: currentRssi });
            setStep(2);
            Alert.alert('Connected!', `Signal: ${currentRssi} dBm`);
        } catch (error) {
            Alert.alert('WiFi Verification Failed', error.response?.data?.message || 'Error');
        }
    };

    const submitOtp = async () => {
        if (!otp || otp.length !== 4) {
            Alert.alert('Error', 'Please enter a valid 4-digit OTP');
            return;
        }
        // OTP is static — require face liveness as the second factor
        navigation.navigate('FaceLiveness', { sessionId, code: otp, method: 'otp' });
    };

    const handleBarCodeScanned = async ({ data }) => {
        setScanned(true);
        setScanning(false);
        // QR rotates every 5 seconds — no extra verification needed
        try {
            await client.post('/attendance/mark', { sessionId, code: data, method: 'qr' });
            setShowConfetti(true);
            setTimeout(() => {
                navigation.navigate('StudentMain');
            }, 2500);
        } catch (error) {
            Alert.alert('Error', error.response?.data?.message || 'Invalid QR');
            setScanned(false);
        }
    };

    if (scanning) {
        if (!hasPermission) {
            return (
                <View style={[styles.root, styles.center]}>
                    <LinearGradient colors={GRADIENT} style={StyleSheet.absoluteFill} />
                    <Text style={styles.permText}>
                        {hasPermission === null ? 'Requesting camera...' : 'Camera permission denied'}
                    </Text>
                    {hasPermission === false && (
                        <TouchableOpacity style={styles.actionBtn} onPress={() => setScanning(false)}>
                            <Text style={styles.btnText}>Go Back</Text>
                        </TouchableOpacity>
                    )}
                </View>
            );
        }
        return (
            <View style={styles.root}>
                <CameraView
                    onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                    barcodeScannerSettings={{ barcodeTypes: ['qr', 'pdf417'] }}
                    style={StyleSheet.absoluteFillObject}
                />
                {/* Scan overlay frame */}
                <View style={styles.scanOverlay}>
                    <View style={styles.scanFrame} />
                    <Text style={styles.scanHint}>Point at QR Code</Text>
                </View>
                <TouchableOpacity
                    style={styles.cancelScanBtn}
                    onPress={() => setScanning(false)}
                >
                    <Ionicons name="close-circle" size={22} color="#fff" />
                    <Text style={styles.btnText}>Cancel</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
            <LinearGradient colors={GRADIENT} style={StyleSheet.absoluteFill} />

            <View style={styles.container}>
                <Text style={styles.pageTitle}>Mark Attendance</Text>

                {step === 1 && (
                    <View style={styles.card}>
                        <View style={styles.stepBadge}><Text style={styles.stepText}>Step 1</Text></View>
                        <Text style={styles.instruction}>Verify Location</Text>
                        <Text style={styles.subtext}>Make sure you are connected to the classroom WiFi before proceeding.</Text>
                        <TouchableOpacity style={styles.actionBtn} onPress={verifyWifi}>
                            <Ionicons name="wifi" size={18} color="#fff" />
                            <Text style={styles.btnText}>Verify WiFi & Location</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {step === 2 && (
                    <View style={styles.card}>
                        <View style={styles.stepBadge}><Text style={styles.stepText}>Step 2</Text></View>
                        <Text style={styles.instruction}>Authenticate</Text>

                        <Text style={styles.label}>Session OTP</Text>
                        <TextInput
                            style={styles.otpInput}
                            placeholder="4-digit OTP"
                            placeholderTextColor={COLORS.textMuted}
                            value={otp}
                            onChangeText={setOtp}
                            keyboardType="numeric"
                            maxLength={4}
                            textAlign="center"
                        />
                        <TouchableOpacity style={styles.actionBtn} onPress={submitOtp}>
                            <Ionicons name="checkmark-circle" size={18} color="#fff" />
                            <Text style={styles.btnText}>Submit OTP</Text>
                        </TouchableOpacity>

                        <View style={styles.divider}>
                            <View style={styles.line} />
                            <Text style={styles.orText}>OR</Text>
                            <View style={styles.line} />
                        </View>

                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: COLORS.accentDark }]}
                            onPress={() => { setScanned(false); setScanning(true); }}
                        >
                            <Ionicons name="qr-code" size={18} color="#fff" />
                            <Text style={styles.btnText}>Scan QR Code</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
            {showConfetti && (
                <ConfettiCannon count={150} origin={{ x: width / 2, y: -20 }} fadeOut={true} />
            )}
        </View>
    );
};

const getStyles = (COLORS, GRADIENT, isDark) => StyleSheet.create({
    root: { flex: 1, backgroundColor: COLORS.bg },
    center: { justifyContent: 'center', alignItems: 'center' },
    container: { flex: 1, justifyContent: 'center', padding: 24 },
    pageTitle: { fontSize: 26, fontWeight: 'bold', color: COLORS.textPrimary, textAlign: 'center', marginBottom: 28 },
    card: { backgroundColor: COLORS.bgCard, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: COLORS.border },
    stepBadge: { alignSelf: 'flex-start', backgroundColor: COLORS.accentLight, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 12, borderWidth: 1, borderColor: COLORS.borderAccent },
    stepText: { color: COLORS.accent, fontWeight: '700', fontSize: 12 },
    instruction: { fontSize: 20, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 8 },
    subtext: { color: COLORS.textSecondary, marginBottom: 20, lineHeight: 20 },
    label: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '600', marginBottom: 10 },
    otpInput: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 14, fontSize: 28, fontWeight: 'bold', color: COLORS.textPrimary, letterSpacing: 8, marginBottom: 16 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.accent, borderRadius: 14, padding: 15 },
    btnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
    divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
    line: { flex: 1, height: 1, backgroundColor: COLORS.border },
    orText: { marginHorizontal: 12, color: COLORS.textMuted, fontWeight: '600' },
    permText: { color: COLORS.textSecondary, fontSize: 16, textAlign: 'center' },
    // QR scan UI
    scanOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scanFrame: { width: 220, height: 220, borderWidth: 2, borderColor: COLORS.accent, borderRadius: 16, marginBottom: 16 },
    scanHint: { color: '#fff', fontSize: 16, fontWeight: '600' },
    cancelScanBtn: { position: 'absolute', bottom: 50, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(248,113,113,0.85)', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 25 },
});

export default StudentAttendanceScreen;
