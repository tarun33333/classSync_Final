import React, { useState, useContext, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    Alert, ActivityIndicator, Modal, FlatList, StatusBar, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import client from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const CreateAnnouncementScreen = ({ navigation, route }) => {
    const { colors: COLORS, gradient: GRADIENT, isDark } = useTheme();
    const styles = getStyles(COLORS, GRADIENT, isDark);

    const { userInfo, userRole } = useContext(AuthContext);
    const existingAnnouncement = route.params?.announcement;
    const isEditMode = !!existingAnnouncement;

    const [title, setTitle] = useState(existingAnnouncement?.title || '');
    const [message, setMessage] = useState(existingAnnouncement?.message || '');
    const [submitting, setSubmitting] = useState(false);
    const [teacherClasses, setTeacherClasses] = useState([]);
    const [selectedTarget, setSelectedTarget] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);

    useEffect(() => { if (userRole === 'teacher') fetchTeacherClasses(); }, []);

    const fetchTeacherClasses = async () => {
        try {
            const res = await client.get('/routines/teacher/classes');
            setTeacherClasses(res.data);
        } catch { }
    };

    const handleSubmit = async () => {
        if (!title.trim() || !message.trim()) { Alert.alert('Error', 'Please fill in all fields'); return; }
        setSubmitting(true);
        try {
            const payload = { title, message, authorName: userInfo.name, authorRole: userRole };
            if (selectedTarget) {
                payload.targetDept = selectedTarget.dept;
                payload.targetSemester = selectedTarget.semester;
                payload.targetSubject = selectedTarget.subject;
            }
            if (isEditMode) {
                await client.put(`/announcements/${existingAnnouncement._id}`, payload);
                Alert.alert('Success', 'Announcement updated!');
            } else {
                await client.post('/announcements/create', payload);
                Alert.alert('Success', 'Announcement posted!');
            }
            navigation.goBack();
        } catch {
            Alert.alert('Error', 'Failed to post announcement');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
            <LinearGradient colors={GRADIENT} style={StyleSheet.absoluteFill} />

            <ScrollView contentContainerStyle={styles.container}>
                <Text style={styles.pageTitle}>
                    {isEditMode ? '✏️ Edit Announcement' : '📢 New Announcement'}
                </Text>

                {/* Target Selector */}
                {userRole === 'teacher' && (
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>To</Text>
                        <TouchableOpacity style={styles.selector} onPress={() => setModalVisible(true)}>
                            <Text style={styles.selectorText}>
                                {selectedTarget
                                    ? `${selectedTarget.dept} · Sem ${selectedTarget.semester} · ${selectedTarget.subject}`
                                    : 'All My Students'}
                            </Text>
                            <Ionicons name="chevron-down" size={18} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Title */}
                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Title</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Exam Schedule Update"
                        placeholderTextColor={COLORS.textMuted}
                        value={title}
                        onChangeText={setTitle}
                    />
                </View>

                {/* Message */}
                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Message</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Type your announcement here..."
                        placeholderTextColor={COLORS.textMuted}
                        value={message}
                        onChangeText={setMessage}
                        multiline
                        numberOfLines={5}
                        textAlignVertical="top"
                    />
                </View>

                {/* Submit */}
                <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
                    {submitting ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="send" size={18} color="#fff" />
                            <Text style={styles.btnText}>{isEditMode ? 'Update' : 'Post Announcement'}</Text>
                        </>
                    )}
                </TouchableOpacity>
            </ScrollView>

            {/* Audience Picker Modal */}
            <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Audience</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity
                            style={styles.modalItem}
                            onPress={() => { setSelectedTarget(null); setModalVisible(false); }}
                        >
                            <Ionicons name="people" size={18} color={COLORS.accent} />
                            <Text style={[styles.modalItemText, { fontWeight: 'bold' }]}>All My Students</Text>
                        </TouchableOpacity>
                        <FlatList
                            data={teacherClasses}
                            keyExtractor={(item, i) => `${item.subject}-${i}`}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.modalItem}
                                    onPress={() => { setSelectedTarget(item); setModalVisible(false); }}
                                >
                                    <Ionicons name="book-outline" size={16} color={COLORS.textSecondary} />
                                    <Text style={styles.modalItemText}>
                                        {item.dept} · Sem {item.semester} · {item.subject}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const getStyles = (COLORS, GRADIENT, isDark) => StyleSheet.create({
    root: { flex: 1, backgroundColor: COLORS.bg },
    container: { padding: 24, paddingBottom: 50 },
    pageTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 24 },
    fieldGroup: { marginBottom: 20 },
    label: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    input: { backgroundColor: COLORS.bgCard, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 14, fontSize: 15, color: COLORS.textPrimary },
    textArea: { height: 130 },
    selector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.bgCard, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 14 },
    selectorText: { fontSize: 15, color: COLORS.textPrimary, flex: 1 },
    submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: COLORS.accent, borderRadius: 14, padding: 16, marginTop: 12 },
    btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalSheet: { backgroundColor: COLORS.bgMid, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '70%', borderTopWidth: 1, borderColor: COLORS.border },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary },
    modalItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    modalItemText: { fontSize: 15, color: COLORS.textPrimary, flex: 1 },
});

export default CreateAnnouncementScreen;
