// Test the timezone conversion logic used in the frontend
console.log('🧪 Testing Frontend URL Date Conversion\n');

// Simulate the database record date
const record = {
    date: '2025-08-19T21:00:00.000Z',
    class_id: 1
};

console.log('Original database record date:', record.date);

// Apply the same conversion logic as the frontend
const utcDate = new Date(record.date);
console.log('Parsed UTC date:', utcDate);

// For GMT+3 server, we need to add 3 hours to get the correct local date
const serverTimezonOffset = 3 * 60; // 3 hours in minutes for GMT+3
const serverLocalDate = new Date(utcDate.getTime() + (serverTimezonOffset * 60000));
const formattedDate = serverLocalDate.toISOString().split('T')[0];

console.log('Server local date (GMT+3):', serverLocalDate);
console.log('Formatted date for URL:', formattedDate);

// This should generate the URL
const generatedURL = `/attendance/detail/${record.class_id}/${formattedDate}`;
console.log('Generated URL:', generatedURL);

console.log('\n✅ Expected Result:');
console.log('   URL should be: /attendance/detail/1/2025-08-20');
console.log('   Actual URL is:', generatedURL);
console.log('   Match:', generatedURL === '/attendance/detail/1/2025-08-20' ? '✅ SUCCESS' : '❌ FAILED');

// Also test with the backend endpoint
console.log('\n🔗 Backend endpoint that will be called:');
console.log('   http://localhost:5000/api/attendance/1/2025-08-20');
console.log('   This should return 7 student records with proper statistics');
