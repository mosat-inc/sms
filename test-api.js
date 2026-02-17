const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testAttendanceAPIs() {
    const baseURL = 'http://localhost:5000';
    
    try {
        console.log('🧪 Testing Attendance APIs...\n');
        
        // Test 1: Simple records
        console.log('1️⃣ Testing simple records API...');
        const simpleResponse = await fetch(`${baseURL}/api/attendance/simple-records`);
        const simpleData = await simpleResponse.json();
        console.log('Simple records response:', JSON.stringify(simpleData, null, 2));
        console.log('');
        
        // Test 2: Full records
        console.log('2️⃣ Testing full records API...');
        const recordsResponse = await fetch(`${baseURL}/api/attendance/records`);
        const recordsData = await recordsResponse.json();
        console.log('Full records response:', JSON.stringify(recordsData, null, 2));
        console.log('');
        
        // Test 3: Specific attendance detail
        console.log('3️⃣ Testing specific attendance detail API...');
        const detailResponse = await fetch(`${baseURL}/api/attendance/1/2025-08-20`);
        const detailData = await detailResponse.json();
        console.log('Attendance detail response:', JSON.stringify(detailData, null, 2));
        console.log('');
        
        // Test 4: Test PDF export
        console.log('4️⃣ Testing PDF export API...');
        const pdfResponse = await fetch(`${baseURL}/api/attendance/export/pdf?classId=1&date=2025-08-20`);
        console.log('PDF export status:', pdfResponse.status, pdfResponse.statusText);
        console.log('PDF export content-type:', pdfResponse.headers.get('content-type'));
        
        const pdfContent = await pdfResponse.text();
        console.log('PDF content length:', pdfContent.length);
        console.log('PDF content preview:', pdfContent.substring(0, 100));
        console.log('');
        
        // Test 5: Test Word export
        console.log('5️⃣ Testing Word export API...');
        const wordResponse = await fetch(`${baseURL}/api/attendance/export/word?classId=1&date=2025-08-20`);
        console.log('Word export status:', wordResponse.status, wordResponse.statusText);
        console.log('Word export content-type:', wordResponse.headers.get('content-type'));
        
        const wordContent = await wordResponse.text();
        console.log('Word content length:', wordContent.length);
        console.log('Word content preview:', wordContent.substring(0, 100));
        
    } catch (error) {
        console.error('❌ Error testing APIs:', error);
    }
}

// Also test without node-fetch, using plain HTTP
async function testWithNativeFetch() {
    if (typeof fetch === 'undefined') {
        console.log('⚠️  Native fetch not available, using node-fetch');
        return;
    }
    
    console.log('\n🔄 Testing with native fetch...');
    // Same tests but with native fetch
}

testAttendanceAPIs();
