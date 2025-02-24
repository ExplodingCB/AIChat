// server.js
import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import cors from 'cors';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
const envPath = path.resolve(__dirname, '.env');
console.log('Loading .env from:', envPath);
console.log('File exists:', fs.existsSync(envPath));

dotenv.config({ path: envPath });

// Debug: Print all environment variables (excluding any potential secrets)
console.log('Environment variables loaded:');
Object.keys(process.env).forEach(key => {
  if (key.includes('API_KEY')) {
    console.log(`${key}: ${process.env[key].substring(0, 5)}...`);
  } else {
    console.log(`${key}: ${process.env[key]}`);
  }
});

const app = express();
app.use(cors()); // Enable CORS for all routes
app.use(express.json());

// Path to models directory for GGUF files
const modelsDir = path.resolve(path.join(__dirname, '..', 'models'));
console.log('Models directory path:', modelsDir);

// Create models directory if it doesn't exist
if (!fs.existsSync(modelsDir)) {
  console.log('Creating models directory...');
  fs.mkdirSync(modelsDir, { recursive: true });
}

// Function to scan for GGUF files in the models directory
const scanGGUFModels = () => {
  try {
    const files = fs.readdirSync(modelsDir);
    const ggufFiles = files.filter(file => file.toLowerCase().endsWith('.gguf'));
    console.log('Found GGUF models:', ggufFiles);
    return ggufFiles.map(file => ({
      name: file,
      path: path.join(modelsDir, file)
    }));
  } catch (error) {
    console.error('Error scanning GGUF models:', error);
    return [];
  }
};

// Initial scan for GGUF models
let ggufModels = scanGGUFModels();

