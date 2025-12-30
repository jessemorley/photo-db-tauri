/**
 * Shared constants and utility functions to eliminate code duplication
 */
class Constants {
    /**
     * Supported image file extensions
     */
    static IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff'];
    
    /**
     * ITU-R BT.709 luminosity calculation coefficients
     */
    static LUMINOSITY_COEFFICIENTS = {
        red: 0.2126,
        green: 0.7152,
        blue: 0.0722
    };
    
    /**
     * Calculate luminosity using ITU-R BT.709 standard
     * @param {number} r - Red component (0-255)
     * @param {number} g - Green component (0-255)  
     * @param {number} b - Blue component (0-255)
     * @returns {number} Luminosity value (0-255)
     */
    static calculateLuminosity(r, g, b) {
        const { red, green, blue } = this.LUMINOSITY_COEFFICIENTS;
        return Math.round(red * r + green * g + blue * b);
    }
    
    /**
     * Check if file has supported image extension
     * @param {string} filename - File name or path
     * @returns {boolean} True if file is a supported image format
     */
    static isImageFile(filename) {
        const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
        return this.IMAGE_EXTENSIONS.includes(ext);
    }
    
    /**
     * Convert RGB values to hex color string
     * @param {number} r - Red component (0-255)
     * @param {number} g - Green component (0-255)
     * @param {number} b - Blue component (0-255)
     * @returns {string} Hex color string (e.g., "#FF0000")
     */
    static rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(x => {
            const hexValue = x.toString(16);
            return hexValue.length === 1 ? '0' + hexValue : hexValue;
        }).join('').toUpperCase();
    }
}