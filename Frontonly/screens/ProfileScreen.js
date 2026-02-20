import React, { useContext, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, StatusBar,
    ScrollView, Image, Alert, ActivityIndicator, Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import client from '../api/client';

const ProfileScreen = () => {
    const { logout, userInfo, userRole, setUserInfo } = useContext(AuthContext);
    const { isDark, colors, gradient, toggleTheme } = useTheme();
    const [uploading, setUploading] = useState(false);
    const [themeLoading, setThemeLoading] = useState(false);

    const initial = userInfo?.name?.charAt(0).toUpperCase() || 'U';
    const photoUri = userInfo?.profilePhoto || null;

    const pickPhoto = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Allow photo library access to set a profile picture.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
            base64: true,
        });
        if (result.canceled) return;

        const asset = result.assets[0];
        setUploading(true);
        try {
            const dataUri = `data:image/jpeg;base64,${asset.base64}`;
            const res = await client.put('/auth/profile-photo', { photoBase64: dataUri });
            if (setUserInfo) {
                setUserInfo(prev => ({ ...prev, profilePhoto: res.data.profilePhoto }));
            }
        } catch (e) {
            Alert.alert('Error', 'Failed to upload photo. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const handleThemeToggle = async () => {
        setThemeLoading(true);
        await toggleTheme();
        setThemeLoading(false);
    };

    const rows = [
        { label: 'Name', value: userInfo?.name, icon: 'person-outline' },
        { label: 'Email', value: userInfo?.email, icon: 'mail-outline' },
        { label: 'Role', value: userRole?.toUpperCase(), icon: 'shield-outline' },
        ...(userRole === 'student' ? [
            { label: 'Roll Number', value: userInfo?.rollNumber, icon: 'id-card-outline' },
            { label: 'Department', value: userInfo?.department, icon: 'school-outline' },
            ...(userInfo?.advisorName ? [{ label: 'Class Advisor', value: userInfo?.advisorName, icon: 'person-circle-outline' }] : []),
        ] : []),
        ...(userRole === 'teacher' ? [
            { label: 'Department', value: userInfo?.department, icon: 'school-outline' },
        ] : []),
    ];

    const s = makeStyles(colors);

    return (
        <View style={s.root}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
            <LinearGradient colors={gradient} style={StyleSheet.absoluteFill} />
            <SafeAreaView style={s.safe}>
                <ScrollView contentContainerStyle={s.container}>
                    <Text style={s.pageTitle}>My Profile</Text>

                    {/* Avatar */}
                    <View style={s.avatarContainer}>
                        <TouchableOpacity onPress={pickPhoto} activeOpacity={0.8} style={s.avatarWrapper}>
                            {photoUri ? (
                                <Image source={{ uri: photoUri }} style={s.avatarImage} />
                            ) : (
                                <LinearGradient
                                    colors={[colors.accent, colors.accentDark]}
                                    style={s.avatarImage}
                                >
                                    <Text style={s.avatarText}>{initial}</Text>
                                </LinearGradient>
                            )}
                            <View style={s.cameraBadge}>
                                {uploading
                                    ? <ActivityIndicator size="small" color="#fff" />
                                    : <Ionicons name="camera" size={14} color="#fff" />
                                }
                            </View>
                        </TouchableOpacity>
                        <Text style={s.avatarName}>{userInfo?.name}</Text>
                        <View style={s.roleBadge}>
                            <Text style={s.roleText}>{userRole?.toUpperCase()}</Text>
                        </View>
                        <Text style={s.tapHint}>Tap photo to change</Text>
                    </View>

                    {/* Info Card */}
                    <View style={s.card}>
                        {rows.map((row, i) => (
                            <View key={i} style={[s.infoRow, i < rows.length - 1 && s.infoRowBorder]}>
                                <View style={s.labelRow}>
                                    <Ionicons name={row.icon} size={16} color={colors.accent} style={{ marginRight: 8 }} />
                                    <Text style={s.label}>{row.label}</Text>
                                </View>
                                <Text style={s.value}>{row.value || '–'}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Theme Toggle Card */}
                    <View style={s.card}>
                        <View style={s.infoRow}>
                            <View style={s.labelRow}>
                                <Ionicons
                                    name={isDark ? 'moon' : 'sunny'}
                                    size={16}
                                    color={colors.accent}
                                    style={{ marginRight: 8 }}
                                />
                                <Text style={s.label}>{isDark ? 'Dark Mode' : 'Light Mode'}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                {themeLoading && <ActivityIndicator size="small" color={colors.accent} />}
                                <Switch
                                    value={!isDark}
                                    onValueChange={handleThemeToggle}
                                    thumbColor={isDark ? '#fff' : colors.accent}
                                    trackColor={{ false: 'rgba(124,106,247,0.3)', true: colors.accent }}
                                    disabled={themeLoading}
                                />
                            </View>
                        </View>
                    </View>

                    {/* Logout */}
                    <TouchableOpacity style={s.logoutButton} onPress={logout}>
                        <Ionicons name="log-out-outline" size={20} color="#fff" />
                        <Text style={s.logoutText}>Logout</Text>
                    </TouchableOpacity>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
};

const makeStyles = (C) => StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    safe: { flex: 1 },
    container: { padding: 24, paddingBottom: 40 },
    pageTitle: { fontSize: 24, fontWeight: 'bold', color: C.textPrimary, marginBottom: 28, textAlign: 'center' },
    avatarContainer: { alignItems: 'center', marginBottom: 32 },
    avatarWrapper: { position: 'relative', marginBottom: 14 },
    avatarImage: {
        width: 96, height: 96, borderRadius: 48,
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 3, borderColor: C.accent,
    },
    avatarText: { fontSize: 36, color: '#fff', fontWeight: 'bold' },
    cameraBadge: {
        position: 'absolute', bottom: 2, right: 2,
        width: 26, height: 26, borderRadius: 13,
        backgroundColor: C.accent, justifyContent: 'center', alignItems: 'center',
        borderWidth: 2, borderColor: C.bg,
    },
    avatarName: { fontSize: 20, fontWeight: '700', color: C.textPrimary, marginBottom: 8 },
    roleBadge: { backgroundColor: C.accentLight, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 4, borderWidth: 1, borderColor: C.borderAccent, marginBottom: 6 },
    roleText: { color: C.accent, fontWeight: '700', fontSize: 12 },
    tapHint: { fontSize: 11, color: C.textMuted },
    card: { backgroundColor: C.bgCard, borderRadius: 18, padding: 4, borderWidth: 1, borderColor: C.border, marginBottom: 16 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
    infoRowBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
    labelRow: { flexDirection: 'row', alignItems: 'center' },
    label: { fontSize: 14, color: C.textSecondary, fontWeight: '500' },
    value: { fontSize: 14, color: C.textPrimary, fontWeight: '600', maxWidth: '55%', textAlign: 'right' },
    logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.dangerBg, borderWidth: 1, borderColor: C.danger, padding: 16, borderRadius: 14, marginTop: 8 },
    logoutText: { color: C.danger, fontSize: 16, fontWeight: 'bold' },
});

export default ProfileScreen;
