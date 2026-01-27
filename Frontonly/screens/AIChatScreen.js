import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import client from '../api/client';

const AIChatScreen = () => {
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
                copyToCacheDirectory: true
            });

            if (result.canceled === false) {
                // Expo Document Picker returns 'assets' array in newer versions, or object in older.
                // Handling both just in case, but result.assets[0] is standard now.
                const file = result.assets ? result.assets[0] : result;
                setSelectedFile(file);
                Alert.alert('File Selected', `Ready to chat with: ${file.name}`);
            }
        } catch (err) {
            console.log(err);
        }
    };

    const sendMessage = async () => {
        if (!inputText.trim() && !selectedFile) return;

        const userMsg = { id: Date.now(), text: inputText || `[Analying ${selectedFile.name}...]`, sender: 'user', file: selectedFile };
        setMessages(prev => [...prev, userMsg]);
        setInputText('');
        setLoading(true);

        try {
            const formData = new FormData();
            formData.append('question', inputText || "Summarize this document");

            if (selectedFile) {
                formData.append('doc', {
                    uri: selectedFile.uri,
                    name: selectedFile.name,
                    type: selectedFile.mimeType || 'application/pdf'
                });
            }

            const res = await client.post('/ai/chat', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            const aiMsg = { id: Date.now() + 1, text: res.data.answer, sender: 'ai' };
            setMessages(prev => [...prev, aiMsg]);

            // Clear file after sending (optional choice, assuming context is one-shot for now)
            if (selectedFile) setSelectedFile(null);

        } catch (error) {
            console.log(error);
            Alert.alert('Error', 'Failed to get response from AI.');
            setMessages(prev => [...prev, { id: Date.now() + 1, text: "Sorry, I encountered an error. Please try again.", sender: 'ai', error: true }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
            <ScrollView
                ref={scrollViewRef}
                style={styles.chatContainer}
                contentContainerStyle={{ paddingBottom: 20 }}
                onContentSizeChange={() => scrollViewRef.current.scrollToEnd({ animated: true })}
            >
                {messages.map((msg) => (
                    <View key={msg.id} style={[styles.bubble, msg.sender === 'user' ? styles.userBubble : styles.aiBubble]}>
                        <Text style={[styles.msgText, msg.sender === 'user' ? styles.userText : styles.aiText]}>{msg.text}</Text>
                        {msg.file && <Text style={styles.fileLabel}>📎 {msg.file.name}</Text>}
                    </View>
                ))}
                {loading && (
                    <View style={styles.bubble}>
                        <ActivityIndicator size="small" color="#4A90E2" />
                    </View>
                )}
            </ScrollView>

            <View style={styles.inputContainer}>
                <TouchableOpacity onPress={pickDocument} style={styles.attachBtn}>
                    <Ionicons name={selectedFile ? "document" : "attach"} size={24} color={selectedFile ? "#4A90E2" : "#666"} />
                </TouchableOpacity>
                <TextInput
                    style={styles.input}
                    placeholder={selectedFile ? "Ask about this file..." : "Type a message..."}
                    value={inputText}
                    onChangeText={setInputText}
                    multiline
                />
                <TouchableOpacity onPress={sendMessage} style={styles.sendBtn} disabled={loading}>
                    <Ionicons name="send" size={24} color="#FFF" />
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F7FA' },
    chatContainer: { flex: 1, padding: 15 },
    bubble: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 15,
        marginBottom: 10,
    },
    userBubble: {
        alignSelf: 'flex-end',
        backgroundColor: '#4A90E2',
        borderBottomRightRadius: 2,
    },
    aiBubble: {
        alignSelf: 'flex-start',
        backgroundColor: '#FFF',
        borderBottomLeftRadius: 2,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
    },
    msgText: { fontSize: 16, lineHeight: 22 },
    userText: { color: '#FFF' },
    aiText: { color: '#333' },
    fileLabel: { fontSize: 12, color: '#DDD', marginTop: 5, fontStyle: 'italic' },
    inputContainer: {
        flexDirection: 'row',
        padding: 10,
        backgroundColor: '#FFF',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#EEE'
    },
    input: {
        flex: 1,
        maxHeight: 100,
        backgroundColor: '#F0F0F0',
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 10,
        marginHorizontal: 10,
        fontSize: 16,
    },
    attachBtn: { padding: 10 },
    sendBtn: {
        backgroundColor: '#4A90E2',
        padding: 10,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
    }
});

export default AIChatScreen;
