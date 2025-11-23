/**
 * Test script for Gemini API
 * Run with: node test-gemini.js
 */
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

async function testGemini() {
  console.log('🧪 Testing Gemini API Connection...\n');

  // Check API key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    console.error('❌ GEMINI_API_KEY not found in .env file');
    console.log('\n📝 Please add your Gemini API key to backend/.env:');
    console.log('   GEMINI_API_KEY=your_actual_api_key_here\n');
    console.log('💡 Get your API key from: https://aistudio.google.com/app/apikey');
    process.exit(1);
  }

  console.log('✅ API Key found:', apiKey.substring(0, 10) + '...' + apiKey.substring(apiKey.length - 4));
  console.log('');

  try {
    const genAI = new GoogleGenerativeAI(apiKey);

    // First, try to list available models using REST API
    console.log('📋 Fetching available models from API...');
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Available models:');
        if (data.models && data.models.length > 0) {
          data.models.forEach(model => {
            if (model.name && model.supportedGenerationMethods?.includes('generateContent')) {
              const modelId = model.name.replace('models/', '');
              console.log(`   - ${modelId}`);
            }
          });
          console.log('');
        } else {
          console.log('   (No models found)\n');
        }
      } else {
        const errorText = await response.text();
        console.log(`⚠️  Could not list models: ${response.status} ${errorText}\n`);
      }
    } catch (listError) {
      console.log(`⚠️  Could not list models: ${listError.message}\n`);
    }

    // Test different model names
    const modelNames = [
      'gemini-1.5-flash-002',
      'gemini-1.5-flash-001',
      'gemini-1.5-flash',
      'gemini-1.5-pro-002',
      'gemini-1.5-pro-001',
      'gemini-1.5-pro',
      'gemini-pro',
      'gemini-2.0-flash-exp'
    ];

    console.log('🔍 Testing model connections...\n');

    for (const modelName of modelNames) {
      try {
        console.log(`Testing: ${modelName}...`);
        const model = genAI.getGenerativeModel({ model: modelName });
        
        const prompt = 'Say "Hello, Gemini is working!" in one sentence.';
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        console.log(`✅ SUCCESS with model: ${modelName}`);
        console.log(`   Response: ${text}\n`);
        
        // If we get here, this model works!
        console.log('🎉 Gemini API is working correctly!');
        console.log(`   Recommended model: ${modelName}\n`);
        return modelName;
      } catch (error) {
        console.log(`❌ Failed: ${modelName}`);
        console.log(`   Error: ${error.message}\n`);
      }
    }

    console.error('❌ All model names failed. Please check:');
    console.error('   1. Your API key is valid');
    console.error('   2. You have access to Gemini API');
    console.error('   3. Your internet connection is working');
    console.error('\n💡 Check the latest model names at: https://ai.google.dev/models/gemini');

  } catch (error) {
    console.error('❌ Gemini API Error:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

testGemini().catch(console.error);

