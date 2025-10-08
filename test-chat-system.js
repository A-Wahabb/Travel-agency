/**
 * Chat System Test Script
 * 
 * This script tests the basic functionality of the chat system
 * Run with: node test-chat-system.js
 */

const axios = require('axios');
const io = require('socket.io-client');

// Configuration
const BASE_URL = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

// Test credentials (replace with actual credentials)
const TEST_USERS = [
    {
        email: 'superadmin@travelagency.com',
        password: 'SuperAdmin123!',
        name: 'Super Admin'
    },
    {
        email: 'admin@example.com', // Replace with actual admin email
        password: 'password123',
        name: 'Admin User'
    }
];

class ChatSystemTester {
    constructor() {
        this.tokens = [];
        this.sockets = [];
        this.testResults = [];
    }

    async runTests() {
        console.log('🚀 Starting Chat System Tests...\n');

        try {
            // Test 1: Authentication
            await this.testAuthentication();

            // Test 2: User Search
            await this.testUserSearch();

            // Test 3: Chat Creation
            await this.testChatCreation();

            // Test 4: Message Sending
            await this.testMessageSending();

            // Test 5: Socket.IO Connection
            await this.testSocketConnection();

            // Test 6: Real-time Messaging
            await this.testRealTimeMessaging();

            // Print Results
            this.printResults();

        } catch (error) {
            console.error('❌ Test failed:', error.message);
        }
    }

    async testAuthentication() {
        console.log('🔐 Testing Authentication...');

        for (let i = 0; i < TEST_USERS.length; i++) {
            try {
                const response = await axios.post(`${BASE_URL}/auth/login`, {
                    email: TEST_USERS[i].email,
                    password: TEST_USERS[i].password
                });

                if (response.data.success && response.data.data.token) {
                    this.tokens.push(response.data.data.token);
                    this.addResult('Authentication', `User ${i + 1}`, 'PASS');
                    console.log(`✅ User ${i + 1} authenticated successfully`);
                } else {
                    this.addResult('Authentication', `User ${i + 1}`, 'FAIL');
                    console.log(`❌ User ${i + 1} authentication failed`);
                }
            } catch (error) {
                this.addResult('Authentication', `User ${i + 1}`, 'FAIL');
                console.log(`❌ User ${i + 1} authentication error:`, error.message);
            }
        }

        console.log('');
    }

    async testUserSearch() {
        console.log('🔍 Testing User Search...');

        if (this.tokens.length === 0) {
            console.log('❌ No authentication tokens available');
            return;
        }

        try {
            const response = await axios.get(`${BASE_URL}/chats/search-users?search=admin`, {
                headers: {
                    'Authorization': `Bearer ${this.tokens[0]}`
                }
            });

            if (response.data.success && Array.isArray(response.data.data)) {
                this.addResult('User Search', 'Search Users', 'PASS');
                console.log(`✅ Found ${response.data.data.length} users`);
            } else {
                this.addResult('User Search', 'Search Users', 'FAIL');
                console.log('❌ User search failed');
            }
        } catch (error) {
            this.addResult('User Search', 'Search Users', 'FAIL');
            console.log('❌ User search error:', error.message);
        }

        console.log('');
    }

    async testChatCreation() {
        console.log('💬 Testing Chat Creation...');

        if (this.tokens.length < 2) {
            console.log('❌ Need at least 2 authenticated users for chat creation');
            return;
        }

        try {
            // First, get users to chat with
            const searchResponse = await axios.get(`${BASE_URL}/chats/search-users`, {
                headers: {
                    'Authorization': `Bearer ${this.tokens[0]}`
                }
            });

            if (searchResponse.data.success && searchResponse.data.data.length > 0) {
                const targetUser = searchResponse.data.data[0];

                const response = await axios.post(`${BASE_URL}/chats`, {
                    participantIds: [targetUser._id],
                    chatType: 'direct'
                }, {
                    headers: {
                        'Authorization': `Bearer ${this.tokens[0]}`
                    }
                });

                if (response.data.success) {
                    this.chatId = response.data.data._id;
                    this.addResult('Chat Creation', 'Create Direct Chat', 'PASS');
                    console.log(`✅ Chat created successfully: ${this.chatId}`);
                } else {
                    this.addResult('Chat Creation', 'Create Direct Chat', 'FAIL');
                    console.log('❌ Chat creation failed');
                }
            } else {
                this.addResult('Chat Creation', 'Create Direct Chat', 'FAIL');
                console.log('❌ No users found for chat creation');
            }
        } catch (error) {
            this.addResult('Chat Creation', 'Create Direct Chat', 'FAIL');
            console.log('❌ Chat creation error:', error.message);
        }

        console.log('');
    }

