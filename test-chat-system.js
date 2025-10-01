/**
 * Chat System Test Script
 * 
 * This script tests the chat system functionality including:
 * - Authentication and authorization
 * - Chat creation and management
 * - Message sending and receiving
 * - Real-time Socket.IO communication
 * 
 * Usage: node test-chat-system.js
 */

const axios = require('axios');
const { io } = require('socket.io-client');

// Configuration
const BASE_URL = 'http://localhost:5000';
const TEST_CONFIG = {
    superAdmin: {
        email: 'superadmin@travelagency.com',
        password: 'SuperAdmin123!'
    },
    admin: {
        email: 'admin@example.com',
        password: 'password123'
    }
};

// Test results tracking
const testResults = {
    passed: 0,
    failed: 0,
    tests: []
};

// Utility functions
function log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
}

function recordTest(testName, passed, details = '') {
    testResults.tests.push({ name: testName, passed, details });
    if (passed) {
        testResults.passed++;
        log(`PASSED: ${testName}`, 'success');
    } else {
        testResults.failed++;
        log(`FAILED: ${testName} - ${details}`, 'error');
    }
}

async function makeRequest(method, endpoint, data = null, token = null) {
    try {
        const config = {
            method,
            url: `${BASE_URL}${endpoint}`,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        if (data) {
            config.data = data;
        }

        const response = await axios(config);
        return { success: true, data: response.data, status: response.status };
    } catch (error) {
        return {
            success: false,
            error: error.response?.data || error.message,
            status: error.response?.status
        };
    }
}

// Test functions
async function testAuthentication() {
    log('Testing authentication...');

    // Test SuperAdmin login
    const superAdminLogin = await makeRequest('POST', '/api/auth/login', TEST_CONFIG.superAdmin);
    recordTest(
        'SuperAdmin Login',
        superAdminLogin.success && superAdminLogin.data.success,
        superAdminLogin.success ? '' : JSON.stringify(superAdminLogin.error)
    );

    if (!superAdminLogin.success) {
        log('SuperAdmin login failed, stopping tests', 'error');
        return null;
    }

    // Test Admin login
    const adminLogin = await makeRequest('POST', '/api/auth/login', TEST_CONFIG.admin);
    recordTest(
        'Admin Login',
        adminLogin.success && adminLogin.data.success,
        adminLogin.success ? '' : JSON.stringify(adminLogin.error)
    );

    if (!adminLogin.success) {
        log('Admin login failed, stopping tests', 'error');
        return null;
    }

    return {
        superAdminToken: superAdminLogin.data.data.accessToken,
        adminToken: adminLogin.data.data.accessToken,
        superAdminId: superAdminLogin.data.data.user._id,
        adminId: adminLogin.data.data.user._id
    };
}

async function testChatCreation(tokens, userIds) {
    log('Testing chat creation...');

    // Test direct chat creation
    const directChat = await makeRequest('POST', '/api/chats', {
        participantIds: [userIds.adminId],
        chatType: 'direct'
    }, tokens.superAdminToken);

    recordTest(
        'Create Direct Chat',
        directChat.success && directChat.data.success,
        directChat.success ? '' : JSON.stringify(directChat.error)
    );

    if (!directChat.success) {
        return null;
    }

    // Test group chat creation
    const groupChat = await makeRequest('POST', '/api/chats', {
        participantIds: [userIds.adminId],
        chatType: 'group'
    }, tokens.superAdminToken);

    recordTest(
        'Create Group Chat',
        groupChat.success && groupChat.data.success,
        groupChat.success ? '' : JSON.stringify(groupChat.error)
    );

    return {
        directChatId: directChat.data.data._id,
        groupChatId: groupChat.data.data._id
    };
}

async function testChatRetrieval(tokens) {
    log('Testing chat retrieval...');

    // Test get user chats
    const userChats = await makeRequest('GET', '/api/chats', null, tokens.superAdminToken);
    recordTest(
        'Get User Chats',
        userChats.success && userChats.data.success,
        userChats.success ? '' : JSON.stringify(userChats.error)
    );

    return userChats.success ? userChats.data.data : null;
}

async function testMessaging(tokens, chatIds) {
    log('Testing messaging...');

    if (!chatIds) {
        recordTest('Messaging Tests', false, 'No chat IDs available');
        return;
    }

    // Test send message
    const sendMessage = await makeRequest('POST', `/api/chats/${chatIds.directChatId}/messages`, {
        content: 'Hello from SuperAdmin!',
        messageType: 'text'
    }, tokens.superAdminToken);

    recordTest(
        'Send Message',
        sendMessage.success && sendMessage.data.success,
        sendMessage.success ? '' : JSON.stringify(sendMessage.error)
    );

    if (!sendMessage.success) {
        return null;
    }

    const messageId = sendMessage.data.data._id;

    // Test get chat messages
    const getMessages = await makeRequest('GET', `/api/chats/${chatIds.directChatId}`, null, tokens.adminToken);
    recordTest(
        'Get Chat Messages',
        getMessages.success && getMessages.data.success,
        getMessages.success ? '' : JSON.stringify(getMessages.error)
    );

    // Test send reply
    const sendReply = await makeRequest('POST', `/api/chats/${chatIds.directChatId}/messages`, {
        content: 'Hello back from Admin!',
        messageType: 'text',
        replyTo: messageId
    }, tokens.adminToken);

    recordTest(
        'Send Reply Message',
        sendReply.success && sendReply.data.success,
        sendReply.success ? '' : JSON.stringify(sendReply.error)
    );

    // Test edit message
    const editMessage = await makeRequest('PUT', `/api/chats/messages/${messageId}`, {
        content: 'This message has been edited!'
    }, tokens.superAdminToken);

    recordTest(
        'Edit Message',
        editMessage.success && editMessage.data.success,
        editMessage.success ? '' : JSON.stringify(editMessage.error)
    );

    return { messageId, replyId: sendReply.success ? sendReply.data.data._id : null };
}

async function testUnreadCount(tokens, chatIds) {
    log('Testing unread count...');

    // Test get unread count
    const unreadCount = await makeRequest('GET', '/api/chats/unread-count', null, tokens.adminToken);
    recordTest(
        'Get Unread Count',
        unreadCount.success && unreadCount.data.success,
        unreadCount.success ? '' : JSON.stringify(unreadCount.error)
    );

    // Test get unread count for specific chat
    if (chatIds) {
        const chatUnreadCount = await makeRequest('GET', `/api/chats/unread-count?chatId=${chatIds.directChatId}`, null, tokens.adminToken);
        recordTest(
            'Get Chat Unread Count',
            chatUnreadCount.success && chatUnreadCount.data.success,
            chatUnreadCount.success ? '' : JSON.stringify(chatUnreadCount.error)
        );
    }
}

async function testChatParticipants(tokens, chatIds) {
    log('Testing chat participants...');

    if (!chatIds) {
        recordTest('Chat Participants Tests', false, 'No chat IDs available');
        return;
    }

    // Test get chat participants
    const participants = await makeRequest('GET', `/api/chats/${chatIds.directChatId}/participants`, null, tokens.superAdminToken);
    recordTest(
        'Get Chat Participants',
        participants.success && participants.data.success,
        participants.success ? '' : JSON.stringify(participants.error)
    );
}

async function testAccessControl(tokens) {
    log('Testing access control...');

    // Test Agent access (should fail)
    const agentAccess = await makeRequest('GET', '/api/chats', null, tokens.adminToken); // Using admin token as proxy for agent test
    recordTest(
        'Agent Access Denied',
        !agentAccess.success || agentAccess.data.message?.includes('Access denied'),
        agentAccess.success ? 'Agent was able to access chats' : 'Agent correctly denied access'
    );

    // Test invalid chat access
    const invalidChatAccess = await makeRequest('GET', '/api/chats/invalid_chat_id', null, tokens.superAdminToken);
    recordTest(
        'Invalid Chat Access',
        !invalidChatAccess.success || invalidChatAccess.data.message?.includes('not found'),
        invalidChatAccess.success ? 'Invalid chat ID was accepted' : 'Invalid chat ID correctly rejected'
    );
}

async function testSocketIO(tokens, chatIds) {
    log('Testing Socket.IO real-time communication...');

    return new Promise((resolve) => {
        if (!chatIds) {
            recordTest('Socket.IO Tests', false, 'No chat IDs available');
            resolve();
            return;
        }

        const socket = io(BASE_URL, {
            auth: {
                token: tokens.superAdminToken
            }
        });

        let testsCompleted = 0;
        const totalTests = 3;

        const completeTest = (testName, passed, details = '') => {
            recordTest(testName, passed, details);
            testsCompleted++;
            if (testsCompleted >= totalTests) {
                socket.disconnect();
                resolve();
            }
        };

        socket.on('connect', () => {
            completeTest('Socket.IO Connection', true);

            // Test join chat
            socket.emit('join_chat', chatIds.directChatId);
        });

        socket.on('joined_chat', (data) => {
            completeTest('Join Chat Room', data.chatId === chatIds.directChatId);
        });

        socket.on('connect_error', (error) => {
            completeTest('Socket.IO Connection', false, error.message);
        });

        socket.on('new_message', (data) => {
            completeTest('Receive Real-time Message', data.message && data.chatId);
        });

        // Test send message via socket
        setTimeout(() => {
            socket.emit('send_message', {
                chatId: chatIds.directChatId,
                content: 'Real-time message test',
                messageType: 'text'
            });
        }, 1000);

        // Timeout after 10 seconds
        setTimeout(() => {
            socket.disconnect();
            if (testsCompleted < totalTests) {
                completeTest('Socket.IO Timeout', false, 'Tests did not complete within timeout');
            }
            resolve();
        }, 10000);
    });
}

// Main test runner
async function runTests() {
    log('Starting Chat System Tests...', 'info');
    log('='.repeat(50));

    try {
        // Test authentication
        const authResult = await testAuthentication();
        if (!authResult) {
            log('Authentication failed, cannot continue tests', 'error');
            return;
        }

        // Test chat creation
        const chatIds = await testChatCreation(authResult.superAdminToken, {
            superAdminId: authResult.superAdminId,
            adminId: authResult.adminId
        });

        // Test chat retrieval
        await testChatRetrieval(authResult.superAdminToken);

        // Test messaging
        const messageIds = await testMessaging(authResult.superAdminToken, chatIds);

        // Test unread count
        await testUnreadCount(authResult.superAdminToken, chatIds);

        // Test chat participants
        await testChatParticipants(authResult.superAdminToken, chatIds);

        // Test access control
        await testAccessControl(authResult.superAdminToken);

        // Test Socket.IO
        await testSocketIO(authResult.superAdminToken, chatIds);

    } catch (error) {
        log(`Test execution error: ${error.message}`, 'error');
        recordTest('Test Execution', false, error.message);
    }

    // Print results
    log('='.repeat(50));
    log('Test Results Summary:', 'info');
    log(`✅ Passed: ${testResults.passed}`, 'success');
    log(`❌ Failed: ${testResults.failed}`, 'error');
    log(`📊 Total: ${testResults.passed + testResults.failed}`);

    if (testResults.failed === 0) {
        log('🎉 All tests passed!', 'success');
    } else {
        log('⚠️ Some tests failed. Check the details above.', 'error');
    }

    // Detailed results
    log('\nDetailed Results:');
    testResults.tests.forEach(test => {
        const status = test.passed ? '✅' : '❌';
        log(`${status} ${test.name}${test.details ? ` - ${test.details}` : ''}`);
    });
}

// Check dependencies and run tests
async function checkDependencies() {
    try {
        require('axios');
        require('socket.io-client');
        return true;
    } catch (error) {
        log('Missing dependencies. Please install them:', 'error');
        log('npm install axios socket.io-client', 'info');
        return false;
    }
}

// Run the tests
if (require.main === module) {
    checkDependencies().then(depsOk => {
        if (depsOk) {
            runTests().catch(error => {
                log(`Fatal error: ${error.message}`, 'error');
                process.exit(1);
            });
        } else {
            process.exit(1);
        }
    });
}

module.exports = { runTests };
