import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import client from '../api/client';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const AnnouncementsScreen = ({ route }) => {
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Determine user role to show "Create" button for teachers
    const { role } = route.params || { role: 'student' };
    const navigation = useNavigation();

    const fetchAnnouncements = async () => {
        try {
            const res = await client.get('/announcements');
            setAnnouncements(res.data);
        } catch (error) {
            console.log('Error fetching announcements', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchAnnouncements();
    };

    const handleDelete = (id) => {
        Alert.alert(
            'Delete Announcement',
            'Are you sure you want to delete this announcement?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await client.delete(`/announcements/${id}`);
                            setAnnouncements(prev => prev.filter(a => a._id !== id));
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete announcement');
                        }
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.header}>
                <Ionicons name="megaphone-outline" size={24} color="#4834d4" />
                <View style={[styles.headerText, { flex: 1 }]}>
                    <Text style={styles.title}>{item.title}</Text>
                    <Text style={styles.author}>{item.authorName} • {new Date(item.date).toLocaleDateString()}</Text>
                </View>
                {role === 'teacher' && (
                    <View style={styles.actions}>
                        <TouchableOpacity onPress={() => navigation.navigate('CreateAnnouncement', { announcement: item })}>
                            <Ionicons name="create-outline" size={24} color="#666" style={{ marginRight: 15 }} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDelete(item._id)}>
                            <Ionicons name="trash-outline" size={24} color="#ff4757" />
                        </TouchableOpacity>
                    </View>
                )}
            </View>
            <Text style={styles.message}>{item.message}</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            {loading ? (
                <ActivityIndicator size="large" color="#4834d4" style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={announcements}
                    keyExtractor={(item) => item._id}
                    renderItem={renderItem}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={<Text style={styles.noData}>No announcements yet.</Text>}
                    contentContainerStyle={{ paddingBottom: 80 }}
                />
            )}

            {role === 'teacher' && (
                <TouchableOpacity
                    style={styles.fab}
                    onPress={() => navigation.navigate('CreateAnnouncement')}
                >
                    <Ionicons name="add" size={30} color="#fff" />
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fa', padding: 15 },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 15,
        marginBottom: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: 2 }
    },
    header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
    headerText: { marginLeft: 10 },
    actions: { flexDirection: 'row', marginLeft: 10 },
    title: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    author: { fontSize: 12, color: '#888', marginTop: 2 },
    message: { fontSize: 14, color: '#555', lineHeight: 20 },
    noData: { textAlign: 'center', marginTop: 50, color: '#aaa', fontSize: 16 },
    fab: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        backgroundColor: '#4834d4',
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5
    }
});

export default AnnouncementsScreen;
