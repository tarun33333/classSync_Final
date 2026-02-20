import React, { useEffect, useState } from 'react';
import {
    View, Text, FlatList, StyleSheet, ActivityIndicator,
    TouchableOpacity, RefreshControl, Alert, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import client from '../api/client';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';

const AnnouncementsScreen = ({ route }) => {
    const { colors: COLORS, gradient: GRADIENT, isDark } = useTheme();
    const styles = getStyles(COLORS, GRADIENT, isDark);

    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
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

    useEffect(() => { fetchAnnouncements(); }, []);
    const onRefresh = () => { setRefreshing(true); fetchAnnouncements(); };

    const handleDelete = (id) => {
        Alert.alert('Delete Announcement', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive',
                onPress: async () => {
                    try {
                        await client.delete(`/announcements/${id}`);
                        setAnnouncements(prev => prev.filter(a => a._id !== id));
                    } catch {
                        Alert.alert('Error', 'Failed to delete announcement');
                    }
                }
            }
        ]);
    };

    const renderItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.iconBadge}>
                    <Ionicons name="megaphone" size={18} color={COLORS.accent} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.title}>{item.title}</Text>
                    <Text style={styles.meta}>{item.authorName} · {new Date(item.date).toLocaleDateString()}</Text>
                </View>
                {role === 'teacher' && (
                    <View style={styles.actions}>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('CreateAnnouncement', { announcement: item })}
                            style={styles.iconBtn}
                        >
                            <Ionicons name="create-outline" size={20} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDelete(item._id)} style={styles.iconBtn}>
                            <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
                        </TouchableOpacity>
                    </View>
                )}
            </View>
            <Text style={styles.message}>{item.message}</Text>
        </View>
    );

    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
            <LinearGradient colors={GRADIENT} style={StyleSheet.absoluteFill} />

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={COLORS.accent} />
                </View>
            ) : (
                <FlatList
                    data={announcements}
                    keyExtractor={item => item._id}
                    renderItem={renderItem}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={COLORS.accent}
                            colors={[COLORS.accent]}
                        />
                    }
                    ListHeaderComponent={<Text style={styles.pageTitle}>📢 Notice Board</Text>}
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Ionicons name="megaphone-outline" size={40} color={COLORS.textMuted} />
                            <Text style={styles.noData}>No announcements yet.</Text>
                        </View>
                    }
                    contentContainerStyle={styles.list}
                />
            )}

            {role === 'teacher' && (
                <TouchableOpacity
                    style={styles.fab}
                    onPress={() => navigation.navigate('CreateAnnouncement')}
                >
                    <Ionicons name="add" size={28} color="#fff" />
                </TouchableOpacity>
            )}
        </View>
    );
};

const getStyles = (COLORS, GRADIENT, isDark) => StyleSheet.create({
    root: { flex: 1, backgroundColor: COLORS.bg },
    list: { padding: 16, paddingBottom: 100 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
    pageTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 16 },
    card: { backgroundColor: COLORS.bgCard, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
    iconBadge: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.accentLight, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 16, fontWeight: 'bold', color: COLORS.textPrimary },
    meta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 3 },
    message: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20 },
    actions: { flexDirection: 'row', gap: 4 },
    iconBtn: { padding: 4 },
    noData: { color: COLORS.textMuted, marginTop: 12, fontSize: 15 },
    fab: { position: 'absolute', bottom: 24, right: 24, backgroundColor: COLORS.accent, width: 58, height: 58, borderRadius: 29, justifyContent: 'center', alignItems: 'center', elevation: 6 },
});

export default AnnouncementsScreen;
