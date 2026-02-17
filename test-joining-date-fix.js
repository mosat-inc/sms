// Test script to verify the date formatting fix for joining_date

// Helper function to format date for MySQL DATE column
const formatDateForMySQL = (dateValue) => {
  if (!dateValue || dateValue === '' || dateValue === null || dateValue === undefined) {
    return null;
  }
  
  try {
    // Handle both string and Date object inputs
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return null;
    }
    
    // Convert to MySQL DATE format (YYYY-MM-DD)
    return date.toISOString().split('T')[0];
  } catch (error) {
    console.error('Date formatting error:', error);
    return null;
  }
};

// Test cases
const testCases = [
  '2025-09-06T07:00:00.000Z',  // ISO string format (the problematic one)
  '2025-09-06',               // Already correct format
  new Date('2025-09-06'),     // Date object
  '',                         // Empty string
  null,                       // Null
  undefined,                  // Undefined
  'invalid-date',            // Invalid date string
  '2023-12-25T23:59:59.999Z' // Another ISO string
];

console.log('Testing date formatting function:');
console.log('=====================================');

testCases.forEach((testCase, index) => {
  const result = formatDateForMySQL(testCase);
  console.log(`Test ${index + 1}: ${JSON.stringify(testCase)} => ${JSON.stringify(result)}`);
});

console.log('\nExpected results:');
console.log('- ISO strings should convert to YYYY-MM-DD format');
console.log('- Empty/null/undefined should return null');
console.log('- Invalid dates should return null');
console.log('- Valid dates should return YYYY-MM-DD format');
