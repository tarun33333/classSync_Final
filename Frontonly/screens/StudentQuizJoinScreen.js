import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    Alert, ActivityIndicator, StatusBar, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import client from '../api/client';
import { useTheme } from '../context/ThemeContext';

const StudentQuizJoinScreen = ({ navigation }) => {
    const { colors: COLORS, gradient: GRADIENT, isDark } = useTheme();
    const styles = getStyles(COLORS, GRADIENT, isDark);

    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);

    const handleJoin = async () => {
        if (!code) { Alert.alert('Error', 'Please enter a code'); return; }
        setLoading(true);
        try {
            const res = await client.post('/quiz/join', { code });
            navigation.navigate('StudentQuiz', { quiz: res.data });
        } catch (error) {
            Alert.alert('Join Failed', error.response?.data?.message || 'Invalid or inactive code');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
            <LinearGradient colors={GRADIENT} style={StyleSheet.absoluteFill} />

            <KeyboardAvoidingView
                style={styles.center}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                {/* Icon */}
                <View style={styles.iconRing}>
                    <Ionicons name="pencil" size={36} color={COLORS.accent} />
                </View>

                <Text style={styles.title}>Join Live Quiz</Text>
                <Text style={styles.subtitle}>Enter the 6-digit code shared by your teacher</Text>

                <View style={styles.card}>
                    <TextInput
                        style={styles.input}
                        placeholder="123456"
                        placeholderTextColor={COLORS.textMuted}
                        keyboardType="number-pad"
                        maxLength={6}
                        value={code}
                        onChangeText={setCode}
                        textAlign="center"
                    />

                    <TouchableOpacity
                        style={[styles.joinBtn, loading && { opacity: 0.7 }]}
                        onPress={handleJoin}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Ionicons name="arrow-forward-circle" size={20} color="#fff" />
                                <Text style={styles.btnText}>Join Quiz</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
};

const getStyles = (COLORS, GRADIENT, isDark) => StyleSheet.create({
    root: { flex: 1, backgroundColor: COLORS.bg },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    iconRing: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.accentLight, justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: COLORS.borderAccent },
    title: { fontSize: 26, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 8 },
    subtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 28 },
    card: { width: '100%', backgroundColor: COLORS.bgCard, borderRadius: 22, padding: 24, borderWidth: 1, borderColor: COLORS.border },
    input: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 14,
        padding: 16,
        fontSize: 32,
        fontWeight: 'bold',
        letterSpacing: 10,
        color: COLORS.textPrimary,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        textAlign: 'center',
    },
    joinBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.accent, padding: 16, borderRadius: 14 },
    btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default StudentQuizJoinScreen;
