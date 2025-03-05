// Simple test script for the Express server
const fetch = require('node-fetch');

async function testStreamEndpoint() {
  console.log('Testing /stream endpoint...');
  
  try {
    const response = await fetch('http://localhost:3000/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: 'Hello, how are you today?',
      }),
    });

    if (response.ok) {
      console.log('Stream endpoint responded successfully');
      
      // Read the stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        console.log('Received chunk:', chunk);
      }
    } else {
      console.error('Stream endpoint failed with status:', response.status);
    }
  } catch (error) {
    console.error('Error testing stream endpoint:', error);
  }
}

async function testProxyEndpoint() {
  console.log('Testing /api endpoint...');
  
  try {
    const response = await fetch('http://localhost:3000/api/test');
    
    if (response.ok) {
      const data = await response.text();
      console.log('Proxy endpoint responded successfully:', data);
    } else {
      console.error('Proxy endpoint failed with status:', response.status);
    }
  } catch (error) {
    console.error('Error testing proxy endpoint:', error);
  }
}

async function runTests() {
  await testStreamEndpoint();
  await testProxyEndpoint();
  console.log('All tests completed');
}

runTests(); 