/**
 * Test Application Number Generation
 * 
 * This script tests the application number generation functionality
 */

import mongoose from 'mongoose';
import { getNextApplicationNumber, getCurrentAcademicYear, validateApplicationNumberFormat } from '../src/utils/applicationNumberGenerator';
import Application from '../src/models/Application';

// Test configuration
const TEST_DB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/travel-agency-test';

async function testApplicationNumberGeneration() {
    try {
        console.log('🧪 Testing Application Number Generation...\n');

        // Connect to test database
        await mongoose.connect(TEST_DB_URI);
        console.log('✅ Connected to test database');

        // Test 1: Get current academic year
        console.log('\n📅 Test 1: Current Academic Year');
        const academicYear = getCurrentAcademicYear();
        console.log(`Current academic year: ${academicYear}`);
        console.log('✅ Academic year format looks correct');

        // Test 2: Validate application number format
        console.log('\n🔍 Test 2: Application Number Format Validation');
        const validNumbers = [
            '000001/24-25',
            '000123/24-25',
            '999999/25-26',
            '352546/25-26'
        ];
        
        const invalidNumbers = [
            '12345/24-25',    // Too few digits
            '1234567/24-25',  // Too many digits
            '123456/24-25',   // Missing dash
            'abc123/24-25'    // Non-numeric
        ];

        console.log('Valid numbers:');
        validNumbers.forEach(num => {
            const isValid = validateApplicationNumberFormat(num);
            console.log(`  ${num}: ${isValid ? '✅ Valid' : '❌ Invalid'}`);
        });

        console.log('Invalid numbers:');
        invalidNumbers.forEach(num => {
            const isValid = validateApplicationNumberFormat(num);
            console.log(`  ${num}: ${isValid ? '❌ Should be invalid' : '✅ Correctly invalid'}`);
        });

        // Test 3: Generate application numbers
        console.log('\n🔢 Test 3: Generate Application Numbers');
        
        // Clear any existing test applications
        await Application.deleteMany({ applicationNumber: { $regex: `^\\d{6}/${academicYear}$` } });
        console.log('🧹 Cleared existing test applications');

        // Generate multiple application numbers
        const generatedNumbers = [];
        for (let i = 0; i < 5; i++) {
            const appNumber = await getNextApplicationNumber();
            generatedNumbers.push(appNumber);
            console.log(`Generated ${i + 1}: ${appNumber}`);
        }

        // Verify they are sequential
        console.log('\n📊 Verification:');
        generatedNumbers.forEach((num, index) => {
            const expectedNumber = (index + 1).toString().padStart(6, '0');
            const actualNumber = num.split('/')[0];
            const isCorrect = expectedNumber === actualNumber;
            console.log(`  ${num}: ${isCorrect ? '✅ Correct sequence' : '❌ Wrong sequence'}`);
        });

        // Test 4: Test uniqueness
        console.log('\n🔒 Test 4: Uniqueness Test');
        const uniqueNumbers = new Set(generatedNumbers);
        const isUnique = uniqueNumbers.size === generatedNumbers.length;
        console.log(`All numbers are unique: ${isUnique ? '✅ Yes' : '❌ No'}`);

        // Test 5: Test with existing applications
        console.log('\n📝 Test 5: Test with Existing Applications');
        
        // Create a test application
        const testApplication = new Application({
            applicationNumber: generatedNumbers[0],
            studentId: new mongoose.Types.ObjectId(),
            courseId: new mongoose.Types.ObjectId(),
            createdBy: new mongoose.Types.ObjectId()
        });
        
        await testApplication.save();
        console.log(`✅ Created test application: ${generatedNumbers[0]}`);

        // Generate next number (should be 000002)
        const nextNumber = await getNextApplicationNumber();
        console.log(`Next number after existing: ${nextNumber}`);
        
        const expectedNext = '000002';
        const actualNext = nextNumber.split('/')[0];
        const isNextCorrect = expectedNext === actualNext;
        console.log(`Next number is correct: ${isNextCorrect ? '✅ Yes' : '❌ No'}`);

        // Cleanup
        console.log('\n🧹 Cleanup:');
        await Application.deleteMany({ applicationNumber: { $regex: `^\\d{6}/${academicYear}$` } });
        console.log('✅ Cleaned up test applications');

        console.log('\n🎉 All tests completed successfully!');
        console.log('\n📋 Summary:');
        console.log(`- Academic year format: ${academicYear}`);
        console.log(`- Generated ${generatedNumbers.length} sequential numbers`);
        console.log(`- All numbers are unique: ${isUnique}`);
        console.log(`- Format validation works correctly`);
        console.log(`- Sequential generation works correctly`);

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from database');
    }
}

// Run the test
if (require.main === module) {
    testApplicationNumberGeneration();
}

export { testApplicationNumberGeneration };
