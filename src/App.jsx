import React, { useState, useEffect } from 'react';
import { 
  Send, 
  Plus, 
  Settings, 
  MessageSquare, 
  Rocket, 
  Lightbulb, 
  FileText, 
  Sparkles, 
  Trash2, 
  X,
  RefreshCcw,
  Server
} from 'lucide-react';

const ModernChat = () => {
  // New state for chat history and settings
  const [chatHistory, setChatHistory] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [uiSettings, setUiSettings] = useState({
    enableAnimations: true,
    compactView: false,
  });
  const [showSettings, setShowSettings] = useState(false);
  
  // Existing state
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('test'); // Default to Test mode to ensure it works
  const [ollamaModels, setOllamaModels] = useState([]);
  const [ggufModels, setGgufModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);
  
  const suggestions = [
    { icon: <Lightbulb size={20} />, title: "Solve", description: "complex problems" },
    { icon: <MessageSquare size={20} />, title: "Code", description: "Write and explain code" },
    { icon: <Rocket size={20} />, title: "Brainstorm", description: "creative ideas" },
    { icon: <FileText size={20} />, title: "Summarize text", description: "Get the key points" },
    { icon: <Sparkles size={20} />, title: "Summarize", description: "the key points of text" }
  ];
  
  // Create a state variable for the model endpoints so they update correctly
  const [modelEndpoints, setModelEndpoints] = useState({
    gemini: '/api/gemini',
    test: '/api/test',  // Test endpoint that works without API keys
    'ollama/deepseek-coder:1.5b': '/api/ollama/deepseek-coder:1.5b',  // Direct access to DeepSeek
    'gguf/sample.gguf': '/api/gguf/sample.gguf',  // Direct access to sample GGUF
    'gguf/Llama-3.2-3B-Instruct-Q2_K.gguf': '/api/gguf/Llama-3.2-3B-Instruct-Q2_K.gguf'  // Direct access to Llama GGUF
  });

  // Function to fetch GGUF models
  const fetchGgufModels = async () => {
    setLoadingModels(true);
    try {
      const response = await fetch('http://localhost:3001/api/gguf/models');
      const data = await response.json();
      
      console.log('GGUF API response:', data);
      
      if (data.models && Array.isArray(data.models)) {
        console.log('Available GGUF models:', data.models);
        
        // Set the GGUF models
        setGgufModels(data.models);
        
        // Update model endpoints dynamically using the state setter
        setModelEndpoints(prev => {
          const updated = { ...prev };
          data.models.forEach(model => {
            updated[`gguf/${model.name}`] = `/api/gguf/${model.name}`;
          });
          console.log('Model endpoints updated with GGUF models:', updated);
          return updated;
        });
      } else {
        console.log('No GGUF models found or unexpected response format');
      }
    } catch (error) {
      console.error('Error fetching GGUF models:', error);
    } finally {
      setLoadingModels(false);
    }
  };

  // On initial load, create a default chat session if none exist and fetch models
  useEffect(() => {
    if (chatHistory.length === 0) {
      const newChat = { id: Date.now(), title: 'New Chat', messages: [] };
      setChatHistory([newChat]);
      setActiveChatId(newChat.id);
    }
    
    // Fetch available models
    fetchOllamaModels();
    fetchGgufModels();
  }, []);
  
  // Function to fetch Ollama models
  const fetchOllamaModels = async () => {
    setLoadingModels(true);
    try {
      const response = await fetch('http://localhost:3001/api/ollama/models');
      const data = await response.json();
      
      console.log('Ollama API response:', data);
      
      if (data.models && Array.isArray(data.models)) {
        console.log('Available Ollama models:', data.models);
        
        // Store the Ollama models, making sure each model has a name property
        const processedModels = data.models.map(model => {
          // If the model is a string or has no name property, create a proper object
          if (typeof model === 'string') {
            return { name: model };
          } else if (!model.name && model.model) {
            // Some versions use 'model' instead of 'name'
            return { name: model.model };
          }
          return model;
        });
        
        setOllamaModels(processedModels);
        
        // Update model endpoints dynamically using the state setter
        setModelEndpoints(prev => {
          const updated = { ...prev };
          processedModels.forEach(model => {
            updated[`ollama/${model.name}`] = `/api/ollama/${model.name}`;
          });
          console.log('Model endpoints updated with Ollama models:', updated);
          return updated;
        });
      } else if (data.error) {
        console.error('Ollama server error:', data.error);
        alert(`Ollama error: ${data.message || data.error}`);
        setOllamaModels([]);
      } else {
        console.error('Failed to fetch Ollama models: Unexpected response format');
        setOllamaModels([]);
      }
    } catch (error) {
      console.error('Error fetching Ollama models:', error);
      setOllamaModels([]);
    } finally {
      setLoadingModels(false);
    }
  };

  // Helper to get the active chat
  const activeChat = chatHistory.find(chat => chat.id === activeChatId) || { messages: [] };

  // Helper to add a message to the active chat
  const addMessageToActiveChat = (msg) => {
    setChatHistory(prev =>
      prev.map(chat => 
        chat.id === activeChatId 
          ? { ...chat, messages: [...chat.messages, msg] } 
          : chat
      )
    );
  };

  const sendMessage = async () => {    
    if (!inputText.trim()) return;
    
    addMessageToActiveChat({ sender: 'user', text: inputText });
    const currentInput = inputText;
    setInputText('');
    setLoading(true);
    
    // Get model display name
    let modelDisplayName = 'AI';
    if (selectedModel === 'gemini') {
      modelDisplayName = 'Gemini';
    } else if (selectedModel === 'test') {
      modelDisplayName = 'Test Bot';
    } else if (selectedModel.startsWith('ollama/')) {
      modelDisplayName = selectedModel.replace('ollama/', '');
    } else if (selectedModel.startsWith('gguf/')) {
      modelDisplayName = selectedModel.replace('gguf/', '').replace('.gguf', '');
    }
    
    // Add a temporary "thinking" message
    const tempMessage = { 
      sender: 'bot', 
      text: `${modelDisplayName} is thinking...`,
      isLoading: true 
    };
    addMessageToActiveChat(tempMessage);
    
    try {
      // Determine the correct endpoint
      console.log('Available endpoints:', modelEndpoints);
      console.log('Selected model:', selectedModel);
      
      const endpoint = modelEndpoints[selectedModel];
      if (!endpoint) {
        console.error('Model not found in endpoints map:', selectedModel);
        console.error('Available endpoints:', Object.keys(modelEndpoints));
        throw new Error(`Invalid model selection: ${selectedModel}`);
      }
      
      console.log('Sending request to:', `http://localhost:3001${endpoint}`);
      const response = await fetch(`http://localhost:3001${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: currentInput,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server responded with status code ${response.status}`);
      }
      
      const data = await response.json();
      
      // Remove the temporary message and add the final bot response
      setChatHistory(prev =>
        prev.map(chat => {
          if (chat.id === activeChatId) {
            const newMessages = chat.messages.filter(msg => !msg.isLoading);
            return { 
              ...chat, 
              messages: [
                ...newMessages, 
                { 
                  sender: 'bot', 
                  text: data.response, 
                  model: modelDisplayName 
                }
              ] 
            };
          }
          return chat;
        })
      );
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove the temporary message and show the error message
      setChatHistory(prev =>
        prev.map(chat => {
          if (chat.id === activeChatId) {
            const newMessages = chat.messages.filter(msg => !msg.isLoading);
            return { 
              ...chat, 
              messages: [
                ...newMessages, 
                { 
                  sender: 'bot', 
                  text: error.message || 'Network error. Please check if the server is running.', 
                  isError: true,
                  model: selectedModel.includes('/') ? selectedModel.split('/')[1] : selectedModel
                }
              ]
            };
          }
          return chat;
        })
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  // Create a new chat session
  const createNewChat = () => {
    const newChat = { id: Date.now(), title: 'New Chat', messages: [] };
    setChatHistory(prev => [newChat, ...prev]);
    setActiveChatId(newChat.id);
  };

  // Delete a chat session
  const deleteChat = (chatId) => {
    setChatHistory(prev => {
      const newHistory = prev.filter(chat => chat.id !== chatId);
      if (newHistory.length === 0) {
        // If all chats are deleted, create a new one.
        const newChat = { id: Date.now(), title: 'New Chat', messages: [] };
        setActiveChatId(newChat.id);
        return [newChat];
      } else if (activeChatId === chatId) {
        // If the active chat is deleted, switch to the first chat.
        setActiveChatId(newHistory[0].id);
      }
      return newHistory;
    });
  };

  const toggleSettings = () => {
    setShowSettings(prev => !prev);
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-900 to-gray-950">
      {/* Sidebar */}
      <div className="w-72 bg-gray-800/80 backdrop-blur-sm text-gray-300 flex flex-col border-r border-gray-700/50 shadow-lg">
        <div className="p-5 space-y-5">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Server size={20} className="text-blue-400" />
              AI Chat Hub
            </h1>
          </div>
          
          <button 
            onClick={createNewChat}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg p-3 transition-all shadow-md hover:shadow-blue-700/20">
            <Plus size={18} />
            New chat
          </button>
          
          {/* Model Selector with Ollama models */}
          <div className="flex flex-col gap-3 bg-gray-800/80 rounded-lg p-4 border border-gray-700/50">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium text-gray-200">AI Model</h3>
              <button 
                onClick={fetchOllamaModels}
                className="p-1.5 text-gray-400 hover:text-blue-400 transition-colors rounded-full hover:bg-gray-700/50"
                title="Refresh Ollama models"
                disabled={loadingModels}
              >
                <RefreshCcw size={14} className={loadingModels ? 'animate-spin' : ''} />
              </button>
            </div>
            <select
              value={selectedModel}
              onChange={(e) => {
                console.log('Model selection changed to:', e.target.value);
                console.log('Current endpoints:', modelEndpoints);
                setSelectedModel(e.target.value);
              }}
              className="w-full bg-gray-700/70 border border-gray-600/50 text-white rounded-lg p-2.5 
                focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none
                shadow-inner transition-all"
              style={{ backgroundImage: "url('data:image/svg+xml;utf8,<svg fill=\"white\" height=\"24\" viewBox=\"0 0 24 24\" width=\"24\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M7 10l5 5 5-5z\"/><path d=\"M0 0h24v24H0z\" fill=\"none\"/></svg>')", 
                      backgroundRepeat: "no-repeat", 
                      backgroundPosition: "right 8px center" }}
            >
              <option value="test">🧪 Test Mode (No API Key)</option>
              <option value="gemini">✨ Google Gemini</option>
              
              {/* DeepSeek Direct Access */}
              <option value="ollama/deepseek-coder:1.5b">🚀 DeepSeek Coder 1.5B</option>
              
              {/* GGUF Models Group */}
              {ggufModels.length > 0 && (
                <optgroup label="🧠 Local GGUF Models">
                  {ggufModels.map((model, idx) => (
                    <option key={`gguf-${idx}`} value={`gguf/${model.name}`}>
                      {model.name.replace('.gguf', '')}
                    </option>
                  ))}
                </optgroup>
              )}
              
              {/* Ollama Models Group */}
              {ollamaModels.length > 0 && (
                <optgroup label="🦙 Ollama Models">
                  {ollamaModels.map((model, idx) => {
                    // Handle different response formats
                    const modelName = typeof model === 'string' ? model : model.name;
                    const modelDisplayName = modelName.replace(':latest', '');
                    
                    return (
                      <option key={`ollama-${idx}`} value={`ollama/${modelName}`}>
                        {modelDisplayName}
                      </option>
                    );
                  })}
                </optgroup>
              )}
            </select>

            {/* Model status messages */}
            {loadingModels ? (
              <div className="text-xs text-blue-400 flex items-center animate-pulse">
                <RefreshCcw size={12} className="mr-1 animate-spin" />
                Loading models...
              </div>
            ) : (
              <div className="space-y-1">
                {/* GGUF Models Status */}
                <div className="text-xs flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-1 ${ggufModels.length > 0 ? 'bg-emerald-400' : 'bg-gray-500'}`}></div>
                  <span className={ggufModels.length > 0 ? 'text-emerald-400' : 'text-gray-500'}>
                    {ggufModels.length > 0 
                      ? `${ggufModels.length} GGUF ${ggufModels.length === 1 ? 'model' : 'models'} available` 
                      : 'No GGUF models found'}
                  </span>
                </div>
                
                {/* Ollama Status */}
                <div className="text-xs flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-1 ${ollamaModels.length > 0 ? 'bg-emerald-400' : 'bg-amber-400'}`}></div>
                  <span className={ollamaModels.length > 0 ? 'text-emerald-400' : 'text-amber-400'}>
                    {ollamaModels.length > 0 
                      ? `${ollamaModels.length} Ollama ${ollamaModels.length === 1 ? 'model' : 'models'} available` 
                      : 'No Ollama models found. Is Ollama running?'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <div className="flex items-center justify-between px-2 mb-2">
            <h2 className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Conversations</h2>
            {chatHistory.length > 1 && (
              <span className="text-xs text-gray-500">{chatHistory.length}</span>
            )}
          </div>
          <div className="space-y-1">
            {chatHistory.map((chat) => (
              <div key={chat.id} className="flex items-center group transition-all">
                <button 
                  onClick={() => setActiveChatId(chat.id)}
                  className={`flex-1 text-left py-2 px-3 hover:bg-gray-700/50 rounded-l-lg transition-all
                    ${activeChatId === chat.id ? 'bg-blue-600/20 text-blue-100' : 'text-gray-300'}`}
                >
                  <div className="flex items-center">
                    <MessageSquare size={15} className={`mr-2 ${activeChatId === chat.id ? 'text-blue-400' : 'text-gray-500'}`} />
                    <span className="truncate">{chat.title}</span>
                  </div>
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }} 
                  className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-r-lg opacity-0 group-hover:opacity-100 transition-all"
                  aria-label="Delete chat"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-gray-700/50">
          <button 
            onClick={toggleSettings}
            className="w-full flex items-center gap-2 hover:bg-gray-700/50 rounded-lg p-2.5 transition-colors"
          >
            <Settings size={18} className="text-gray-400" />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <main className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent p-6">
          {activeChat.messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center">
              <div className="max-w-2xl text-center mb-8">
                <h1 className="text-4xl font-bold text-white bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-violet-500 mb-4">
                  Welcome to AI Chat Hub
                </h1>
                <p className="text-gray-400 text-lg mb-8">Choose an AI model and start a conversation</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 max-w-2xl">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => setInputText(suggestion.title + " " + suggestion.description)}
                    className="flex items-center gap-3 p-4 bg-gray-800/60 hover:bg-gray-700/70 border border-gray-700/50 
                      rounded-lg text-left text-gray-300 shadow-md hover:shadow-lg transition-all group"
                  >
                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 group-hover:text-blue-300 transition-colors">
                      {suggestion.icon}
                    </div>
                    <div>
                      <div className="font-medium">{suggestion.title}</div>
                      <div className="text-sm text-gray-400">{suggestion.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              <div className={`space-y-6 ${uiSettings.compactView ? 'space-y-2' : ''}`}>
                {activeChat.messages.map((msg, index) => (
                  <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`relative max-w-2xl rounded-2xl ${uiSettings.compactView ? 'p-3' : 'p-4'} ${
                        msg.sender === 'user'
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10'
                          : msg.isError
                          ? 'bg-red-900/30 text-red-200 border border-red-800/50'
                          : 'bg-gray-800/90 text-gray-200 border border-gray-700/50 shadow-md'
                      } ${msg.isLoading && uiSettings.enableAnimations ? 'animate-pulse' : ''}`}
                    >
                      {/* Message content */}
                      <div className="whitespace-pre-wrap">
                        {msg.model && !msg.isLoading && (
                          <div className={`text-xs ${msg.isError ? 'text-red-300' : 'text-gray-400'} mb-2 flex items-center`}>
                            <Server size={12} className="mr-1" />
                            {msg.model}
                          </div>
                        )}
                        {msg.text}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>

        {/* Input Area */}
        <div className="p-4 bg-gray-900/50 backdrop-blur-sm border-t border-gray-800">
          <div className="max-w-3xl mx-auto relative">
            <textarea
              className="w-full bg-gray-800/90 text-white rounded-xl pl-4 pr-12 py-3.5 resize-none focus:outline-none 
                focus:ring-2 focus:ring-blue-500 border border-gray-700/70 shadow-md transition-all"
              rows={inputText.split('\n').length > 1 ? Math.min(5, inputText.split('\n').length) : 1}
              placeholder="Type your message..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
            <button
              className={`absolute right-3 bottom-3.5 p-2 rounded-lg 
                ${loading || !inputText.trim() 
                  ? 'text-gray-500 cursor-not-allowed' 
                  : 'text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 transition-colors'}`}
              onClick={sendMessage}
              disabled={loading || !inputText.trim()}
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity">
          <div className="bg-gray-800 border border-gray-700/70 p-6 rounded-xl w-96 shadow-xl">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-semibold text-white">Settings</h2>
              <button 
                onClick={toggleSettings}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700/70 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-5">
              <div className="p-3 bg-gray-900/50 rounded-lg border border-gray-700/50">
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="animations" className="text-gray-300 font-medium">Enable Animations</label>
                  <div className="relative inline-block w-10 align-middle select-none">
                    <input 
                      id="animations"
                      type="checkbox" 
                      checked={uiSettings.enableAnimations}
                      onChange={(e) => setUiSettings({ ...uiSettings, enableAnimations: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-gray-700 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                  </div>
                </div>
                <p className="text-xs text-gray-500">Adds subtle animations to loading states and transitions</p>
              </div>
              
              <div className="p-3 bg-gray-900/50 rounded-lg border border-gray-700/50">
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="compact" className="text-gray-300 font-medium">Compact View</label>
                  <div className="relative inline-block w-10 align-middle select-none">
                    <input 
                      id="compact"
                      type="checkbox" 
                      checked={uiSettings.compactView}
                      onChange={(e) => setUiSettings({ ...uiSettings, compactView: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-gray-700 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                  </div>
                </div>
                <p className="text-xs text-gray-500">Reduces spacing between messages for a denser conversation view</p>
              </div>
              
              <div className="p-3 bg-gray-900/50 rounded-lg border border-gray-700/50">
                <h3 className="text-gray-300 font-medium mb-2">Model Status</h3>
                
                {/* GGUF Status */}
                <div className="mb-3">
                  <div className="flex items-center mb-1">
                    <div className={`w-2.5 h-2.5 rounded-full mr-2 ${ggufModels.length > 0 ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                    <span className="text-sm text-gray-400 font-medium">GGUF Models</span>
                  </div>
                  <div className="text-xs text-gray-400 ml-4 mb-1">
                    {ggufModels.length > 0 
                      ? `${ggufModels.length} models available` 
                      : "No GGUF models found"}
                  </div>
                  <div className="text-xs text-gray-500 ml-4 mb-2">
                    Place .gguf files in the /models directory
                  </div>
                  <button
                    onClick={fetchGgufModels}
                    className="ml-4 text-xs text-blue-500 hover:text-blue-400 flex items-center"
                  >
                    <RefreshCcw size={12} className="mr-1" />
                    Scan for GGUF models
                  </button>
                </div>
                
                {/* Ollama Status */}
                <div>
                  <div className="flex items-center mb-1">
                    <div className={`w-2.5 h-2.5 rounded-full mr-2 ${ollamaModels.length > 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="text-sm text-gray-400 font-medium">Ollama</span>
                  </div>
                  <div className="text-xs text-gray-400 ml-4 mb-1">
                    {ollamaModels.length > 0 
                      ? `Connected (${ollamaModels.length} models available)` 
                      : "Not connected - Is Ollama running?"}
                  </div>
                  <button
                    onClick={fetchOllamaModels}
                    className="ml-4 text-xs text-blue-500 hover:text-blue-400 flex items-center"
                  >
                    <RefreshCcw size={12} className="mr-1" />
                    Refresh connection
                  </button>
                </div>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-700/50 flex justify-end">
              <button
                onClick={toggleSettings}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModernChat;
