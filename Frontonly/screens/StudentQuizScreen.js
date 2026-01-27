import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import client from '../api/client';

const StudentQuizScreen = ({ route, navigation }) => {
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
            <View style={styles.waitingContainer}>
                <ActivityIndicator size="large" color="#FFF" />
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
            <View style={styles.scoreContainer}>
                <Ionicons name="ribbon" size={80} color="#FFD700" />
                <Text style={styles.scoreTitle}>Quiz Completed!</Text>
                <Text style={styles.scoreText}>You scored {scoreData.score} / {scoreData.total}</Text>
                <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('StudentMain')}>
                    <Text style={styles.btnText}>Return Home</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const currentQuestion = quiz.questions[currentQIndex];
    const progress = ((currentQIndex + 1) / quiz.questions.length) * 100;

    return (
        <View style={styles.container}>
            {/* Header / Progress */}
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

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    scoreContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#FFF' },
    scoreTitle: { fontSize: 30, fontWeight: 'bold', marginVertical: 20, color: '#333' },
    scoreText: { fontSize: 24, color: '#4A90E2', marginBottom: 30 },
    header: { padding: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE' },
    quizTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 10 },
    progressBarBg: { height: 8, backgroundColor: '#EEE', borderRadius: 4, overflow: 'hidden' },
    progressBarFill: { height: '100%', backgroundColor: '#4A90E2' },
    progressText: { marginTop: 8, fontSize: 12, color: '#888', textAlign: 'right' },
    content: { padding: 20 },
    questionText: { fontSize: 22, fontWeight: '600', color: '#111', marginBottom: 30 },
    optionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 18,
        borderRadius: 12,
        backgroundColor: '#FFF',
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#E1E1E1',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1
    },
    optionBtnSelected: {
        backgroundColor: '#EBF5FF',
        borderColor: '#4A90E2'
    },
    radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#CCC', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    radioSelected: { borderColor: '#4A90E2' },
    radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#4A90E2' },
    optionText: { fontSize: 16, color: '#333' },
    optionTextSelected: { color: '#0056b3', fontWeight: '500' },
    footer: {
        flexDirection: 'row',
        padding: 20,
        backgroundColor: '#FFF',
        borderTopWidth: 1,
        borderTopColor: '#EEE',
        justifyContent: 'space-between'
    },
    navBtn: { padding: 15 },
    navBtnDisabled: { opacity: 0.3 },
    navBtnText: { color: '#666', fontSize: 16, fontWeight: '600' },
    submitBtn: { backgroundColor: '#2ecc71', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 10 },
    submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
    btn: { backgroundColor: '#4A90E2', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 30, minWidth: 200, alignItems: 'center' },
    btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
    waitingContainer: { flex: 1, backgroundColor: '#4A90E2', justifyContent: 'center', alignItems: 'center' },
    waitingTitle: { fontSize: 24, fontWeight: 'bold', color: '#FFF', marginTop: 20 },
    waitingSub: { color: '#E1E1E1', marginTop: 10, fontSize: 16 },
    waitingCode: { color: '#FFF', fontWeight: 'bold', fontSize: 18, marginTop: 40, backgroundColor: 'rgba(255,255,255,0.2)', padding: 10, borderRadius: 10 }
});

export default StudentQuizScreen;