// Gemini API endpoint
app.post('/api/gemini', async (req, res) => {
  const { message } = req.body;
  try {
    console.log('Using Gemini API key:', process.env.GEMINI_API_KEY ? 'Key exists' : 'Key missing');
    
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key') {
      return res.json({
        response: "This is a simulated Gemini response because no valid API key was found. Add a valid Gemini API key to the .env file or try another model."
      });
    }
    
    // Using the Gemini API format
    const apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
    const apiKey = process.env.GEMINI_API_KEY;
    const finalUrl = `${apiUrl}?key=${apiKey}`;
    
    const response = await fetch(finalUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: message }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000
        }
      }),
    });
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message || 'Error from Gemini API');
    }
    
    // Extract the text from candidates
    if (data.candidates && 
        data.candidates[0] && 
        data.candidates[0].content && 
        data.candidates[0].content.parts && 
        data.candidates[0].content.parts[0]) {
      
      return res.json({ response: data.candidates[0].content.parts[0].text });
    }
    
    console.error('Unexpected Gemini API response structure:', data);
    res.json({ response: 'Received response from Gemini API but could not parse the content.' });
  } catch (error) {
    console.error('Gemini API error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Ollama models endpoint
app.get('/api/ollama/models', async (req, res) => {
  try {
    console.log('Checking for Ollama installation...');
    
    // First check if we can connect to Ollama at all
    try {
      const versionRes = await fetch('http://localhost:11434/api/version');
      const versionData = await versionRes.json();
      console.log('Connected to Ollama:', versionData.version || 'unknown version');
    } catch (err) {
      console.error('Failed to connect to Ollama server:', err.message);
      return res.status(503).json({
        error: 'Cannot connect to Ollama server',
        message: 'Make sure Ollama is running with "ollama serve" and listening on port 11434'
      });
    }
    
    // Now get the models
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      
      if (!response.ok) {
        throw new Error(`Ollama API responded with status code ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Raw Ollama models response:', JSON.stringify(data));
      
      // Extract models correctly based on API version
      let models = [];
      if (Array.isArray(data.models)) {
        models = data.models;
      } else if (Array.isArray(data)) {
        // Some versions return an array directly
        models = data;
      }
      
      console.log(`Found ${models.length} Ollama models`);
      
      if (models.length > 0) {
        console.log('Available models:', models.map(model => model.name || model).join(', '));
      } else {
        console.log('No Ollama models found. You may need to pull some models using the Ollama CLI.');
      }
      
      res.json({ models });
    } catch (error) {
      console.error('Error fetching Ollama models list:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch Ollama models list',
        message: error.message 
      });
    }
  } catch (error) {
    console.error('Unexpected error in Ollama models endpoint:', error);
    res.status(500).json({ 
      error: 'Failed to fetch Ollama models. Is Ollama running on your machine?',
      message: error.message 
    });
  }
});

// Ollama API endpoint
app.post('/api/ollama/:model', async (req, res) => {
  const { message } = req.body;
  const { model } = req.params;
  
  console.log(`Using Ollama model: ${model}`);
  console.log(`Sending message to Ollama (length: ${message.length} chars)`);
  
  try {
    // First check if Ollama is running and get the version
    try {
      const versionRes = await fetch('http://localhost:11434/api/version', {
        signal: AbortSignal.timeout(3000) // 3 second timeout
      });
      
      if (!versionRes.ok) {
        throw new Error(`Ollama server responded with status ${versionRes.status}`);
      }
      
      const versionData = await versionRes.json();
      console.log('Using Ollama version:', versionData.version || 'unknown');
    } catch (error) {
      console.error('Ollama server not reachable:', error.message);
      
      // Provide a more specific error message
      let errorMessage = 'Please start the Ollama server on your machine and try again';
      if (error.name === 'AbortError') {
        errorMessage = 'Ollama server connection timed out. The server might be busy or not running.';
      } else if (error.code === 'ECONNREFUSED') {
        errorMessage = 'Connection to Ollama server refused. Make sure Ollama is running with "ollama serve"';
      }
      
      return res.status(503).json({ 
        error: 'Ollama server not running or not reachable',
        message: errorMessage,
        details: `To start Ollama, run this in your terminal: ollama serve`,
        technical: error.message
      });
    }
    
    // List available models for debugging
    try {
      const listRes = await fetch('http://localhost:11434/api/tags');
      const listData = await listRes.json();
      console.log('Available models before request:', 
        JSON.stringify(listData.models || listData || []));
        
      // Look for deepseek model specifically
      const models = listData.models || (Array.isArray(listData) ? listData : []);
      const deepseekModels = models.filter(m => {
        const modelName = typeof m === 'string' ? m : (m.name || m.model || '');
        return modelName.toLowerCase().includes('deepseek');
      });
      
      if (deepseekModels.length > 0) {
        console.log('Found DeepSeek models:', deepseekModels);
      } else {
        console.log('No DeepSeek models found in the available models list');
      }
    } catch (err) {
      console.log('Could not list models for debugging:', err.message);
    }
    
    // Automatically map any deepseek-related model name to the correct one if needed
    // This helps when the model name in the URL doesn't exactly match the one in Ollama
    let actualModel = model;
    if (model.toLowerCase().includes('deepseek') && !model.includes('deepseek-coder:1.5b')) {
      console.log('Trying to use deepseek-coder:1.5b instead of', model);
      actualModel = 'deepseek-coder:1.5b';
    }
    
    // Send the generation request
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: actualModel,
        prompt: message,
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 1024
        }
      }),
    });
    
    if (!response.ok) {
      let errorText = '';
      try {
        const errorData = await response.json();
        errorText = errorData.error || await response.text();
      } catch {
        errorText = await response.text();
      }
      
      console.error('Ollama API error response:', errorText);
      
      // Handle common Ollama errors with better messages
      if (errorText.includes('model not found')) {
        return res.status(404).json({
          error: `Model "${actualModel}" not found in your Ollama installation`,
          message: `Try pulling the model first with: ollama pull ${actualModel}`
        });
      }
      
      throw new Error(`Ollama API responded with status ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    console.log(`Ollama response generated (length: ${data.response?.length || 0} chars)`);
    
    return res.json({ response: data.response });
  } catch (error) {
    console.error('Ollama API error:', error);
    res.status(500).json({ 
      error: `Failed to generate response from Ollama model "${model}"`,
      message: error.message 
    });
  }
});

// Endpoint to get the list of GGUF models
app.get('/api/gguf/models', (req, res) => {
  // Rescan the models directory to get any newly added models
  ggufModels = scanGGUFModels();
  res.json({ models: ggufModels });
});

// Function to try to find llama.cpp executable
const findLlamaCppExecutable = () => {
  // List of possible executable names
  const possibleExecutables = [
    'llama-main',         // Common name for the main executable
    'llama',              // Simple name
    'main',               // Sometimes built as just 'main'
    'llama_main',         // Another variation
    'llama.cpp',          // Default repo name
    'llama_cpp',          // Without period
    'llama-server'        // Server variant
  ];
  
  // List of possible paths
  const possiblePaths = [
    '/usr/bin',
    '/usr/local/bin',
    '/opt/llama.cpp',
    '/opt/llama.cpp/build',
    '/opt/llama',
    '/opt/llama/build',
    process.env.HOME + '/llama.cpp',
    process.env.HOME + '/llama.cpp/build',
    process.env.HOME + '/llama',
    process.env.HOME + '/llama/build',
    '/home/chase/llama.cpp',
    '/home/chase/llama.cpp/build'
  ];
  
  // Try to find the executable
  for (const path of possiblePaths) {
    for (const executable of possibleExecutables) {
      const fullPath = `${path}/${executable}`;
      if (fs.existsSync(fullPath)) {
        console.log(`Found llama.cpp executable at: ${fullPath}`);
        return fullPath;
      }
    }
  }
  
  // If nothing found, return a default
  return process.env.LLAMA_PATH || 'llama-main';
};

// Path to llama.cpp executable
const llamaPath = findLlamaCppExecutable();

// Endpoint to query a GGUF model using llama.cpp
app.post('/api/gguf/:modelName', async (req, res) => {
  const { modelName } = req.params;
  const { message } = req.body;
  
  console.log(`Using GGUF model: ${modelName}`);
  
  // Find the model in our list
  const model = ggufModels.find(m => m.name === modelName);
  
  if (!model) {
    return res.status(404).json({ 
      error: `Model "${modelName}" not found`,
      message: `Please make sure the model file is in the models directory and has a .gguf extension`
    });
  }
  
  const modelPath = model.path;
  console.log(`Model path: ${modelPath}`);
  
  // Check if file exists
  if (!fs.existsSync(modelPath)) {
    return res.status(404).json({ 
      error: 'Model file not found',
      message: `The model file ${modelName} could not be found at ${modelPath}`
    });
  }
  
  try {
    // Create a temporary directory for this request
    const requestId = Date.now();
    const tempDir = path.join(modelsDir, `temp_${requestId}`);
    
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Create a temporary input file for the prompt
    const promptFile = path.join(tempDir, 'prompt.txt');
    fs.writeFileSync(promptFile, message);
    
    // Create a temporary output file for the response
    const outputFile = path.join(tempDir, 'output.txt');
    
    // Command to run llama.cpp
    // You may need to adjust parameters based on your system capabilities
    const command = `${llamaPath} -m ${modelPath} -f ${promptFile} -n 512 --temp 0.7 --repeat_penalty 1.1 -ngl 1 > ${outputFile}`;
    
    console.log(`Running command: ${command}`);
    
    // Execute the command
    exec(command, { timeout: 60000 }, (error, stdout, stderr) => {
      // Read the output file regardless of error
      let response = '';
      
      try {
        if (fs.existsSync(outputFile)) {
          response = fs.readFileSync(outputFile, 'utf8');
          console.log(`Response length: ${response.length} characters`);
        }
      } catch (readError) {
        console.error('Error reading output file:', readError);
      }
      
      // Clean up temporary files
      try {
        fs.unlinkSync(promptFile);
        if (fs.existsSync(outputFile)) {
          fs.unlinkSync(outputFile);
        }
        fs.rmdirSync(tempDir);
      } catch (cleanupError) {
        console.error('Error cleaning up temporary files:', cleanupError);
      }
      
      if (error) {
        console.error('Error running llama.cpp:', error);
        console.error('stderr:', stderr);
        
        // If we have any response despite the error, return it
        if (response) {
          return res.json({ response });
        }
        
        // Try checking for common error patterns
        if (stderr && stderr.includes("CUDA")) {
          return res.status(500).json({
            error: 'CUDA error while running llama.cpp',
            message: 'There was a GPU error. Try using CPU mode by setting -ngl 0'
          });
        }
        
        // Return a generic error
        return res.status(500).json({
          error: 'Error running llama.cpp',
          message: stderr || error.message || 'Unknown error',
          details: `Make sure llama.cpp is installed correctly and accessible at: ${llamaPath}`
        });
      }
      
      // If we don't have a response but also no error, something went wrong
      if (!response) {
        // Try running a simplified version as a fallback
        const fallbackCommand = `${llamaPath} -m ${modelPath} -p "${message}" -n 256`;
        console.log(`Trying fallback command: ${fallbackCommand}`);
        
        exec(fallbackCommand, { timeout: 30000 }, (fallbackError, fallbackStdout) => {
          if (fallbackError) {
            return res.status(500).json({
              error: 'Failed to generate response with llama.cpp',
              message: 'Both standard and fallback commands failed',
              details: fallbackError.message
            });
          }
          
          // Return the stdout as the response
          return res.json({ response: fallbackStdout });
        });
        
        return;
      }
      
      // If we have a response, return it
      res.json({ response });
    });
  } catch (error) {
    console.error('Error processing GGUF model request:', error);
    res.status(500).json({ 
      error: 'Failed to process GGUF model request',
      message: error.message 
    });
  }
});

// Testing endpoint when API keys aren't available
app.post('/api/test', (req, res) => {
  const { message } = req.body;
  
  // Simulate AI response with plain text
  let response;
  
  if (message.toLowerCase().includes('hello') || message.toLowerCase().includes('hi')) {
    response = "Hello! I'm a test AI assistant. How can I help you today?";
  } else if (message.toLowerCase().includes('help')) {
    response = "I'm a test assistant that simulates AI responses. You can ask me questions, and I'll provide simple canned responses based on keywords in your message. Try asking about 'weather', my 'name', or request a 'joke'.";
  } else if (message.toLowerCase().includes('weather')) {
    response = "I don't have real-time weather data, but I can tell you that it's always sunny in the test environment!";
  } else if (message.toLowerCase().includes('name')) {
    response = "My name is TestBot, a simulated AI assistant.";
  } else if (message.toLowerCase().includes('joke')) {
    const jokes = [
      "Why don't scientists trust atoms? Because they make up everything!",
      "Why did the scarecrow win an award? Because he was outstanding in his field!",
      "What's a programmer's favorite place to hang out? The foo bar.",
      "Why don't programmers like nature? It has too many bugs."
    ];
    response = jokes[Math.floor(Math.random() * jokes.length)];
  } else {
    response = `This is a test response to: "${message}". I'm a simulated AI assistant. Try asking about 'help', 'weather', 'name', or request a 'joke'.`;
  }
  
  // Simulate processing delay
  setTimeout(() => {
    res.json({ response });
  }, 800); // Simulating realistic API delay
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`Using llama.cpp executable at: ${llamaPath}`);
  console.log(`Found ${ggufModels.length} GGUF models in ${modelsDir}`);
  ggufModels.forEach(model => {
    console.log(`- ${model.name}`);
  });
});
