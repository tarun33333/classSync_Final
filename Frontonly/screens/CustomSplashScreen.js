import React, { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Animated, Dimensions, Text } from 'react-native';

const CustomSplashScreen = ({ onFinish }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.5)).current;
    const translateY = useRef(new Animated.Value(50)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Sequence: Fade In + Slide Up + Rotate -> Pulse Scale -> Fade Out
        Animated.sequence([
            // Phase 1: Enter
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 6,
                    tension: 40,
                    useNativeDriver: true,
                }),
                Animated.timing(translateY, {
                    toValue: 0,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(rotateAnim, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                })
            ]),
            // Phase 2: Hold & Pulse
            Animated.loop(
                Animated.sequence([
                    Animated.timing(scaleAnim, {
                        toValue: 1.05,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(scaleAnim, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    })
                ]),
                { iterations: 2 }
            ),
            // Phase 3: Exit
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 500,
                useNativeDriver: true,
            })
        ]).start(() => onFinish());
    }, []);

    const spin = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg']
    });

    return (
        <View style={styles.container}>
            <Animated.View style={[styles.logoContainer, {
                opacity: fadeAnim,
                transform: [
                    { scale: scaleAnim },
                    { translateY: translateY },
                    // { rotate: spin } // Rotate looks cool but might be too much for a hexagon. Uncomment if desired.
                ]
            }]}>
                <Image
                    source={require('../assets/splash_premium.jpg')}
                    style={styles.logo}
                    resizeMode="contain"
                />
                <Text style={styles.title}>ClassSync</Text>
                <Text style={styles.subtitle}>Smart Attendance System</Text>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0c0c20', // Midnight Blue
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoContainer: {
        alignItems: 'center',
    },
    logo: {
        width: 150,
        height: 150,
        marginBottom: 20,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#00d2d3', // Cyan
        letterSpacing: 1.5,
        marginBottom: 5,
    },
    subtitle: {
        fontSize: 14,
        color: '#c8d6e5', // Light Gray-Blue
        letterSpacing: 1,
    }
});

export default CustomSplashScreen;
