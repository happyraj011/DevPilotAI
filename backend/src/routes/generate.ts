import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent';

export async function generateCode(req: Request, res: Response) {
  try {
    const { prompt, language, userId } = req.body;

    // Validation
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res.status(400).json({ error: 'Prompt is required and must be a non-empty string' });
    }

    if (!language || typeof language !== 'string') {
      return res.status(400).json({ error: 'Language is required and must be a string' });
    }

    const validLanguages = ['Python', 'JavaScript', 'C++', 'TypeScript'];
    if (!validLanguages.includes(language)) {
      return res.status(400).json({ error: `Language must be one of: ${validLanguages.join(', ')}` });
    }

    // Validate userId if provided
    if (userId && typeof userId !== 'string') {
      return res.status(400).json({ error: 'userId must be a string if provided' });
    }

    // Check if user exists if userId is provided
    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
    }

    // Generate code using Gemini API v1
    const fullPrompt = `You are a code generation assistant. Generate clean, well-commented code in ${language}. Return ONLY the code without any markdown formatting, explanations, or additional text. Just the raw code.

User request: ${prompt}`;

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: fullPrompt }
            ]
          }
        ]
      }),
    });

    if (!response.ok) {
      const errorData: any = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
    }

    const data: any = await response.json();
    const generatedCode = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    if (!generatedCode) {
      return res.status(500).json({ error: 'Failed to generate code' });
    }

    // Save to database
    const generation = await prisma.generation.create({
      data: {
        prompt: prompt.trim(),
        language,
        code: generatedCode,
        userId: userId || null,
      },
    });

    res.json(generation);
  } catch (error: any) {
    console.error('Error generating code:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.status,
      code: error.code,
    });
    
    // Handle Gemini API errors
    if (error.message?.includes('API_KEY_INVALID') || error.message?.includes('API key')) {
      return res.status(401).json({ 
        error: 'Invalid Gemini API key', 
        message: 'Please check your GEMINI_API_KEY in the .env file. Get your API key at https://makersuite.google.com/app/apikey'
      });
    }
    
    if (error.message?.includes('quota') || error.message?.includes('429')) {
      return res.status(429).json({ 
        error: 'Gemini API quota exceeded', 
        message: 'You have exceeded your Gemini API quota. Please check your usage at https://makersuite.google.com/app/apikey'
      });
    }
    
    if (error.status) {
      return res.status(error.status).json({ 
        error: 'Gemini API error', 
        message: error.message || 'Failed to generate code'
      });
    }

    res.status(500).json({ 
      error: 'Failed to generate code', 
      message: error.message || 'An unexpected error occurred'
    });
  }
}

