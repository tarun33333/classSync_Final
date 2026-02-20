import React, { useState, useRef } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView,
    Platform, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import client from '../api/client';
import { useTheme } from '../context/ThemeContext';

const AIChatScreen = () => {
    const { colors: COLORS, gradient: GRADIENT, isDark } = useTheme();
    const styles = getStyles(COLORS, GRADIENT, isDark);

    const [messages, setMessages] = useState([
        { id: 1, text: "Hi! I'm your AI Assistant. Upload a PDF or ask me anything.", sender: 'ai' }
    ]);
    const [inputText, setInputText] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const scrollViewRef = useRef();

    const pickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'text/plain'],
                copyToCacheDirectory: true,
            });
            if (result.canceled === false) {
                const file = result.assets ? result.assets[0] : result;
                setSelectedFile(file);
                Alert.alert('File Selected', `Ready to chat with: ${file.name}`);
            }
        } catch { }
    };

    const sendMessage = async () => {
        if (!inputText.trim() && !selectedFile) return;
        const userMsg = { id: Date.now(), text: inputText || `[Analyzing ${selectedFile.name}...]`, sender: 'user', file: selectedFile };
        setMessages(prev => [...prev, userMsg]);
        setInputText('');
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('question', inputText || 'Summarize this document');
            if (selectedFile) {
                formData.append('doc', { uri: selectedFile.uri, name: selectedFile.name, type: selectedFile.mimeType || 'application/pdf' });
            }
            const res = await client.post('/ai/chat', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            setMessages(prev => [...prev, { id: Date.now() + 1, text: res.data.answer, sender: 'ai' }]);
            if (selectedFile) setSelectedFile(null);
        } catch {
            Alert.alert('Error', 'Failed to get response from AI.');
            setMessages(prev => [...prev, { id: Date.now() + 1, text: 'Sorry, I encountered an error.', sender: 'ai', error: true }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
            <LinearGradient colors={GRADIENT} style={StyleSheet.absoluteFill} />

            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerIcon}>
                        <Ionicons name="sparkles" size={20} color={COLORS.accent} />
                    </View>
                    <Text style={styles.headerTitle}>AI Assistant</Text>
                </View>

                {/* Messages */}
                <ScrollView
                    ref={scrollViewRef}
                    style={styles.chatArea}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                >
                    {messages.map(msg => (
                        <View key={msg.id} style={[styles.bubble, msg.sender === 'user' ? styles.userBubble : styles.aiBubble]}>
                            <Text style={[styles.msgText, msg.sender === 'user' ? styles.userText : styles.aiText]}>
                                {msg.text}
                            </Text>
                            {msg.file && <Text style={styles.fileLabel}>📎 {msg.file.name}</Text>}
                        </View>
                    ))}
                    {loading && (
                        <View style={[styles.bubble, styles.aiBubble, { paddingVertical: 14 }]}>
                            <ActivityIndicator size="small" color={COLORS.accent} />
                        </View>
                    )}
                </ScrollView>

                {/* Input bar */}
                <View style={styles.inputBar}>
                    <TouchableOpacity onPress={pickDocument} style={styles.attachBtn}>
                        <Ionicons
                            name={selectedFile ? 'document' : 'attach'}
                            size={22}
                            color={selectedFile ? COLORS.accent : COLORS.textSecondary}
                        />
                    </TouchableOpacity>
                    <TextInput
                        style={styles.input}
                        placeholder={selectedFile ? 'Ask about this file...' : 'Type a message...'}
                        placeholderTextColor={COLORS.textMuted}
                        value={inputText}
                        onChangeText={setInputText}
                        multiline
                        maxHeight={100}
                    />
                    <TouchableOpacity onPress={sendMessage} style={styles.sendBtn} disabled={loading}>
                        <Ionicons name="send" size={18} color="#fff" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
};

const getStyles = (COLORS, GRADIENT, isDark) => StyleSheet.create({
    root: { flex: 1, backgroundColor: COLORS.bg },
    flex: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    headerIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.accentLight, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
    chatArea: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
    bubble: { maxWidth: '80%', padding: 12, borderRadius: 16, marginBottom: 10 },
    userBubble: { alignSelf: 'flex-end', backgroundColor: COLORS.accent, borderBottomRightRadius: 4 },
    aiBubble: { alignSelf: 'flex-start', backgroundColor: COLORS.bgCard, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: COLORS.border },
    msgText: { fontSize: 15, lineHeight: 22 },
    userText: { color: '#fff' },
    aiText: { color: COLORS.textPrimary },
    fileLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 4, fontStyle: 'italic' },
    inputBar: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: COLORS.bgCard, borderTopWidth: 1, borderTopColor: COLORS.border },
    attachBtn: { padding: 8 },
    input: { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, marginHorizontal: 8, fontSize: 15, color: COLORS.textPrimary, borderWidth: 1, borderColor: COLORS.border },
    sendBtn: { backgroundColor: COLORS.accent, width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
});

export default AIChatScreen;
