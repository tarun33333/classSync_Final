import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import client from '../api/client';
import * as DocumentPicker from 'expo-document-picker';

const QuizGenScreen = () => {
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
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4A90E2" />
                <Text style={styles.loadingText}>Processing...</Text>
            </View>
        );
    }

    // --- LEADERBOARD (End) ---
    if (activeTab === 'results') {
        const top5 = leaderboard.slice(0, 5);
        return (
            <View style={styles.container}>
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
                        {top5.length === 0 && <Text style={{ textAlign: 'center', color: '#666' }}>No results yet.</Text>}
                    </ScrollView>

                    <TouchableOpacity style={[styles.button, { marginTop: 20, backgroundColor: '#4A90E2', width: '100%' }]} onPress={resetQuiz}>
                        <Text style={styles.buttonText}>Back to Library</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // --- HOSTING LOBBY (Live) ---
    if (activeTab === 'live_lobby') {
        return (
            <View style={styles.container}>
                <View style={styles.liveCard}>
                    <Text style={styles.liveTitle}>
                        {gameStatus === 'WAITING' ? 'Lobby Open ⏳' : 'Quiz in Progress 🚀'}
                    </Text>

                    <View style={styles.codeBox}>
                        <Text style={styles.codeLabel}>JOIN CODE</Text>
                        <Text style={styles.codeText}>{quizCode || '...'}</Text>
                    </View>

                    <Text style={[styles.subText, { fontSize: 18, marginBottom: 10 }]}>
                        {participants.length} Students Joined
                    </Text>

                    {/* Scrollable Participant List */}
                    <View style={styles.participantList}>
                        <ScrollView>
                            {participants.map((p, idx) => (
                                <Text key={idx} style={styles.participantName}>• {p.name}</Text>
                            ))}
                        </ScrollView>
                    </View>

                    {gameStatus === 'WAITING' ? (
                        <TouchableOpacity style={[styles.button, { marginTop: 20, backgroundColor: '#2ecc71', width: '100%' }]} onPress={handleStartGame}>
                            <Text style={styles.buttonText}>Start Quiz ▶</Text>
                        </TouchableOpacity>
                    ) : (
                        <Text style={{ color: '#2ecc71', fontWeight: 'bold', marginVertical: 20, fontSize: 18 }}>
                            Students are playing...
                        </Text>
                    )}

                    <TouchableOpacity style={[styles.button, { marginTop: 10, backgroundColor: '#FF3B30' }]} onPress={handleEndGame}>
                        <Text style={styles.buttonText}>End Quiz ⏹</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // --- 1. My Library Tab ---
    if (activeTab === 'library') {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>My Quiz Library 📚</Text>
                </View>
                {/* Tab Switcher */}
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
                                        <Ionicons name="play-circle" size={24} color="#2ecc71" />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.actionBtn} onPress={() => editExistingQuiz(quiz)}>
                                        <Ionicons name="create" size={24} color="#f1c40f" />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.actionBtn} onPress={() => deleteQuiz(quiz._id)}>
                                        <Ionicons name="trash" size={24} color="#e74c3c" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))
                    )}
                </ScrollView>
            </View>
        );
    }

    // --- 2. Editor / Generator Tab ---
    if (quizData) {
        // EDITOR INTERFACE (Editable)
        const question = quizData[currentQuestionIndex];
        return (
            <View style={styles.container}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => { setQuizData(null); setEditingQuiz(null); }}>
                        <Ionicons name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{editingQuiz ? 'Editing Quiz' : 'Review & Edit'}</Text>
                    <View style={{ width: 24 }} />
                </View>

                <View style={styles.progressHeader}>
                    <TouchableOpacity onPress={removeCurrentQuestion}>
                        <Ionicons name="trash" size={24} color="#e74c3c" />
                    </TouchableOpacity>
                    <Text style={styles.progressText}>Q {currentQuestionIndex + 1} / {quizData.length}</Text>
                    <TouchableOpacity onPress={addNewQuestion}>
                        <Ionicons name="add-circle" size={24} color="#4A90E2" />
                    </TouchableOpacity>
                </View>

                <ScrollView>
                    <View style={styles.editCard}>
                        <Text style={styles.label}>Question:</Text>
                        <TextInput
                            style={styles.editInput}
                            multiline
                            value={question.question}
                            onChangeText={(t) => updateQuestionText(t, currentQuestionIndex)}
                        />

                        <Text style={styles.label}>Options (Tap option to set correct answer):</Text>
                        {question.options.map((opt, idx) => (
                            <View key={idx} style={styles.optionRow}>
                                <TouchableOpacity
                                    style={[styles.radio, question.correctAnswer === idx && styles.radioActive]}
                                    onPress={() => setCorrectOption(currentQuestionIndex, idx)}
                                >
                                    {question.correctAnswer === idx && <View style={styles.radioInner} />}
                                </TouchableOpacity>
                                <TextInput
                                    style={styles.optionInput}
                                    value={opt}
                                    onChangeText={(t) => updateOptionText(t, currentQuestionIndex, idx)}
                                />
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

                {/* Navigation Arrows */}
                <View style={styles.navRow}>
                    <TouchableOpacity
                        disabled={currentQuestionIndex === 0}
                        onPress={() => setCurrentQuestionIndex(prev => prev - 1)}
                    >
                        <Ionicons name="chevron-back" size={30} color={currentQuestionIndex === 0 ? "#ccc" : "#4A90E2"} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        disabled={currentQuestionIndex === quizData.length - 1}
                        onPress={() => setCurrentQuestionIndex(prev => prev + 1)}
                    >
                        <Ionicons name="chevron-forward" size={30} color={currentQuestionIndex === quizData.length - 1 ? "#ccc" : "#4A90E2"} />
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // Default: Generator Form
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>AI Quiz Generator ✨</Text>
            </View>
            {/* Tab Switcher */}
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
                    <TouchableOpacity
                        style={[styles.tab, mode === 'topic' && styles.activeTab]}
                        onPress={() => setMode('topic')}
                    >
                        <Text style={[styles.tabText, mode === 'topic' && styles.activeTabText]}>By Topic</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, mode === 'doc' && styles.activeTab]}
                        onPress={() => setMode('doc')}
                    >
                        <Text style={[styles.tabText, mode === 'doc' && styles.activeTabText]}>From File</Text>
                    </TouchableOpacity>
                </View>

                {mode === 'topic' ? (
                    <>
                        <Text style={styles.label}>Quiz Topic</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g., Python Basics"
                            value={topic}
                            onChangeText={setTopic}
                        />
                    </>
                ) : (
                    <>
                        <Text style={styles.label}>Upload Document (PDF/Text)</Text>
                        <TouchableOpacity style={styles.fileBtn} onPress={pickDocument}>
                            <Ionicons name={selectedFile ? "document" : "cloud-upload"} size={24} color="#666" />
                            <Text style={styles.fileBtnText}>
                                {selectedFile ? selectedFile.name : "Select File"}
                            </Text>
                        </TouchableOpacity>
                    </>
                )}

                <TouchableOpacity style={styles.button} onPress={generateQuiz}>
                    <Text style={styles.buttonText}>Generate with AI</Text>
                    <Ionicons name="sparkles" size={20} color="#FFF" style={{ marginLeft: 10 }} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF', padding: 20 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 20, fontSize: 16, color: '#666' },
    header: { marginTop: 40, marginBottom: 20 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#1A1A1A' },

    // Tabs
    topTabs: { flexDirection: 'row', marginBottom: 20, borderBottomWidth: 1, borderColor: '#eee' },
    activeTabBtn: { flex: 1, paddingVertical: 10, borderBottomWidth: 2, borderColor: '#4A90E2', alignItems: 'center' },
    inactiveTabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center' },
    activeTabText: { color: '#4A90E2', fontWeight: 'bold' },
    inactiveTabText: { color: '#999', fontWeight: 'bold' },

    // Library List
    quizCard: { backgroundColor: '#f9f9f9', padding: 15, borderRadius: 12, marginBottom: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    quizTitle: { fontWeight: 'bold', fontSize: 16, color: '#333' },
    quizSub: { color: '#666', fontSize: 12, marginTop: 4 },
    cardActions: { flexDirection: 'row', gap: 15 },
    actionBtn: { padding: 5 },
    emptyText: { textAlign: 'center', color: '#999', marginTop: 50 },

    // Editor Styles
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 40, marginBottom: 20 },
    headerTitle: { fontSize: 18, fontWeight: 'bold' },
    editCard: { backgroundColor: '#F5F9FF', padding: 15, borderRadius: 12, marginBottom: 20 },
    editInput: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, fontSize: 16, marginBottom: 15, minHeight: 60 },
    optionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    optionInput: { flex: 1, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 8, fontSize: 14 },
    radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#ccc', marginRight: 10, justifyContent: 'center', alignItems: 'center' },
    radioActive: { borderColor: '#4A90E2' },
    radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#4A90E2' },

    // Navigation
    navRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, paddingHorizontal: 20 },
    footerRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
    primaryBtn: { flex: 1, backgroundColor: '#4A90E2', padding: 15, borderRadius: 10, alignItems: 'center' },
    primaryBtnText: { color: '#FFF', fontWeight: 'bold' },
    secondaryBtn: { flex: 1, backgroundColor: '#ddd', padding: 15, borderRadius: 10, alignItems: 'center' },
    secondaryBtnText: { color: '#333', fontWeight: 'bold' },

    // Existing Styles
    form: {},
    label: { fontSize: 16, fontWeight: '600', marginBottom: 10, color: '#333' },
    input: { backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#E1E1E1', borderRadius: 12, padding: 15, fontSize: 16, marginBottom: 20 },
    button: { backgroundColor: '#4A90E2', padding: 18, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    buttonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
    tabs: { flexDirection: 'row', backgroundColor: '#F0F0F0', borderRadius: 10, padding: 5, marginBottom: 20 },
    tab: { flex: 1, padding: 10, alignItems: 'center', borderRadius: 8 },
    activeTab: { backgroundColor: '#FFF', elevation: 2 },
    tabText: { fontWeight: '600', color: '#666' },
    fileBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#E1E1E1', padding: 15, borderRadius: 12, marginBottom: 20 },
    fileBtnText: { marginLeft: 10, fontSize: 16, color: '#333' },

    // Live
    liveCard: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    liveTitle: { fontSize: 28, fontWeight: 'bold', color: '#FF3B30', marginBottom: 20 },
    codeBox: { alignItems: 'center', marginVertical: 20, backgroundColor: '#FFF', padding: 20, borderRadius: 15, elevation: 5 },
    codeLabel: { fontSize: 16, color: '#666', letterSpacing: 1 },
    codeText: { fontSize: 60, fontWeight: 'bold', color: '#333', marginVertical: 10, letterSpacing: 5 },
    subText: { fontSize: 16, color: '#666', marginTop: 10 },
    participantList: { width: '100%', maxHeight: 200, marginVertical: 20, backgroundColor: '#F8F9FA', borderRadius: 10, padding: 10 },
    participantName: { fontSize: 18, color: '#333', paddingVertical: 8, paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: '#EEE', textAlign: 'center' },
    progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    progressText: { fontSize: 16, fontWeight: 'bold', color: '#666' },

    // Leaderboard
    rankCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 15, borderRadius: 12, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 2 },
    rankNumber: { fontSize: 24, fontWeight: 'bold', color: '#4A90E2', width: 40, textAlign: 'center' },
    rankName: { fontSize: 18, fontWeight: '600', color: '#333' },
    rankScore: { fontSize: 14, color: '#666', marginTop: 4 }
});

export default QuizGenScreen;
