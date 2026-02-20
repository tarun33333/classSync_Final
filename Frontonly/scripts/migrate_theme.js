const fs = require('fs');
const path = require('path');

const screensDir = path.join(__dirname, '../screens');

function migrateFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Skip if already has useTheme (like ProfileScreen)
    if (content.includes('useTheme(')) return;

    // Check if it imports COLORS from theme/colors
    if (!content.includes('/theme/colors')) return;

    console.log('Migrating: ' + filePath);

    // 1. Replace import { COLORS, GRADIENT } from '../theme/colors';
    content = content.replace(/import\s*\{[^}]*COLORS[^}]*\}\s*from\s*['"]\.\.\/theme\/colors['"];?/,
        "import { useTheme } from '../context/ThemeContext';");

    // 2. Change const styles = StyleSheet.create({ to const getStyles = (COLORS, GRADIENT, isDark) => StyleSheet.create({
    if (content.includes('const styles = StyleSheet.create({')) {
        content = content.replace(
            /const styles = StyleSheet\.create\(\{/,
            "const getStyles = (COLORS, GRADIENT, isDark) => StyleSheet.create({"
        );

        // 3. Find the main component to inject the hooks
        // Look for typical signatures: const ScreenName = ({ route, navigation }) => {
        // or const ScreenName = () => {
        const componentRegex = /const\s+([A-Z][a-zA-Z0-9_]*)\s*=\s*\([^)]*\)\s*=>\s*\{/;
        const match = content.match(componentRegex);

        if (match) {
            const funcStart = match.index + match[0].length;
            const hookInjection = `\n    const { colors: COLORS, gradient: GRADIENT, isDark } = useTheme();\n    const styles = getStyles(COLORS, GRADIENT, isDark);\n`;
            content = content.slice(0, funcStart) + hookInjection + content.slice(funcStart);
        }
    }

    fs.writeFileSync(filePath, content, 'utf8');
}

fs.readdirSync(screensDir).forEach(file => {
    if (file.endsWith('.js')) {
        migrateFile(path.join(screensDir, file));
    }
});

console.log('Done!');
