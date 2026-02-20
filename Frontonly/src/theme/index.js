import { MD3LightTheme as DefaultTheme } from 'react-native-paper';

const theme = {
    ...DefaultTheme,
    colors: {
        ...DefaultTheme.colors,
        primary: '#4A148C', // Deep Purple
        onPrimary: '#FFFFFF',
        primaryContainer: '#E1BEE7',
        onPrimaryContainer: '#220033',
        secondary: '#00695C', // Teal
        onSecondary: '#FFFFFF',
        secondaryContainer: '#B2DFDB',
        onSecondaryContainer: '#00332C',
        background: '#F3E5F5', // Very light purple/gray
        surface: '#FFFFFF',
        error: '#B00020',
        onSurface: '#1C1B1F',
        outline: '#79747E',
    },
    roundness: 16,
};

export default theme;
