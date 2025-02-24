#!/usr/bin/env node

// A script to help set up the llama.cpp path for AI Chat Hub
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('AI Chat Hub - llama.cpp Setup');
console.log('=============================');
console.log('This script will help you set up llama.cpp for use with AI Chat Hub.');
console.log('');

// Try to find llama.cpp executable
function findLlamaCppExecutable() {
  console.log('Searching for llama.cpp executable...');
  
  // List of possible executable names
  const possibleExecutables = [
    'llama-main',
    'llama',
    'main',
    'llama_main',
    'llama.cpp',
    'llama_cpp',
    'llama-server'
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
    process.env.HOME + '/llama/build'
  ];
  
  // Try to find the executable
  for (const dirPath of possiblePaths) {
    for (const executable of possibleExecutables) {
      const fullPath = path.join(dirPath, executable);
      if (fs.existsSync(fullPath)) {
        console.log(`Found llama.cpp executable at: ${fullPath}`);
        return fullPath;
      }
    }
  }
  
  console.log('No llama.cpp executable found in common locations.');
  return null;
}

// Main script
async function main() {
  // Try to find the executable
  const foundPath = findLlamaCppExecutable();
  
  if (foundPath) {
    rl.question(`\nDo you want to use the found executable: ${foundPath}? (Y/n) `, answer => {
      if (answer.toLowerCase() === 'n') {
        askForPath();
      } else {
        setPath(foundPath);
      }
    });
  } else {
    askForPath();
  }
}

function askForPath() {
  rl.question('\nPlease enter the full path to your llama.cpp executable: ', path => {
    if (!path) {
      console.log('No path entered. Exiting...');
      rl.close();
      return;
    }
    
    if (!fs.existsSync(path)) {
      console.log(`Warning: The file at ${path} does not exist or is not accessible.`);
      rl.question('Do you want to continue anyway? (y/N) ', answer => {
        if (answer.toLowerCase() === 'y') {
          setPath(path);
        } else {
          askForPath();
        }
      });
    } else {
      setPath(path);
    }
  });
}

function setPath(llamaPath) {
  console.log(`\nSetting llama.cpp path to: ${llamaPath}`);
  
  // Create a .env file in the backend directory
  const envPath = path.join(__dirname, 'backend', '.env');
  
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }
  
  // Check if LLAMA_PATH is already set
  if (envContent.includes('LLAMA_PATH=')) {
    // Replace the existing line
    envContent = envContent.replace(/LLAMA_PATH=.*$/m, `LLAMA_PATH=${llamaPath}`);
  } else {
    // Add a new line
    envContent += `\nLLAMA_PATH=${llamaPath}\n`;
  }
  
  // Write the updated content back to the file
  fs.writeFileSync(envPath, envContent);
  
  console.log('\nLLAMA_PATH has been set in your backend/.env file.');
  console.log('You can now run the AI Chat Hub application with:');
  console.log('  npm run dev:all');
  console.log('\nThe application will use the specified llama.cpp executable to run your GGUF models.');
  
  rl.close();
}

main();