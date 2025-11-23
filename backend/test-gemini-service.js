/**
 * Test GeminiService directly
 */
import dotenv from 'dotenv';
import { GeminiService } from './services/GeminiService.js';

dotenv.config();

async function test() {
  console.log('🧪 Testing GeminiService...\n');
  
  const service = new GeminiService();
  
  const mockLogger = {
    data: (label, value) => console.log(`  ${label}: ${value}`),
    warning: (msg) => console.warn(`  ⚠️  ${msg}`),
    error: (msg, err) => console.error(`  ❌ ${msg}`, err || '')
  };
  
  try {
    const result = await service.planTestCoverage(
      { summary: 'Test ticket' },
      'function add(a, b) { return a + b; }',
      null,
      null,
      true,
      mockLogger
    );
    
    console.log('\n✅ GeminiService test successful!');
    console.log('\nResult:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('\n❌ GeminiService test failed:', error.message);
    console.error(error);
  }
}

test();

