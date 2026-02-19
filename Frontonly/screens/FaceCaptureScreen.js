import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import client from '../api/client';

const FaceCaptureScreen = ({ route, navigation }) => {
    const { mode, sessionId, code, method } = route.params || {}; // mode: 'register' | 'verify'
    const [hasPermission, setHasPermission] = useState(null);
    const cameraRef = useRef(null);
    const [loading, setLoading] = useState(false);
    const [capturedImage, setCapturedImage] = useState(null);

    useEffect(() => {
        (async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === 'granted');
        })();
    }, []);

    const takePicture = async () => {
        if (cameraRef.current) {
            const photo = await cameraRef.current.takePictureAsync({ quality: 0.5 });
            setCapturedImage(photo.uri);
        }
    };

    const retake = () => {
        setCapturedImage(null);
    };

    const uploadImage = async () => {
        setLoading(true);
        const formData = new FormData();
        formData.append('image', {
            uri: capturedImage,
            name: 'face.jpg',
            type: 'image/jpeg',
        });

        if (mode === 'verify') {
            formData.append('sessionId', sessionId);
            formData.append('code', code);
            formData.append('method', method); // 'otp' or 'qr'
        } else {
            // Register mode
            // We assume backend extracts userId from token or uses existing session
            // For now, let's just send the image.
        }

        try {
            let res;
            if (mode === 'verify') {
                res = await client.post('/attendance/mark-with-face', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                Alert.alert('Success', 'Attendance Marked with Face Verification!', [
                    { text: 'OK', onPress: () => navigation.navigate('StudentMain') }
                ]);
            } else {
                res = await client.post('/face/register', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                Alert.alert('Success', 'Face Registered Successfully!', [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            }
        } catch (error) {
            console.error(error);
            const msg = error.response?.data?.message || 'Upload Failed';
            Alert.alert('Error', msg);
        } finally {
            setLoading(false);
        }
    };

    if (hasPermission === null) {
        return <View style={styles.center}><ActivityIndicator /></View>;
    }
    if (hasPermission === false) {
        return <View style={styles.center}><Text>No camera access</Text></View>;
    }

    return (
        <View style={styles.container}>
            {capturedImage ? (
                <View style={styles.previewContainer}>
                    <Image source={{ uri: capturedImage }} style={styles.preview} />
                    <View style={styles.controls}>
                        <TouchableOpacity style={[styles.btn, styles.retakeBtn]} onPress={retake} disabled={loading}>
                            <Text style={styles.btnText}>Retake</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.btn, styles.uploadBtn]} onPress={uploadImage} disabled={loading}>
                            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>{mode === 'verify' ? 'Verify & Mark' : 'Register Face'}</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            ) : (
                <CameraView style={styles.camera} facing="front" ref={cameraRef}>
                    <View style={styles.overlay}>
                        <Text style={styles.instructions}>
                            {mode === 'verify' ? 'Position your face to verify' : 'Position your face to register'}
                        </Text>
                        <View style={styles.faceGuide} />
                        <TouchableOpacity style={styles.captureBtn} onPress={takePicture} />
                    </View>
                </CameraView>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    camera: { flex: 1 },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 50 },
    instructions: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginTop: 40 },
    faceGuide: { width: 250, height: 350, borderWidth: 2, borderColor: '#fff', borderRadius: 150, borderStyle: 'dashed' },
    captureBtn: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#fff', borderWidth: 5, borderColor: '#ccc', marginBottom: 20 },
    previewContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    preview: { width: '100%', height: '80%', resizeMode: 'contain' },
    controls: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', padding: 20 },
    btn: { padding: 15, borderRadius: 10, width: '40%', alignItems: 'center' },
    retakeBtn: { backgroundColor: '#e74c3c' },
    uploadBtn: { backgroundColor: '#2ecc71' },
    btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});

export default FaceCaptureScreen;
