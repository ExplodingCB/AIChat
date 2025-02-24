# Using Local GGUF Models with AI Chat Hub

This directory is where you can place your GGUF model files for direct use with the AI Chat Hub application.

## Setup

1. Make sure you have llama.cpp installed on your system. If you don't already have it, follow these steps:
   ```
   git clone https://github.com/ggerganov/llama.cpp.git
   cd llama.cpp
   mkdir build && cd build
   cmake ..
   cmake --build . --config Release
   ```

2. Run the setup script to configure AI Chat Hub to use your llama.cpp installation:
   ```
   npm run setup-llama
   ```

## How to Add GGUF Models

1. Simply copy your `.gguf` model files into this directory.
2. Restart the application or click "Scan for GGUF models" in the Settings panel.
3. The models will appear in the model selector dropdown under "Local GGUF Models".

## Currently Installed Models:

- sample.gguf (test file)
- Llama-3.2-3B-Instruct-Q2_K.gguf

## Supported Models

The application supports any GGUF model file with a `.gguf` extension. Popular models include:

- Mistral models
- Llama models
- Phi-2 models
- DeepSeek Coder models
- And many other models available from Hugging Face

## Example Model Downloads

Here are some smaller models that work well with the application:

- TinyLlama: [TinyLlama-1.1B-Chat-v1.0.Q4_K_M.gguf](https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf)
- Phi-2: [phi-2.Q4_K_M.gguf](https://huggingface.co/TheBloke/phi-2-GGUF/resolve/main/phi-2.Q4_K_M.gguf)
- StableLM: [stablelm-zephyr-3b.Q4_K_M.gguf](https://huggingface.co/TheBloke/stablelm-zephyr-3b-GGUF/resolve/main/stablelm-zephyr-3b.Q4_K_M.gguf)

## Troubleshooting

If you encounter issues:

1. Make sure llama.cpp is correctly installed and the executable is found
2. Run the setup script: `npm run setup-llama`
3. Check the server logs for error messages
4. Adjust parameters in `backend/server.js` if needed for your specific system
5. Try a smaller model if you're running out of memory

## Notes

- The backend uses llama.cpp to run inference on your GGUF models
- Larger models will require more RAM to run effectively
- Quantized models (with Q4, Q5, Q8 in their names) require less RAM than non-quantized models
- First-time inference may be slow as the model loads into memory