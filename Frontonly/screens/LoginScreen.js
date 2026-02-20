import React, { useContext, useState, useEffect, useRef } from 'react';
import {
    View,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Dimensions,
    Animated,
} from 'react-native';
import { TextInput, Button, Text, HelperText } from 'react-native-paper';
import { AuthContext } from '../context/AuthContext';
import * as Application from 'expo-application';
import LoadingScreen from '../components/LoadingScreen';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const LoginScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [secureTextEntry, setSecureTextEntry] = useState(true);
    const { login, isLoading } = useContext(AuthContext);
    const [deviceId, setDeviceId] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');

    // Subtle fade-in animation for the card using built-in Animated
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        const getDeviceId = async () => {
            let id = 'unknown';
            if (Platform.OS === 'android') {
                id = Application.androidId;
            } else if (Platform.OS === 'ios') {
                id = await Application.getIosIdForVendorAsync();
            }
            setDeviceId(id);
        };
        getDeviceId();

        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 800,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const handleLogin = async () => {
        setErrorMessage('');
        if (!email || !password) {
            setErrorMessage('Please enter email and password');
            return;
        }
        try {
            await login(email, password, deviceId);
        } catch (error) {
            setErrorMessage(error.response?.data?.message || 'Login failed.');
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            {/* Background Gradient */}
            <LinearGradient
                colors={['#0f0c29', '#302b63', '#24243e']}
                style={styles.background}
            />

            {/* Decorative static orbs */}
            <View style={[styles.orb, styles.orb1]} />
            <View style={[styles.orb, styles.orb2]} />
            <View style={[styles.orb, styles.orb3]} />

            {/* Animated card */}
            <Animated.View
                style={[
                    styles.centerContainer,
                    { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
                ]}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text variant="displaySmall" style={styles.title}>ClassSync</Text>
                    <Text variant="titleSmall" style={styles.subtitle}>Future of Attendance</Text>
                </View>

                {/* Frosted card  — no native blur, uses rgba + border */}
                <View style={styles.glassContainer}>
                    <Text variant="headlineSmall" style={styles.welcomeText}>Welcome Back</Text>

                    <TextInput
                        label="Email"
                        value={email}
                        onChangeText={setEmail}
                        mode="outlined"
                        autoCapitalize="none"
                        keyboardType="email-address"
                        textColor="#FFFFFF"
                        activeOutlineColor="#7c6af7"
                        outlineColor="rgba(255,255,255,0.2)"
                        style={styles.input}
                        theme={{ colors: { onSurfaceVariant: 'rgba(255,255,255,0.6)', background: '#1a1535' } }}
                        left={<TextInput.Icon icon="email" color="rgba(255,255,255,0.6)" />}
                    />

                    <TextInput
                        label="Password"
                        value={password}
                        onChangeText={setPassword}
                        mode="outlined"
                        secureTextEntry={secureTextEntry}
                        textColor="#FFFFFF"
                        activeOutlineColor="#7c6af7"
                        outlineColor="rgba(255,255,255,0.2)"
                        style={styles.input}
                        theme={{ colors: { onSurfaceVariant: 'rgba(255,255,255,0.6)', background: '#1a1535' } }}
                        right={
                            <TextInput.Icon
                                icon={secureTextEntry ? 'eye' : 'eye-off'}
                                color="rgba(255,255,255,0.6)"
                                onPress={() => setSecureTextEntry(!secureTextEntry)}
                            />
                        }
                        left={<TextInput.Icon icon="lock" color="rgba(255,255,255,0.6)" />}
                    />

                    {errorMessage ? (
                        <HelperText type="error" visible style={styles.errorText}>
                            {errorMessage}
                        </HelperText>
                    ) : null}

                    <Button
                        mode="contained"
                        onPress={handleLogin}
                        style={styles.button}
                        contentStyle={styles.buttonContent}
                        labelStyle={styles.buttonLabel}
                        loading={isLoading}
                        disabled={isLoading}
                    >
                        Log In
                    </Button>
                </View>

                <Text style={styles.footer}>Device ID: {deviceId}</Text>
            </Animated.View>

            <LoadingScreen visible={isLoading} message="Authenticating..." />
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f0c29',
    },
    background: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 36,
    },
    title: {
        fontWeight: 'bold',
        color: '#FFFFFF',
        letterSpacing: 2,
    },
    subtitle: {
        color: 'rgba(255,255,255,0.6)',
        marginTop: 6,
        letterSpacing: 1,
    },
    // Frosted glass card using rgba — no native blur needed
    glassContainer: {
        borderRadius: 24,
        padding: 28,
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    welcomeText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        marginBottom: 22,
        textAlign: 'center',
    },
    input: {
        marginBottom: 14,
        backgroundColor: 'transparent',
    },
    button: {
        marginTop: 12,
        borderRadius: 14,
        backgroundColor: '#7c6af7',
    },
    buttonContent: {
        paddingVertical: 8,
    },
    buttonLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    errorText: {
        textAlign: 'center',
        marginBottom: 6,
        color: '#FF8A80',
    },
    footer: {
        textAlign: 'center',
        color: 'rgba(255,255,255,0.3)',
        marginTop: 28,
        fontSize: 11,
    },
    // Static decorative orbs — no animation library needed
    orb: {
        position: 'absolute',
        borderRadius: 999,
    },
    orb1: {
        width: 220,
        height: 220,
        backgroundColor: 'rgba(124,106,247,0.25)',
        top: -60,
        left: -60,
    },
    orb2: {
        width: 180,
        height: 180,
        backgroundColor: 'rgba(38,208,206,0.18)',
        bottom: height * 0.08,
        right: -50,
    },
    orb3: {
        width: 120,
        height: 120,
        backgroundColor: 'rgba(170,75,107,0.2)',
        top: height * 0.4,
        left: width * 0.6,
    },
});

export default LoginScreen;
