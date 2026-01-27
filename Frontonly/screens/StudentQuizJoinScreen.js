import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import client from '../api/client';

const StudentQuizJoinScreen = ({ navigation }) => {
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);

    const handleJoin = async () => {
        if (!code) {
            Alert.alert('Error', 'Please enter a code');
            return;
        }

        setLoading(true);
        try {
            const res = await client.post('/quiz/join', { code });
            const quizData = res.data;
            navigation.navigate('StudentQuiz', { quiz: quizData });
        } catch (error) {
            Alert.alert('Join Failed', error.response?.data?.message || 'Invalid or inactive Code');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <Text style={styles.title}>Join Live Quiz</Text>
                <Text style={styles.subtitle}>Enter the 6-digit code shared by your teacher.</Text>

                <TextInput
                    style={styles.input}
                    placeholder="e.g. 123456"
                    keyboardType="number-pad"
                    maxLength={6}
                    value={code}
                    onChangeText={setCode}
                    textAlign="center"
                />

                <TouchableOpacity
                    style={[styles.joinBtn, { opacity: loading ? 0.7 : 1 }]}
                    onPress={handleJoin}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Text style={styles.btnText}>Join Quiz</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#4A90E2', justifyContent: 'center', padding: 20 },
    card: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 30,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 10
    },
    title: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 10 },
    subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 30 },
    input: {
        width: '100%',
        backgroundColor: '#F5F5F5',
        borderRadius: 10,
        padding: 15,
        fontSize: 24,
        fontWeight: 'bold',
        letterSpacing: 5,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#EEE'
    },
    joinBtn: {
        width: '100%',
        backgroundColor: '#2ecc71',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center'
    },
    btnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' }
});

export default StudentQuizJoinScreen;
