import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image, ActivityIndicator, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import client from '../api/client';
import * as SecureStore from 'expo-secure-store';
import ConfettiCannon from 'react-native-confetti-cannon';

const { width } = Dimensions.get('window');

const FaceLivenessScreen = () => {
    const [permission, requestPermission] = useCameraPermissions();
    const [cameraRef, setCameraRef] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const navigation = useNavigation();
    const route = useRoute();
    const { sessionId, code, method } = route.params;
    const [showConfetti, setShowConfetti] = useState(false);

    const [challenge, setChallenge] = useState('open_mouth');
    const [instruction, setInstruction] = useState('Open Mouth!');

    const challenges = [
        { key: 'open_mouth', text: 'Open Mouth!' },
        { key: 'turn_left', text: 'Turn Head LEFT!' },
        { key: 'turn_right', text: 'Turn Head RIGHT!' },
        { key: 'blink', text: 'Close BOTH Eyes!' }
    ];

    useEffect(() => {
        if (permission && !permission.granted) {
            requestPermission();
        }
        // Pick random challenge on mount
        const random = challenges[Math.floor(Math.random() * challenges.length)];
        setChallenge(random.key);
        setInstruction(random.text);
    }, [permission]);

    const handleCapture = async () => {
        if (!cameraRef) return;
        setIsProcessing(true);
        try {
            const photo = await cameraRef.takePictureAsync({
                quality: 0.7,
                base64: false,
            });

            // Upload to Backend
            const formData = new FormData();
            formData.append('image', {
                uri: photo.uri,
                type: 'image/jpeg',
                name: 'verification.jpg',
            });
            formData.append('challenge', challenge); // Send the challenge type

            formData.append('sessionId', sessionId);
            formData.append('code', code);
            formData.append('method', method);

            const token = await SecureStore.getItemAsync('userToken');
            const response = await client.post('/attendance/mark-with-face', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}`,
                },
            });

            setShowConfetti(true);
            setTimeout(() => {
                navigation.navigate('StudentMain');
            }, 2500);

        } catch (error) {
            const msg = error.response?.data?.message || 'Verification Failed';
            Alert.alert('Verification Failed', msg);
        } finally {
            setIsProcessing(false);
        }
    };

    if (!permission) return <View style={styles.container} />;
    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <Text style={{ textAlign: 'center', color: '#fff', marginBottom: 20 }}>
                    We need your permission to show the camera
                </Text>
                <TouchableOpacity onPress={requestPermission} style={styles.permissionButton}>
                    <Text style={styles.buttonText}>Grant Permission</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <CameraView
                style={styles.camera}
                facing="front"
                ref={(ref) => setCameraRef(ref)}
            >
                {/* Dark Overlay with Transparent Cutout */}
                <View style={styles.overlayContainer}>
                    <View style={styles.topMask} />
                    <View style={styles.middleRow}>
                        <View style={styles.sideMask} />
                        <View style={styles.cutoutContainer}>
                            <View style={styles.cutout} />
                        </View>
                        <View style={styles.sideMask} />
                    </View>
                    <View style={styles.bottomMask}>
                        <View style={{ marginBottom: 20 }}>
                            <Text style={{ fontSize: 24, fontWeight: 'bold', color: 'white', textShadowRadius: 5, textShadowColor: 'black', textAlign: 'center' }}>
                                {instruction}
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={styles.captureButton}
                            onPress={handleCapture}
                            disabled={isProcessing}
                        >
                            {isProcessing ? (
                                <ActivityIndicator color="#000" size="large" />
                            ) : (
                                <Ionicons name="camera" size={40} color="#000" />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </CameraView>
            {showConfetti && (
                <ConfettiCannon count={150} origin={{ x: width / 2, y: -20 }} fadeOut={true} />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    camera: {
        flex: 1,
    },
    overlayContainer: {
        flex: 1,
    },
    topMask: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    middleRow: {
        flexDirection: 'row',
        height: 350, // Height of the oval cutout area
    },
    sideMask: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    cutoutContainer: {
        width: 300, // Width of the oval cutout
        alignItems: 'center',
        justifyContent: 'center',
    },
    cutout: {
        width: '100%',
        height: '100%',
        borderRadius: 150, // Makes it an oval
        borderWidth: 2,
        borderColor: '#fff',
        backgroundColor: 'transparent',
    },
    bottomMask: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 40,
    },
    instructionText: {
        position: 'absolute',
        top: -40,
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
    },
    captureButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
    },
    permissionButton: {
        backgroundColor: '#2196F3',
        padding: 15,
        borderRadius: 8,
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
    },
});

export default FaceLivenessScreen;
