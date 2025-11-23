import dotenv from 'dotenv';
import { GeminiService } from './services/GeminiService.js';

dotenv.config();

async function testGemini() {
  console.log('🧪 Testing Gemini Integration...\n');
  
  // Check if API key is loaded
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not found in environment variables');
    console.log('💡 Make sure .env file exists and contains GEMINI_API_KEY');
    process.exit(1);
  }
  
  console.log('✅ API Key loaded:', apiKey.substring(0, 10) + '...' + apiKey.substring(apiKey.length - 4));
  
  // Create Gemini service instance
  const gemini = new GeminiService();
  
  if (!gemini.genAI) {
    console.error('❌ Gemini service failed to initialize');
    process.exit(1);
  }
  
  console.log('✅ Gemini service initialized\n');
  
  // Test with a simple request
  console.log('📡 Making test API call to Gemini...\n');
  
  try {
    const testJiraTicket = {
      jiraTicketKey: 'TEST-123',
      summary: 'Test ticket for Gemini integration'
    };
    
    const testCodeDiff = `function add(a, b) {
  return a + b;
}`;
    
    // Capture console.error to detect API errors
    let apiErrorOccurred = false;
    const originalError = console.error;
    console.error = (...args) => {
      if (args[0]?.includes?.('Gemini API error') || args[0]?.includes?.('API key not valid')) {
        apiErrorOccurred = true;
      }
      originalError(...args);
    };
    
    const result = await gemini.planTestCoverage(testJiraTicket, testCodeDiff);
    
    // Restore console.error
    console.error = originalError;
    
    if (apiErrorOccurred) {
      console.error('\n❌ API Key is INVALID - Service fell back to mock data\n');
      console.error('📊 Mock Test Plan Results (NOT from real API):');
      console.error('  - Unit Tests:', result.testPlan.unitTests);
      console.error('  - Integration Tests:', result.testPlan.integrationTests);
      console.error('  - Edge Cases:', result.testPlan.edgeCases);
      console.error('\n💡 The API key needs to be fixed for real Gemini API calls to work.');
      console.error('   Please check your API key in Google AI Studio and update .env file.');
      process.exit(1);
    }
    
    console.log('✅ Gemini API call successful!\n');
    console.log('📊 Test Plan Results:');
    console.log('  - Unit Tests:', result.testPlan.unitTests);
    console.log('  - Integration Tests:', result.testPlan.integrationTests);
    console.log('  - Edge Cases:', result.testPlan.edgeCases);
    console.log('\n💭 Reasoning (first 200 chars):');
    console.log('  ' + result.reasoning.substring(0, 200) + '...\n');
    
    console.log('🎉 Gemini integration is working correctly!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Gemini API call failed:');
    console.error('   Error:', error.message);
    
    if (error.message.includes('API_KEY_INVALID') || error.message.includes('API key not valid')) {
      console.error('\n💡 API Key Validation Failed!');
      console.error('   The API key is being rejected by Google\'s API.');
      console.error('\n   Please verify:');
      console.error('   1. Copy the API key directly from Google AI Studio (aistudio.google.com)');
      console.error('   2. Ensure the Generative Language API is enabled in Google Cloud Console');
      console.error('   3. Check API key restrictions - make sure it\'s not restricted to specific IPs/domains');
      console.error('   4. Verify the API key hasn\'t been rotated or deleted');
      console.error('\n   Current API key (first/last 4 chars):', 
        apiKey.substring(0, 4) + '...' + apiKey.substring(apiKey.length - 4));
      console.error('\n   ⚠️  The service is falling back to mock data, but real API calls will not work.');
    } else if (error.message.includes('MODEL_NOT_FOUND') || error.message.includes('404')) {
      console.error('\n💡 Model name issue. The model "gemini-1.5-pro" may not be available.');
      console.error('   Try using "gemini-pro" instead.');
    }
    
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

testGemini();

