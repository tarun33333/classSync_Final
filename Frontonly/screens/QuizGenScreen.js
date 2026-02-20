import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import client from '../api/client';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../context/ThemeContext';

const QuizGenScreen = () => {
    const { colors: COLORS, gradient: GRADIENT, isDark } = useTheme();
    const styles = getStyles(COLORS, GRADIENT, isDark);

    const [topic, setTopic] = useState('');
    const [loading, setLoading] = useState(false);
    const [quizData, setQuizData] = useState(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [showScore, setShowScore] = useState(false);

    // Live Quiz State
    const [isLive, setIsLive] = useState(false);
    const [quizCode, setQuizCode] = useState(null);
    const [liveQuizId, setLiveQuizId] = useState(null);

    // Doc Quiz State
    const [mode, setMode] = useState('topic'); // 'topic' or 'doc'
    const [selectedFile, setSelectedFile] = useState(null);

    // Dashboard State
    const [activeTab, setActiveTab] = useState('gen'); // 'gen', 'library'
    const [savedQuizzes, setSavedQuizzes] = useState([]);
    const [editingQuiz, setEditingQuiz] = useState(null); // For manual edit mode

    // Lobby State
    const [participants, setParticipants] = useState([]);
    const [gameStatus, setGameStatus] = useState('WAITING'); // WAITING or LIVE

    React.useEffect(() => {
        let interval;
        if (isLive && liveQuizId) {
            const fetchStatus = async () => {
                try {
                    const res = await client.get(`/quiz/status/${liveQuizId}`);
                    setParticipants(res.data.participants || []);
                    setGameStatus(res.data.status);
                    if (res.data.code) setQuizCode(res.data.code); // Sync code
                } catch (e) {
                    console.log("Polling error", e);
                }
            };
            fetchStatus(); // Initial call
            interval = setInterval(fetchStatus, 3000); // Poll every 3s
        }
        return () => clearInterval(interval);
    }, [isLive, liveQuizId]);

    const handleStartGame = async () => {
        try {
            await client.post(`/quiz/start/${liveQuizId}`);
            Alert.alert("Game Started!", "Students can now see the questions.");
            setGameStatus('LIVE');
        } catch (err) {
            Alert.alert("Error", "Could not start game.");
        }
    };


    const fetchMyQuizzes = async () => {
        try {
            const res = await client.get('/quiz/teacher');
            setSavedQuizzes(res.data);
        } catch (error) {
            console.log(error);
        }
    };

    // Refresh library when tab changes
    React.useEffect(() => {
        if (activeTab === 'library') {
            fetchMyQuizzes();
        }
    }, [activeTab]);

    const pickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'text/plain'],
                copyToCacheDirectory: true
            });
            if (result.assets && result.assets[0]) {
                setSelectedFile(result.assets[0]);
            }
        } catch (err) {
            console.log(err);
        }
    };

    const generateQuiz = async () => {
        if (mode === 'topic' && !topic) {
            Alert.alert('Missing Topic', 'Please enter a topic.');
            return;
        }
        if (mode === 'doc' && !selectedFile) {
            Alert.alert('Missing File', 'Please select a document.');
            return;
        }

        setLoading(true);
        setQuizData(null);
        setShowScore(false);
        setScore(0);
        setCurrentQuestionIndex(0);

        try {
            const formData = new FormData();
            formData.append('count', 5);
            formData.append('difficulty', 'Medium');

            if (mode === 'topic') {
                formData.append('topic', topic);
            } else {
                formData.append('doc', {
                    uri: selectedFile.uri,
                    name: selectedFile.name,
                    type: selectedFile.mimeType || 'application/pdf'
                });
                formData.append('topic', 'Document Content'); // Fallback/Label
            }

            // Client needs to handle multipart for this request
            const res = await client.post('/ai/quiz', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (res.data.quiz && res.data.quiz.length > 0) {
                setQuizData(res.data.quiz);
            } else {
                Alert.alert('Error', 'AI returned no questions. Try again.');
            }
        } catch (error) {
            console.log(error);
            Alert.alert('Error', 'Failed to generate quiz.');
        } finally {
            setLoading(false);
        }
    };

    const handleOptionSelect = (optionIndex) => {
        const currentQuestion = quizData[currentQuestionIndex];
        let newScore = score;
        if (optionIndex === currentQuestion.correctAnswer) {
            newScore += 1;
        }
        setScore(newScore);

        if (currentQuestionIndex < quizData.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        } else {
            setShowScore(true);
        }
    };

    const resetQuiz = () => {
        setQuizData(null);
        setTopic('');
        setShowScore(false);
        setIsLive(false);
        setQuizCode(null);
        setLiveQuizId(null);
        setActiveTab('library'); // Go back to library
    };

    const saveAndHostQuiz = async () => {
        if (!quizData) return;
        setLoading(true);
        try {
            // 1. Save New Quiz
            const createRes = await client.post('/quiz/create', {
                title: `Quiz: ${topic || 'Generated Quiz'}`,
                topic: topic || 'Document Generation',
                questions: quizData
            });
            const savedId = createRes.data._id;
            setLiveQuizId(savedId);

            // 2. Host
            startHosting(savedId);

        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to host quiz.');
        } finally {
            setLoading(false);
        }
    };

    const startHosting = async (quizId) => {
        setLoading(true);
        setQuizCode(null); // Clear previous code
        setGameStatus('WAITING'); // Reset status
        try {
            const hostRes = await client.post(`/quiz/host/${quizId}`);
            console.log("Host Res:", hostRes.data);
            setQuizCode(hostRes.data.code);
            setLiveQuizId(quizId); // Essential for polling
            setIsLive(true);
            setActiveTab('live_lobby'); // Explicit navigation
        } catch (error) {
            console.log(error);
            Alert.alert('Error', 'Failed to start hosting.');
        } finally {
            setLoading(false);
        }
    };

    // --- Edit Mode Logic ---
    const updateQuestionText = (text, index) => {
        const updated = [...quizData];
        updated[index].question = text;
        setQuizData(updated);
    };

    const updateOptionText = (text, qIndex, oIndex) => {
        const updated = [...quizData];
        updated[qIndex].options[oIndex] = text;
        setQuizData(updated);
    };

    const setCorrectOption = (qIndex, oIndex) => {
        const updated = [...quizData];
        updated[qIndex].correctAnswer = oIndex;
        setQuizData(updated);
    };

    const addNewQuestion = () => {
        setQuizData([
            ...quizData,
            {
                question: 'New Question',
                options: ['Option A', 'Option B', 'Option C', 'Option D'],
                correctAnswer: 0
            }
        ]);
        setCurrentQuestionIndex(quizData.length); // Jump to new question
    };

    const removeCurrentQuestion = () => {
        if (quizData.length <= 1) {
            Alert.alert('Error', 'Quiz must have at least one question.');
            return;
        }
        const updated = quizData.filter((_, idx) => idx !== currentQuestionIndex);
        setQuizData(updated);
        setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1));
    };

    const saveChanges = async () => {
        if (!editingQuiz) {
            // Saving for first time (from AI gen) but not hosting yet
            saveOnly();
            return;
        }

        // Updating existing quiz
        try {
            setLoading(true);
            await client.put(`/quiz/${editingQuiz._id}`, {
                title: editingQuiz.title,
                questions: quizData
            });
            Alert.alert('Saved', 'Quiz updated successfully.');
            setEditingQuiz(null); // Exit edit mode
            setQuizData(null);
            fetchMyQuizzes();
            setActiveTab('library');
        } catch (err) {
            Alert.alert('Error', 'Failed to update quiz.');
        } finally {
            setLoading(false);
        }
    };

    const saveOnly = async () => {
        try {
            setLoading(true);
            await client.post('/quiz/create', {
                title: `Quiz: ${topic || 'Manual Quiz'}`,
                topic: topic || 'Manual',
                questions: quizData
            });
            Alert.alert('Saved', 'Quiz saved to library.');
            setQuizData(null);
            setActiveTab('library');
        } catch (err) {
            Alert.alert('Error', 'Failed to save.');
        } finally {
            setLoading(false);
        }
    };

    const editExistingQuiz = (quiz) => {
        setEditingQuiz(quiz);
        setQuizData(quiz.questions);
        setTopic(quiz.topic);
        setCurrentQuestionIndex(0);
        setActiveTab('gen'); // Reuse the generator UI for editing
    };

    const deleteQuiz = async (id) => {
        try {
            await client.delete(`/quiz/${id}`);
            fetchMyQuizzes();
        } catch (err) {
            Alert.alert('Error', 'Could not delete quiz.');
        }
    };

    // Results State
    const [leaderboard, setLeaderboard] = useState([]);

    const handleEndGame = async () => {
        if (!liveQuizId) return;
        try {
            await client.post(`/quiz/end/${liveQuizId}`);
            // Fetch results
            const res = await client.get(`/quiz/results/${liveQuizId}`);
            setLeaderboard(res.data);
            setActiveTab('results');
            setIsLive(false); // Stop polling
        } catch (e) {
            console.log(e);
            Alert.alert("Error", "Could not end game.");
        }
    };

    if (loading) {
        return (
            <View style={styles.root}>
                <LinearGradient colors={GRADIENT} style={StyleSheet.absoluteFill} />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.accent} />
                    <Text style={styles.loadingText}>Processing...</Text>
                </View>
            </View>
        );
    }

    // --- LEADERBOARD (End) ---
    if (activeTab === 'results') {
        const top5 = leaderboard.slice(0, 5);
        return (
            <View style={styles.root}>
                <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
                <LinearGradient colors={GRADIENT} style={StyleSheet.absoluteFill} />
                <View style={[styles.liveCard, { justifyContent: 'flex-start', paddingTop: 40 }]}>
                    <Text style={styles.liveTitle}>🏆 Top 5 Performers</Text>
                    <ScrollView style={{ width: '100%', marginTop: 20 }}>
                        {top5.map((result, index) => (
                            <View key={index} style={styles.rankCard}>
                                <Text style={styles.rankNumber}>#{index + 1}</Text>
                                <View style={{ flex: 1, marginLeft: 15 }}>
                                    <Text style={styles.rankName}>{result.studentId?.name || 'Student'}</Text>
                                    <Text style={styles.rankScore}>{result.score} / {result.total} pts</Text>
                                </View>
                                {index === 0 && <Ionicons name="trophy" size={30} color="#FFD700" />}
                            </View>
                        ))}
                        {top5.length === 0 && <Text style={{ textAlign: 'center', color: COLORS.textSecondary }}>No results yet.</Text>}
                    </ScrollView>
                    <TouchableOpacity style={[styles.button, { marginTop: 20, width: '100%' }]} onPress={resetQuiz}>
                        <Text style={styles.buttonText}>Back to Library</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // --- HOSTING LOBBY (Live) ---
    if (activeTab === 'live_lobby') {
        return (
            <View style={styles.root}>
                <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
                <LinearGradient colors={GRADIENT} style={StyleSheet.absoluteFill} />
                <View style={styles.liveCard}>
                    <Text style={styles.liveTitle}>
                        {gameStatus === 'WAITING' ? 'Lobby Open ⏳' : 'Quiz in Progress 🚀'}
                    </Text>
                    <View style={styles.codeBox}>
                        <Text style={styles.codeLabel}>JOIN CODE</Text>
                        <Text style={styles.codeText}>{quizCode || '...'}</Text>
                    </View>
                    <Text style={[styles.subText, { fontSize: 18, marginBottom: 10 }]}>{participants.length} Students Joined</Text>
                    <View style={styles.participantList}>
                        <ScrollView>
                            {participants.map((p, idx) => (
                                <Text key={idx} style={styles.participantName}>• {p.name}</Text>
                            ))}
                        </ScrollView>
                    </View>
                    {gameStatus === 'WAITING' ? (
                        <TouchableOpacity style={[styles.button, { marginTop: 20, backgroundColor: COLORS.success, width: '100%' }]} onPress={handleStartGame}>
                            <Text style={styles.buttonText}>Start Quiz ▶</Text>
                        </TouchableOpacity>
                    ) : (
                        <Text style={{ color: COLORS.success, fontWeight: 'bold', marginVertical: 20, fontSize: 18 }}>Students are playing...</Text>
                    )}
                    <TouchableOpacity style={[styles.button, { marginTop: 10, backgroundColor: COLORS.danger }]} onPress={handleEndGame}>
                        <Text style={styles.buttonText}>End Quiz ⏹</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // --- 1. My Library Tab ---
    if (activeTab === 'library') {
        return (
            <View style={styles.root}>
                <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
                <LinearGradient colors={GRADIENT} style={StyleSheet.absoluteFill} />
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.title}>My Quiz Library 📚</Text>
                    </View>
                    <View style={styles.topTabs}>
                        <TouchableOpacity style={styles.inactiveTabBtn} onPress={() => setActiveTab('gen')}>
                            <Text style={styles.inactiveTabText}>Create New</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.activeTabBtn}>
                            <Text style={styles.activeTabText}>My Library</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                        {savedQuizzes.length === 0 ? (
                            <Text style={styles.emptyText}>No saved quizzes yet.</Text>
                        ) : (
                            savedQuizzes.map((quiz) => (
                                <View key={quiz._id} style={styles.quizCard}>
                                    <View>
                                        <Text style={styles.quizTitle}>{quiz.title}</Text>
                                        <Text style={styles.quizSub}>{quiz.questions.length} Questions • {new Date(quiz.createdAt).toLocaleDateString()}</Text>
                                    </View>
                                    <View style={styles.cardActions}>
                                        <TouchableOpacity style={styles.actionBtn} onPress={() => startHosting(quiz._id)}>
                                            <Ionicons name="play-circle" size={24} color={COLORS.success} />
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.actionBtn} onPress={() => editExistingQuiz(quiz)}>
                                            <Ionicons name="create" size={24} color={COLORS.warning} />
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.actionBtn} onPress={() => deleteQuiz(quiz._id)}>
                                            <Ionicons name="trash" size={24} color={COLORS.danger} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))
                        )}
                    </ScrollView>
                </View>
            </View>
        );
    }

    // --- 2. Editor / Generator Tab ---
    if (quizData) {
        const question = quizData[currentQuestionIndex];
        return (
            <View style={styles.root}>
                <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
                <LinearGradient colors={GRADIENT} style={StyleSheet.absoluteFill} />
                <View style={styles.container}>
                    <View style={styles.headerRow}>
                        <TouchableOpacity onPress={() => { setQuizData(null); setEditingQuiz(null); }}>
                            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>{editingQuiz ? 'Editing Quiz' : 'Review & Edit'}</Text>
                        <View style={{ width: 24 }} />
                    </View>
                    <View style={styles.progressHeader}>
                        <TouchableOpacity onPress={removeCurrentQuestion}>
                            <Ionicons name="trash" size={24} color={COLORS.danger} />
                        </TouchableOpacity>
                        <Text style={styles.progressText}>Q {currentQuestionIndex + 1} / {quizData.length}</Text>
                        <TouchableOpacity onPress={addNewQuestion}>
                            <Ionicons name="add-circle" size={24} color={COLORS.accent} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView>
                        <View style={styles.editCard}>
                            <Text style={styles.label}>Question:</Text>
                            <TextInput style={styles.editInput} multiline value={question.question} onChangeText={(t) => updateQuestionText(t, currentQuestionIndex)} placeholderTextColor={COLORS.textMuted} />
                            <Text style={styles.label}>Options (Tap to set correct):</Text>
                            {question.options.map((opt, idx) => (
                                <View key={idx} style={styles.optionRow}>
                                    <TouchableOpacity style={[styles.radio, question.correctAnswer === idx && styles.radioActive]} onPress={() => setCorrectOption(currentQuestionIndex, idx)}>
                                        {question.correctAnswer === idx && <View style={styles.radioInner} />}
                                    </TouchableOpacity>
                                    <TextInput style={styles.optionInput} value={opt} onChangeText={(t) => updateOptionText(t, currentQuestionIndex, idx)} placeholderTextColor={COLORS.textMuted} />
                                </View>
                            ))}
                        </View>
                    </ScrollView>
                    <View style={styles.footerRow}>
                        <TouchableOpacity style={styles.secondaryBtn} onPress={saveChanges}>
                            <Text style={styles.secondaryBtnText}>Save Only</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.primaryBtn} onPress={editingQuiz ? saveChanges : saveAndHostQuiz}>
                            <Text style={styles.primaryBtnText}>{editingQuiz ? 'Update Quiz' : 'Save & Host'}</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.navRow}>
                        <TouchableOpacity disabled={currentQuestionIndex === 0} onPress={() => setCurrentQuestionIndex(prev => prev - 1)}>
                            <Ionicons name="chevron-back" size={30} color={currentQuestionIndex === 0 ? COLORS.textMuted : COLORS.accent} />
                        </TouchableOpacity>
                        <TouchableOpacity disabled={currentQuestionIndex === quizData.length - 1} onPress={() => setCurrentQuestionIndex(prev => prev + 1)}>
                            <Ionicons name="chevron-forward" size={30} color={currentQuestionIndex === quizData.length - 1 ? COLORS.textMuted : COLORS.accent} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    }

    // Default: Generator Form
    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
            <LinearGradient colors={GRADIENT} style={StyleSheet.absoluteFill} />
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>AI Quiz Generator ✨</Text>
                </View>
                <View style={styles.topTabs}>
                    <TouchableOpacity style={styles.activeTabBtn}>
                        <Text style={styles.activeTabText}>Create New</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.inactiveTabBtn} onPress={() => setActiveTab('library')}>
                        <Text style={styles.inactiveTabText}>My Library</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.form}>
                    <View style={styles.tabs}>
                        <TouchableOpacity style={[styles.tab, mode === 'topic' && styles.activeTab]} onPress={() => setMode('topic')}>
                            <Text style={[styles.tabText, mode === 'topic' && { color: COLORS.accent, fontWeight: 'bold' }]}>By Topic</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.tab, mode === 'doc' && styles.activeTab]} onPress={() => setMode('doc')}>
                            <Text style={[styles.tabText, mode === 'doc' && { color: COLORS.accent, fontWeight: 'bold' }]}>From File</Text>
                        </TouchableOpacity>
                    </View>
                    {mode === 'topic' ? (
                        <>
                            <Text style={styles.label}>Quiz Topic</Text>
                            <TextInput style={styles.input} placeholder="e.g., Python Basics" placeholderTextColor={COLORS.textMuted} value={topic} onChangeText={setTopic} />
                        </>
                    ) : (
                        <>
                            <Text style={styles.label}>Upload Document (PDF/Text)</Text>
                            <TouchableOpacity style={styles.fileBtn} onPress={pickDocument}>
                                <Ionicons name={selectedFile ? "document" : "cloud-upload"} size={24} color={COLORS.textSecondary} />
                                <Text style={styles.fileBtnText}>{selectedFile ? selectedFile.name : "Select File"}</Text>
                            </TouchableOpacity>
                        </>
                    )}
                    <TouchableOpacity style={styles.button} onPress={generateQuiz}>
                        <Text style={styles.buttonText}>Generate with AI</Text>
                        <Ionicons name="sparkles" size={20} color="#FFF" style={{ marginLeft: 10 }} />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const getStyles = (COLORS, GRADIENT, isDark) => StyleSheet.create({
    root: { flex: 1, backgroundColor: COLORS.bg },
    container: { flex: 1, padding: 20 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 20, fontSize: 16, color: COLORS.textSecondary },
    header: { marginTop: 40, marginBottom: 20 },
    title: { fontSize: 24, fontWeight: 'bold', color: COLORS.textPrimary },

    topTabs: { flexDirection: 'row', marginBottom: 20, borderBottomWidth: 1, borderColor: COLORS.border },
    activeTabBtn: { flex: 1, paddingVertical: 10, borderBottomWidth: 2, borderColor: COLORS.accent, alignItems: 'center' },
    inactiveTabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center' },
    activeTabText: { color: COLORS.accent, fontWeight: 'bold' },
    inactiveTabText: { color: COLORS.textMuted, fontWeight: 'bold' },

    quizCard: { backgroundColor: COLORS.bgCard, padding: 15, borderRadius: 14, marginBottom: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
    quizTitle: { fontWeight: 'bold', fontSize: 15, color: COLORS.textPrimary },
    quizSub: { color: COLORS.textSecondary, fontSize: 12, marginTop: 4 },
    cardActions: { flexDirection: 'row', gap: 14 },
    actionBtn: { padding: 5 },
    emptyText: { textAlign: 'center', color: COLORS.textMuted, marginTop: 50 },

    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 40, marginBottom: 20 },
    headerTitle: { fontSize: 17, fontWeight: 'bold', color: COLORS.textPrimary },
    editCard: { backgroundColor: COLORS.bgCard, padding: 15, borderRadius: 14, marginBottom: 18, borderWidth: 1, borderColor: COLORS.border },
    editInput: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 10, fontSize: 15, color: COLORS.textPrimary, marginBottom: 14, minHeight: 60 },
    optionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    optionInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 8, fontSize: 13, color: COLORS.textPrimary },
    radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: COLORS.border, marginRight: 10, justifyContent: 'center', alignItems: 'center' },
    radioActive: { borderColor: COLORS.accent },
    radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.accent },

    navRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, paddingHorizontal: 20 },
    footerRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
    primaryBtn: { flex: 1, backgroundColor: COLORS.accent, padding: 15, borderRadius: 12, alignItems: 'center' },
    primaryBtnText: { color: '#FFF', fontWeight: 'bold' },
    secondaryBtn: { flex: 1, backgroundColor: COLORS.bgCard, padding: 15, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
    secondaryBtnText: { color: COLORS.textSecondary, fontWeight: 'bold' },

    form: {},
    label: { fontSize: 15, fontWeight: '600', marginBottom: 10, color: COLORS.textSecondary },
    input: { backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 14, fontSize: 15, color: COLORS.textPrimary, marginBottom: 18 },
    button: { backgroundColor: COLORS.accent, padding: 18, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    buttonText: { color: '#FFF', fontSize: 17, fontWeight: 'bold' },
    tabs: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12, padding: 4, marginBottom: 18, borderWidth: 1, borderColor: COLORS.border },
    tab: { flex: 1, padding: 10, alignItems: 'center', borderRadius: 10 },
    activeTab: { backgroundColor: COLORS.accentLight },
    tabText: { fontWeight: '600', color: COLORS.textSecondary },
    fileBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border, padding: 14, borderRadius: 12, marginBottom: 18 },
    fileBtnText: { marginLeft: 10, fontSize: 15, color: COLORS.textPrimary },

    liveCard: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    liveTitle: { fontSize: 26, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 20 },
    codeBox: { alignItems: 'center', marginVertical: 20, backgroundColor: COLORS.bgCard, padding: 20, borderRadius: 18, borderWidth: 2, borderColor: COLORS.accent },
    codeLabel: { fontSize: 14, color: COLORS.textSecondary, letterSpacing: 2 },
    codeText: { fontSize: 58, fontWeight: 'bold', color: COLORS.accent, marginVertical: 10, letterSpacing: 5 },
    subText: { fontSize: 15, color: COLORS.textSecondary, marginTop: 10 },
    participantList: { width: '100%', maxHeight: 200, marginVertical: 18, backgroundColor: COLORS.bgCard, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: COLORS.border },
    participantName: { fontSize: 16, color: COLORS.textPrimary, paddingVertical: 8, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border, textAlign: 'center' },
    progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
    progressText: { fontSize: 15, fontWeight: 'bold', color: COLORS.textSecondary },

    rankCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgCard, padding: 14, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
    rankNumber: { fontSize: 22, fontWeight: 'bold', color: COLORS.accent, width: 40, textAlign: 'center' },
    rankName: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
    rankScore: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
});

export default QuizGenScreen;
