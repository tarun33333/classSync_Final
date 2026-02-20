import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const LottieSplashScreen = ({ onFinish }) => {
    const scaleAnim = useRef(new Animated.Value(0.7)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const pulse1 = useRef(new Animated.Value(1)).current;
    const pulse2 = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Fade + scale in the logo
        Animated.parallel([
            Animated.timing(opacityAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 50,
                friction: 7,
                useNativeDriver: true,
            }),
        ]).start(() => {
            // After appearing, pulse rings then finish
            Animated.sequence([
                Animated.parallel([
                    Animated.timing(pulse1, {
                        toValue: 2.2,
                        duration: 700,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulse2, {
                        toValue: 1.8,
                        duration: 900,
                        useNativeDriver: true,
                    }),
                ]),
                Animated.delay(300),
            ]).start(() => {
                if (onFinish) onFinish();
            });
        });
    }, []);

    return (
        <LinearGradient
            colors={['#0f0c29', '#302b63', '#24243e']}
            style={styles.container}
        >
            {/* Pulsing rings */}
            <Animated.View
                style={[
                    styles.ring,
                    styles.ring1,
                    { transform: [{ scale: pulse1 }], opacity: pulse1.interpolate({ inputRange: [1, 2.2], outputRange: [0.4, 0] }) },
                ]}
            />
            <Animated.View
                style={[
                    styles.ring,
                    styles.ring2,
                    { transform: [{ scale: pulse2 }], opacity: pulse2.interpolate({ inputRange: [1, 1.8], outputRange: [0.3, 0] }) },
                ]}
            />

            {/* Logo + text */}
            <Animated.View
                style={[
                    styles.logoContainer,
                    { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
                ]}
            >
                <View style={styles.iconCircle}>
                    <Text style={styles.iconText}>CS</Text>
                </View>
                <Text style={styles.appName}>ClassSync</Text>
                <Text style={styles.tagline}>Future of Attendance</Text>
            </Animated.View>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoContainer: {
        alignItems: 'center',
    },
    iconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(124,106,247,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    iconText: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#FFFFFF',
        letterSpacing: 2,
    },
    appName: {
        fontSize: 34,
        fontWeight: 'bold',
        color: '#FFFFFF',
        letterSpacing: 3,
    },
    tagline: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.55)',
        letterSpacing: 1.5,
        marginTop: 8,
    },
    ring: {
        position: 'absolute',
        borderRadius: 999,
        borderWidth: 2,
        borderColor: 'rgba(124,106,247,0.5)',
    },
    ring1: {
        width: 130,
        height: 130,
    },
    ring2: {
        width: 130,
        height: 130,
        borderColor: 'rgba(38,208,206,0.4)',
    },
});

export default LottieSplashScreen;
