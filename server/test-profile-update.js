const http = require('http');

function makeRequest(method, path, data = null, token = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => {
                try {
                    const parsedBody = JSON.parse(body);
                    resolve({ status: res.statusCode, data: parsedBody });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

async function testProfileUpdate() {
    try {
        console.log('🧪 Testing Profile Update...\n');
        
        // Test with different user accounts
        const testAccounts = [
            { username: 'admin', password: 'admin123', description: 'Admin (Demo Mode)' },
            { username: 'teacher1', password: 'teacher123', description: 'Teacher Account' }
        ];
        
        for (const account of testAccounts) {
            console.log(`\n📋 Testing ${account.description}:`);
            
            try {
                // Login
                const loginResponse = await makeRequest('POST', '/api/auth/login-direct', {
                    username: account.username,
                    password: account.password
                });
                
                if (!loginResponse.data.success) {
                    console.log(`❌ Login failed: ${loginResponse.data.message}`);
                    continue;
                }
                
                const token = loginResponse.data.data.token;
                const user = loginResponse.data.data.user;
                console.log(`✅ Login successful - User ID: ${user.id}, Role: ${user.role}`);
                
                // Test different types of profile updates
                const testUpdates = [
                    {
                        name: 'Basic Info Update',
                        data: {
                            first_name: 'Updated First',
                            last_name: 'Updated Last',
                            phone: '+255123456789'
                        }
                    },
                    {
                        name: 'Professional Info Update',
                        data: {
                            department: 'Science Department',
                            position: 'Senior Teacher',
                            qualification: 'Bachelor of Science',
                            experience: '5 years'
                        }
                    },
                    {
                        name: 'Teaching Assignment Update',
                        data: {
                            subjects_taught: ['Mathematics', 'Physics'],
                            classes_assigned: ['1A', '2B'],
                            specialization: 'Mathematics Education'
                        }
                    },
                    {
                        name: 'Complex Update with All Fields',
                        data: {
                            first_name: 'John Updated',
                            last_name: 'Teacher Updated',
                            email: 'updated.teacher@school.com',
                            phone: '+255987654321',
                            address: '123 School Road, Dar es Salaam',
                            qualification: 'Master of Science in Mathematics',
                            experience: '8 years',
                            department: 'Science Department',
                            position: 'Senior Teacher',
                            bio: 'Experienced mathematics teacher with passion for education.',
                            employee_id: 'EMP001',
                            specialization: 'Pure Mathematics',
                            experience_years: 8,
                            joining_date: '2016-01-15',
                            subjects_taught: ['Mathematics', 'Physics', 'Chemistry'],
                            classes_assigned: ['1A', '1B', '2A']
                        }
                    },
                    {
                        name: 'Empty Arrays Update',
                        data: {
                            subjects_taught: [],
                            classes_assigned: []
                        }
                    }
                ];
                
                for (const testUpdate of testUpdates) {
                    console.log(`\n  🔄 Testing: ${testUpdate.name}`);
                    
                    try {
                        const updateResponse = await makeRequest('PUT', '/api/auth/profile', testUpdate.data, token);
                        
                        if (updateResponse.status === 200 && updateResponse.data.success) {
                            console.log(`    ✅ ${testUpdate.name} successful`);
                        } else {
                            console.log(`    ❌ ${testUpdate.name} failed:`, {
                                status: updateResponse.status,
                                message: updateResponse.data.message,
                                error_code: updateResponse.data.error_code
                            });
                        }
                        
                    } catch (updateError) {
                        console.log(`    ❌ ${testUpdate.name} error:`, updateError.message);
                    }
                }
                
            } catch (loginError) {
                console.log(`❌ Login error for ${account.description}:`, loginError.message);
            }
        }
        
        console.log('\n✅ Profile update tests completed!');
        
    } catch (error) {
        console.error('❌ Test script error:', error.message);
    }
}

// Run the test
testProfileUpdate();
