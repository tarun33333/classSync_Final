import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import client from '../api/client';
import { useTheme } from '../context/ThemeContext';

const StudentQuizScreen = ({ route, navigation }) => {
    const { colors: COLORS, gradient: GRADIENT, isDark } = useTheme();
    const styles = getStyles(COLORS, GRADIENT, isDark);

    const { quiz } = route.params;
    const [status, setStatus] = useState(quiz.status || 'WAITING');
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [answers, setAnswers] = useState({}); // { 0: 1, 1: 3 } (QuestionIndex: OptionIndex)
    const [submitting, setSubmitting] = useState(false);
    const [scoreData, setScoreData] = useState(null);

    // Poll for Start
    useEffect(() => {
        let interval;
        if (status === 'WAITING') {
            const checkStatus = async () => {
                try {
                    const res = await client.get(`/quiz/status/${quiz._id}`);
                    if (res.data.status === 'LIVE') {
                        setStatus('LIVE');
                    }
                } catch (e) {
                    console.log(e);
                }
            };
            interval = setInterval(checkStatus, 3000);
        }
        return () => clearInterval(interval);
    }, [status]);

    if (status === 'WAITING') {
        return (
            <View style={styles.waitingRoot}>
                <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
                <LinearGradient colors={GRADIENT} style={StyleSheet.absoluteFill} />
                <ActivityIndicator size="large" color={COLORS.accent} />
                <Text style={styles.waitingTitle}>Waiting for Host...</Text>
                <Text style={styles.waitingSub}>The quiz will start soon.</Text>
                <Text style={styles.waitingCode}>You are in!</Text>
            </View>
        );
    }

    const handleSelectOption = (optionIndex) => {
        setAnswers(prev => ({ ...prev, [currentQIndex]: optionIndex }));
    };

    const handleNext = () => {
        if (currentQIndex < quiz.questions.length - 1) {
            setCurrentQIndex(currentQIndex + 1);
        }
    };

    const handlePrev = () => {
        if (currentQIndex > 0) {
            setCurrentQIndex(currentQIndex - 1);
        }
    };

    const submitQuiz = async () => {
        // Validate all answered?
        if (Object.keys(answers).length < quiz.questions.length) {
            Alert.alert('Incomplete', 'Please answer all questions before submitting.');
            return;
        }

        setSubmitting(true);
        try {
            // Transform answers to array
            const answersArray = Object.keys(answers).map(key => ({
                questionIndex: parseInt(key),
                selectedOption: answers[key]
            }));

            const res = await client.post('/quiz/submit', {
                quizId: quiz._id,
                answers: answersArray
            });

            setScoreData(res.data);
        } catch (error) {
            Alert.alert('Error', 'Failed to submit quiz.');
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    };

    if (scoreData) {
        return (
            <View style={styles.root}>
                <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
                <LinearGradient colors={GRADIENT} style={StyleSheet.absoluteFill} />
                <View style={styles.scoreContainer}>
                    <Ionicons name="ribbon" size={80} color="#FFD700" />
                    <Text style={styles.scoreTitle}>Quiz Completed!</Text>
                    <Text style={styles.scoreText}>You scored {scoreData.score} / {scoreData.total}</Text>
                    <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('StudentMain')}>
                        <Text style={styles.btnText}>Return Home</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const currentQuestion = quiz.questions[currentQIndex];
    const progress = ((currentQIndex + 1) / quiz.questions.length) * 100;

    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
            <LinearGradient colors={GRADIENT} style={StyleSheet.absoluteFill} />
            <View style={styles.header}>
                <Text style={styles.quizTitle}>{quiz.title}</Text>
                <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
                </View>
                <Text style={styles.progressText}>Question {currentQIndex + 1} of {quiz.questions.length}</Text>
            </View>
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.questionText}>{currentQuestion.question}</Text>
                {currentQuestion.options.map((option, idx) => {
                    const isSelected = answers[currentQIndex] === idx;
                    return (
                        <TouchableOpacity
                            key={idx}
                            style={[styles.optionBtn, isSelected && styles.optionBtnSelected]}
                            onPress={() => handleSelectOption(idx)}
                        >
                            <View style={[styles.radio, isSelected && styles.radioSelected]}>
                                {isSelected && <View style={styles.radioInner} />}
                            </View>
                            <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>{option}</Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
            <View style={styles.footer}>
                <TouchableOpacity onPress={handlePrev} disabled={currentQIndex === 0} style={[styles.navBtn, currentQIndex === 0 && styles.navBtnDisabled]}>
                    <Text style={styles.navBtnText}>Previous</Text>
                </TouchableOpacity>
                {currentQIndex === quiz.questions.length - 1 ? (
                    <TouchableOpacity onPress={submitQuiz} style={[styles.submitBtn, submitting && { opacity: 0.7 }]} disabled={submitting}>
                        {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Submit Quiz</Text>}
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity onPress={handleNext} style={styles.navBtn}>
                        <Text style={styles.navBtnText}>Next</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const getStyles = (COLORS, GRADIENT, isDark) => StyleSheet.create({
    root: { flex: 1, backgroundColor: COLORS.bg },
    waitingRoot: { flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center' },
    scoreContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    scoreTitle: { fontSize: 28, fontWeight: 'bold', marginVertical: 20, color: COLORS.textPrimary },
    scoreText: { fontSize: 22, color: COLORS.accent, marginBottom: 30 },
    header: { padding: 20, backgroundColor: COLORS.bgCard, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    quizTitle: { fontSize: 17, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 10 },
    progressBarBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' },
    progressBarFill: { height: '100%', backgroundColor: COLORS.accent },
    progressText: { marginTop: 8, fontSize: 12, color: COLORS.textSecondary, textAlign: 'right' },
    content: { padding: 20 },
    questionText: { fontSize: 20, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 28 },
    optionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 14,
        backgroundColor: COLORS.bgCard,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    optionBtnSelected: {
        backgroundColor: COLORS.accentLight,
        borderColor: COLORS.accent,
    },
    radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
    radioSelected: { borderColor: COLORS.accent },
    radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.accent },
    optionText: { fontSize: 15, color: COLORS.textSecondary },
    optionTextSelected: { color: COLORS.textPrimary, fontWeight: '600' },
    footer: {
        flexDirection: 'row',
        padding: 20,
        backgroundColor: COLORS.bgCard,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        justifyContent: 'space-between',
    },
    navBtn: { padding: 14 },
    navBtnDisabled: { opacity: 0.3 },
    navBtnText: { color: COLORS.accent, fontSize: 15, fontWeight: '600' },
    submitBtn: { backgroundColor: COLORS.success, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12 },
    submitBtnText: { color: '#FFF', fontSize: 15, fontWeight: 'bold' },
    btn: { backgroundColor: COLORS.accent, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 28, minWidth: 190, alignItems: 'center', marginTop: 20 },
    btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
    waitingTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.textPrimary, marginTop: 20 },
    waitingSub: { color: COLORS.textSecondary, marginTop: 10, fontSize: 15 },
    waitingCode: { color: COLORS.accent, fontWeight: 'bold', fontSize: 17, marginTop: 36, backgroundColor: COLORS.accentLight, padding: 10, borderRadius: 12 },
});

export default StudentQuizScreen;
