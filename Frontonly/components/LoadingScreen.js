import React, { useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, Animated, Modal, Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const DOT_COUNT = 3;
const DOT_SIZE = 10;
const DOT_COLOR = '#7c6af7';
const DOT_GAP = 10;

const PulsingDots = () => {
    const anims = useRef(Array.from({ length: DOT_COUNT }, () => new Animated.Value(0))).current;

    useEffect(() => {
        const animations = anims.map((anim, i) =>
            Animated.loop(
                Animated.sequence([
                    Animated.delay(i * 160),
                    Animated.timing(anim, {
                        toValue: 1,
                        duration: 400,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(anim, {
                        toValue: 0,
                        duration: 400,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.delay((DOT_COUNT - i - 1) * 160),
                ])
            )
        );
        animations.forEach(a => a.start());
        return () => animations.forEach(a => a.stop());
    }, []);

    return (
        <View style={styles.dotsRow}>
            {anims.map((anim, i) => (
                <Animated.View
                    key={i}
                    style={[
                        styles.dot,
                        {
                            transform: [{
                                translateY: anim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0, -10],
                                }),
                            }],
                            opacity: anim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.35, 1],
                            }),
                        },
                    ]}
                />
            ))}
        </View>
    );
};

const LoadingScreen = ({ visible = false, message = 'Authenticating...' }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.88)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1, duration: 250, useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1, friction: 7, tension: 65, useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.timing(fadeAnim, {
                toValue: 0, duration: 180, useNativeDriver: true,
            }).start();
            scaleAnim.setValue(0.88);
        }
    }, [visible]);

    if (!visible) return null;

    return (
        <Modal transparent animationType="none" visible={visible}>
            {/* Dark blurred overlay */}
            <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
                <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
                    {/* Gradient icon circle */}
                    <LinearGradient
                        colors={['#7c6af7', '#aa4b6b']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.iconCircle}
                    >
                        <Ionicons name="lock-closed" size={26} color="#fff" />
                    </LinearGradient>

                    <Text style={styles.title}>ClassSync</Text>
                    <Text style={styles.subtitle}>{message}</Text>

                    <PulsingDots />
                </Animated.View>
            </Animated.View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(10, 8, 30, 0.82)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        backgroundColor: 'rgba(26, 21, 53, 0.97)',
        borderRadius: 28,
        paddingVertical: 36,
        paddingHorizontal: 40,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(124, 106, 247, 0.3)',
        // iOS shadow
        shadowColor: '#7c6af7',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
        // Android
        elevation: 16,
        minWidth: 220,
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 18,
    },
    title: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '800',
        letterSpacing: 1.5,
        marginBottom: 6,
    },
    subtitle: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 13,
        fontWeight: '500',
        marginBottom: 24,
        letterSpacing: 0.3,
    },
    dotsRow: {
        flexDirection: 'row',
        gap: DOT_GAP,
        alignItems: 'center',
        height: DOT_SIZE + 12,
    },
    dot: {
        width: DOT_SIZE,
        height: DOT_SIZE,
        borderRadius: DOT_SIZE / 2,
        backgroundColor: DOT_COLOR,
    },
});

export default LoadingScreen;
