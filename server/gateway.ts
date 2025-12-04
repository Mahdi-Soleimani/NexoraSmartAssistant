import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, LiveServerMessage } from '@google/genai';
// Note: In a real Node environment, you would use 'dotenv' to load keys
// import dotenv from 'dotenv'; dotenv.config();

/**
 * CONFIGURATION
 */
const PORT = 8080;
const API_KEY = process.env.API_KEY || ''; // MUST be set in environment
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/gemini-action';
const MODEL = 'gemini-2.5-flash-native-audio-preview-09-2025';

// Define the automation tool for n8n
const automationTool = {
  functionDeclarations: [
    {
      name: 'trigger_automation',
      description: 'Trigger an external automation workflow via n8n.',
      parameters: {
        type: 'OBJECT',
        properties: {
          action: {
            type: 'STRING',
            description: 'The action to perform (e.g., turn_lights_on, check_calendar)',
          },
          details: {
            type: 'STRING',
            description: 'Additional details or context for the action',
          }
        },
        required: ['action']
      }
    }
  ]
};

const wss = new WebSocketServer({ port: PORT });
console.log(`Gateway running on ws://localhost:${PORT}`);

wss.on('connection', async (ws: WebSocket) => {
  console.log('Client connected');

  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  // Connect to Gemini Live API
  // We keep the session active for the duration of the WS connection
  let session: any = null;

  try {
    session = await ai.live.connect({
      model: MODEL,
      config: {
        tools: [automationTool],
        systemInstruction: "You are a helpful home assistant. If the user asks to do something outside of conversation (like lights, calendar, data), use the trigger_automation tool.",
      },
      callbacks: {
        onopen: () => {
          console.log('Connected to Gemini');
          ws.send(JSON.stringify({ type: 'text', payload: { role: 'system', text: 'Assistant Ready' } }));
        },
        onmessage: async (msg: LiveServerMessage) => {
          // 1. Handle Audio Output
          const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (audioData) {
            ws.send(JSON.stringify({ type: 'audio', data: audioData }));
          }

          // 2. Handle Text Transcription (for UI logs)
          const transcript = msg.serverContent?.modelTurn?.parts?.[0]?.text;
          if (transcript) {
             ws.send(JSON.stringify({ type: 'text', payload: { role: 'assistant', text: transcript } }));
          }

          // 3. Handle Tool Calls (n8n integration)
          if (msg.toolCall) {
            console.log('Tool call received:', JSON.stringify(msg.toolCall));
            
            for (const call of msg.toolCall.functionCalls) {
              if (call.name === 'trigger_automation') {
                try {
                  // Notify Client
                  ws.send(JSON.stringify({ type: 'text', payload: { role: 'system', text: `Executing: ${call.args.action}` } }));

                  // Call n8n
                  const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(call.args)
                  });
                  
                  const result = await n8nResponse.json();
                  
                  // Send result back to Gemini
                  await session.sendToolResponse({
                    functionResponses: {
                      name: call.name,
                      id: call.id,
                      response: { result: result }
                    }
                  });

                } catch (err) {
                  console.error('n8n Error:', err);
                  // Send error back to Gemini so it can apologize
                  await session.sendToolResponse({
                    functionResponses: {
                      name: call.name,
                      id: call.id,
                      response: { error: "Failed to execute automation" }
                    }
                  });
                }
              }
            }
          }
          
          // 4. Handle Interruption
          if (msg.serverContent?.interrupted) {
            ws.send(JSON.stringify({ type: 'interrupt' }));
          }
        },
        onclose: () => {
          console.log('Gemini disconnected');
        },
        onerror: (err) => {
          console.error('Gemini Error:', err);
        }
      }
    });

  } catch (err) {
    console.error('Failed to start Gemini session:', err);
    ws.close();
    return;
  }

  // Handle messages from Client (Browser)
  ws.on('message', async (data) => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.type === 'audio' && msg.data) {
        // Forward audio to Gemini
        // Convert base64 to Blob format required by SDK (or raw object if using low-level)
        // SDK 'sendRealtimeInput' accepts { mimeType, data }
        await session.sendRealtimeInput({
          mimeType: 'audio/pcm;rate=16000',
          data: msg.data
        });
      }
    } catch (err) {
      console.error('Error processing client message:', err);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    // Session doesn't have a close method exposed easily in the typed SDK sometimes, 
    // but usually handling the WS close is enough.
  });
});