    async testMessageSending() {
        console.log('📝 Testing Message Sending...');

        if (!this.chatId) {
            console.log('❌ No chat ID available for message sending');
            return;
        }

        try {
            const response = await axios.post(`${BASE_URL}/chats/${this.chatId}/messages`, {
                content: 'Hello! This is a test message.',
                messageType: 'text'
            }, {
                headers: {
                    'Authorization': `Bearer ${this.tokens[0]}`
                }
            });

            if (response.data.success) {
                this.messageId = response.data.data._id;
                this.addResult('Message Sending', 'Send Text Message', 'PASS');
                console.log(`✅ Message sent successfully: ${this.messageId}`);
            } else {
                this.addResult('Message Sending', 'Send Text Message', 'FAIL');
                console.log('❌ Message sending failed');
            }
        } catch (error) {
            this.addResult('Message Sending', 'Send Text Message', 'FAIL');
            console.log('❌ Message sending error:', error.message);
        }

        console.log('');
    }

    async testSocketConnection() {
        console.log('🔌 Testing Socket.IO Connection...');

        if (this.tokens.length === 0) {
            console.log('❌ No authentication tokens available');
            return;
        }

        return new Promise((resolve) => {
            const socket = io(SOCKET_URL, {
                auth: {
                    token: this.tokens[0]
                }
            });

            socket.on('connect', () => {
                this.sockets.push(socket);
                this.addResult('Socket Connection', 'Connect to Server', 'PASS');
                console.log('✅ Socket.IO connected successfully');
                resolve();
            });

            socket.on('connect_error', (error) => {
                this.addResult('Socket Connection', 'Connect to Server', 'FAIL');
                console.log('❌ Socket.IO connection error:', error.message);
                resolve();
            });

            // Timeout after 5 seconds
            setTimeout(() => {
                if (!socket.connected) {
                    this.addResult('Socket Connection', 'Connect to Server', 'FAIL');
                    console.log('❌ Socket.IO connection timeout');
                    resolve();
                }
            }, 5000);
        });
    }

    async testRealTimeMessaging() {
        console.log('⚡ Testing Real-time Messaging...');

        if (this.sockets.length === 0) {
            console.log('❌ No socket connections available');
            return;
        }

        const socket = this.sockets[0];

        return new Promise((resolve) => {
            let messageReceived = false;

            // Listen for new messages
            socket.on('new_message', (data) => {
                if (data.message && data.message.content) {
                    messageReceived = true;
                    this.addResult('Real-time Messaging', 'Receive Message', 'PASS');
                    console.log('✅ Real-time message received:', data.message.content);
                }
            });

            // Send a test message via socket
            if (this.chatId) {
                socket.emit('send_message', {
                    chatId: this.chatId,
                    content: 'Real-time test message',
                    messageType: 'text'
                });

                console.log('📤 Sent real-time test message');
            }

            // Wait for message or timeout
            setTimeout(() => {
                if (!messageReceived) {
                    this.addResult('Real-time Messaging', 'Receive Message', 'FAIL');
                    console.log('❌ Real-time message not received');
                }
                resolve();
            }, 3000);
        });
    }

    addResult(category, test, result) {
        this.testResults.push({
            category,
            test,
            result,
            timestamp: new Date().toISOString()
        });
    }

    printResults() {
        console.log('\n📊 Test Results Summary:');
        console.log('='.repeat(50));

        const categories = {};
        this.testResults.forEach(result => {
            if (!categories[result.category]) {
                categories[result.category] = { pass: 0, fail: 0 };
            }
            if (result.result === 'PASS') {
                categories[result.category].pass++;
            } else {
                categories[result.category].fail++;
            }
        });

        Object.keys(categories).forEach(category => {
            const { pass, fail } = categories[category];
            const total = pass + fail;
            const percentage = total > 0 ? Math.round((pass / total) * 100) : 0;
            const status = percentage === 100 ? '✅' : percentage >= 50 ? '⚠️' : '❌';

            console.log(`${status} ${category}: ${pass}/${total} (${percentage}%)`);
        });

        const totalPass = this.testResults.filter(r => r.result === 'PASS').length;
        const totalTests = this.testResults.length;
        const overallPercentage = totalTests > 0 ? Math.round((totalPass / totalTests) * 100) : 0;

        console.log('='.repeat(50));
        console.log(`🎯 Overall: ${totalPass}/${totalTests} (${overallPercentage}%)`);

        if (overallPercentage === 100) {
            console.log('🎉 All tests passed! Chat system is working perfectly.');
        } else if (overallPercentage >= 80) {
            console.log('👍 Most tests passed. Chat system is mostly functional.');
        } else {
            console.log('⚠️ Some tests failed. Please check the configuration.');
        }

        console.log('\n📋 Detailed Results:');
        this.testResults.forEach(result => {
            const status = result.result === 'PASS' ? '✅' : '❌';
            console.log(`${status} ${result.category} - ${result.test}`);
        });
    }

    cleanup() {
        // Close socket connections
        this.sockets.forEach(socket => {
            if (socket.connected) {
                socket.disconnect();
            }
        });
    }
}

// Run tests
const tester = new ChatSystemTester();

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n🛑 Stopping tests...');
    tester.cleanup();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Stopping tests...');
    tester.cleanup();
    process.exit(0);
});

// Start tests
tester.runTests().then(() => {
    tester.cleanup();
    process.exit(0);
}).catch(error => {
    console.error('❌ Test suite failed:', error);
    tester.cleanup();
    process.exit(1);
});