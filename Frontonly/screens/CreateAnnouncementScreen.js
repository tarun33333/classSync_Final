import React, { useState, useContext, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Modal, FlatList } from 'react-native';
import client from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

const CreateAnnouncementScreen = ({ navigation, route }) => {
    const { userInfo, userRole } = useContext(AuthContext);
    const existingAnnouncement = route.params?.announcement;
    const isEditMode = !!existingAnnouncement;

    const [title, setTitle] = useState(existingAnnouncement ? existingAnnouncement.title : '');
    const [message, setMessage] = useState(existingAnnouncement ? existingAnnouncement.message : '');
    const [submitting, setSubmitting] = useState(false);

    // Targeting State
    const [teacherClasses, setTeacherClasses] = useState([]);
    const [selectedTarget, setSelectedTarget] = useState(null); // null = All Students
    const [modalVisible, setModalVisible] = useState(false);

    useEffect(() => {
        if (userRole === 'teacher') {
            fetchTeacherClasses();
        }
    }, []);

    const fetchTeacherClasses = async () => {
        try {
            const res = await client.get('/routines/teacher/classes');
            setTeacherClasses(res.data);
        } catch (error) {
            console.log('Error fetching classes:', error);
        }
    };

    const handleSubmit = async () => {
        if (!title.trim() || !message.trim()) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                title,
                message,
                authorName: userInfo.name,
                authorRole: userRole
            };

            // Add Targeting if selected
            if (selectedTarget) {
                payload.targetDept = selectedTarget.dept;
                payload.targetSemester = selectedTarget.semester;
                payload.targetSubject = selectedTarget.subject;
                // payload.targetSection = selectedTarget.section; // Routine aggregation didn't return section explicitly, adding if available in future
                // Note: The aggregation returned: dept, semester, subject, batch. 
            }

            if (isEditMode) {
                await client.put(`/announcements/${existingAnnouncement._id}`, payload);
                Alert.alert('Success', 'Announcement updated!');
            } else {
                await client.post('/announcements/create', payload);
                Alert.alert('Success', 'Announcement posted!');
            }
            navigation.goBack();
        } catch (error) {
            Alert.alert('Error', 'Failed to post announcement');
            console.log(error);
        } finally {
            setSubmitting(false);
        }
    };

    const renderClassItem = ({ item }) => (
        <TouchableOpacity
            style={styles.modalItem}
            onPress={() => {
                setSelectedTarget(item);
                setModalVisible(false);
            }}
        >
            <Text style={styles.modalItemText}>{item.dept} - Sem {item.semester} - {item.subject}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {userRole === 'teacher' && (
                <View style={styles.targetContainer}>
                    <Text style={styles.label}>To:</Text>
                    <TouchableOpacity style={styles.selector} onPress={() => setModalVisible(true)}>
                        <Text style={styles.selectorText}>
                            {selectedTarget
                                ? `${selectedTarget.dept} - Sem ${selectedTarget.semester} - ${selectedTarget.subject}`
                                : 'All My Students (Global)'}
                        </Text>
                        <Ionicons name="chevron-down" size={20} color="#666" />
                    </TouchableOpacity>
                </View>
            )}

            <Text style={styles.label}>Title</Text>
            <TextInput
                style={styles.input}
                placeholder="e.g. Exam Schedule Update"
                value={title}
                onChangeText={setTitle}
            />

            <Text style={styles.label}>Message</Text>
            <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Type your announcement here..."
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
            />

            <TouchableOpacity
                style={styles.button}
                onPress={handleSubmit}
                disabled={submitting}
            >
                {submitting ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.btnText}>{isEditMode ? 'Update Announcement' : 'Post Announcement'}</Text>
                )}
            </TouchableOpacity>

            {/* Target Selection Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalView}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Select Audience</Text>
                        <TouchableOpacity onPress={() => setModalVisible(false)}>
                            <Ionicons name="close" size={24} color="#333" />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={[styles.modalItem, { borderBottomWidth: 2 }]}
                        onPress={() => {
                            setSelectedTarget(null);
                            setModalVisible(false);
                        }}
                    >
                        <Text style={[styles.modalItemText, { fontWeight: 'bold' }]}>All My Students</Text>
                    </TouchableOpacity>

                    <FlatList
                        data={teacherClasses}
                        keyExtractor={(item, index) => `${item.subject}-${index}`}
                        renderItem={renderClassItem}
                    />
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff', padding: 20 },
    label: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 8, marginTop: 15 },
    input: {
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#eee'
    },
    textArea: { height: 120 },
    button: {
        backgroundColor: '#4834d4',
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 30
    },
    btnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

    // Targeting Styles
    targetContainer: { marginBottom: 10 },
    selector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#eef2f5',
        padding: 15,
        borderRadius: 8
    },
    selectorText: { fontSize: 16, color: '#333', fontWeight: '500' },

    // Modal
    modalView: {
        flex: 1,
        marginTop: 100,
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.2,
        shadowRadius: 4
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: 'bold' },
    modalItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
    modalItemText: { fontSize: 16 }
});

export default CreateAnnouncementScreen;
