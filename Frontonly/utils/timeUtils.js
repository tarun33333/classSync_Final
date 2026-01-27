/**
 * Formats a time string (HH:mm) or Date string/object to 12-hour format (h:mm AM/PM).
 * @param {string|Date} time - The time to format (e.g., "14:30", "2023-10-27T14:30:00.000Z", or Date object).
 * @returns {string} - Formatted time string (e.g., "2:30 PM").
 */
export const formatTime = (time) => {
    if (!time) return '';
    if (time === 'Live' || time === 'Now') return time;

    try {
        // Handle "HH:mm" strings (e.g., "14:30")
        if (typeof time === 'string' && time.includes(':') && time.length === 5) {
            const [hours, minutes] = time.split(':').map(Number);
            const period = hours >= 12 ? 'PM' : 'AM';
            const hours12 = hours % 12 || 12;
            return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
        }

        // Handle Date objects or ISO strings
        const date = new Date(time);
        if (isNaN(date.getTime())) return time; // Return original if invalid date

        return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch (error) {
        console.error('Error formatting time:', error);
        return time;
    }
};
