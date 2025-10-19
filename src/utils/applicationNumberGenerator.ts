/**
 * Application Number Generation Utility
 * 
 * Generates unique application numbers in the format: XXXXXX/YY-YY
 * Where:
 * - XXXXXX: 6-digit sequential number
 * - YY-YY: Academic year (e.g., 25-26 for 2025-2026)
 */

import Application from '../models/Application';

/**
 * Get the current academic year in YY-YY format
 * Academic year runs from September to August
 * e.g., 2024-2025 academic year = 24-25
 */
export function getCurrentAcademicYear(): string {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // getMonth() returns 0-11
    
    // Academic year starts in September (month 9)
    let academicYearStart: number;
    if (currentMonth >= 9) {
        // We're in the academic year that started this year
        academicYearStart = currentYear;
    } else {
        // We're in the academic year that started last year
        academicYearStart = currentYear - 1;
    }
    
    const academicYearEnd = academicYearStart + 1;
    
    // Convert to YY format
    const startYY = academicYearStart.toString().slice(-2);
    const endYY = academicYearEnd.toString().slice(-2);
    
    return `${startYY}-${endYY}`;
}

/**
 * Generate the next sequential number for the current academic year
 */
export async function getNextApplicationNumber(): Promise<string> {
    const academicYear = getCurrentAcademicYear();
    
    try {
        // Find the highest application number for the current academic year
        const lastApplication = await Application.findOne({
            applicationNumber: { $regex: `^\\d{6}/${academicYear}$` }
        })
        .sort({ applicationNumber: -1 })
        .select('applicationNumber');
        
        let nextNumber = 1;
        
        if (lastApplication) {
            // Extract the number part and increment
            const numberPart = lastApplication.applicationNumber.split('/')[0];
            nextNumber = parseInt(numberPart) + 1;
        }
        
        // Format as 6-digit number with leading zeros
        const formattedNumber = nextNumber.toString().padStart(6, '0');
        
        return `${formattedNumber}/${academicYear}`;
        
    } catch (error) {
        console.error('Error generating application number:', error);
        throw new Error('Failed to generate application number');
    }
}

/**
 * Validate application number format
 * @param applicationNumber - The application number to validate
 * @returns boolean indicating if the format is valid
 */
export function validateApplicationNumberFormat(applicationNumber: string): boolean {
    // Format: XXXXXX/YY-YY (6 digits, slash, 2 digits, dash, 2 digits)
    const pattern = /^\d{6}\/\d{2}-\d{2}$/;
    return pattern.test(applicationNumber);
}

/**
 * Extract academic year from application number
 * @param applicationNumber - The application number
 * @returns academic year string or null if invalid
 */
export function extractAcademicYear(applicationNumber: string): string | null {
    if (!validateApplicationNumberFormat(applicationNumber)) {
        return null;
    }
    
    const parts = applicationNumber.split('/');
    return parts[1]; // Returns YY-YY format
}

/**
 * Extract sequential number from application number
 * @param applicationNumber - The application number
 * @returns sequential number or null if invalid
 */
export function extractSequentialNumber(applicationNumber: string): number | null {
    if (!validateApplicationNumberFormat(applicationNumber)) {
        return null;
    }
    
    const parts = applicationNumber.split('/');
    const numberPart = parts[0];
    return parseInt(numberPart);
}

// Example usage and testing functions
export const ApplicationNumberExamples = {
    // Examples of valid application numbers
    valid: [
        '000001/24-25',
        '000123/24-25',
        '999999/25-26',
        '352546/25-26' // User's example
    ],
    
    // Examples of invalid application numbers
    invalid: [
        '12345/24-25',    // Too few digits
        '1234567/24-25', // Too many digits
        '123456/24-25',   // Missing dash
        '123456/2425',    // Missing dash
        '123456/24-25-26', // Too many parts
        'abc123/24-25',   // Non-numeric
        '123456/ab-cd'    // Non-numeric year
    ]
};
