import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Input validation schema
const RequestSchema = z.object({
  subjectId: z.string().uuid('Invalid subject ID format'),
  difficulty: z.enum(['basic', 'intermediate', 'advanced'], {
    errorMap: () => ({ message: 'Difficulty must be basic, intermediate, or advanced' })
  }),
  count: z.number().int().min(1).max(10).default(5)
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized - missing or invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create client with user's auth token to verify authentication
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify the user's token using getUser
    const { data: userData, error: userError } = await supabaseAuth.auth.getUser();
    
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized - invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse and validate input
    let rawBody;
    try {
      rawBody = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const validation = RequestSchema.safeParse(rawBody);
    if (!validation.success) {
      return new Response(JSON.stringify({ 
        error: 'Invalid input', 
        details: validation.error.errors 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { subjectId, difficulty, count } = validation.data;
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Use service role key for database access
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: subject } = await supabase
      .from('subjects')
      .select('name')
      .eq('id', subjectId)
      .single();

    const subjectName = subject?.name || 'General Knowledge';

    const difficultyDesc = {
      'basic': 'simple, beginner-level questions suitable for elementary students',
      'intermediate': 'moderate difficulty questions for middle school level',
      'advanced': 'challenging questions for high school students'
    };

    const prompt = `Generate ${count} multiple choice questions about ${subjectName}. 
These should be ${difficultyDesc[difficulty as keyof typeof difficultyDesc] || 'moderate difficulty'}.

For each question, provide:
1. A clear question
2. Exactly 4 options (A, B, C, D)
3. The correct answer
4. A brief explanation

Return ONLY valid JSON in this exact format, no markdown:
{
  "questions": [
    {
      "id": "1",
      "question": "The question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": "Option A",
      "explanation": "Brief explanation"
    }
  ]
}`;

    console.log('Generating questions for:', subjectName, 'difficulty:', difficulty);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: 'You are an educational content generator. Generate engaging and accurate quiz questions. Always respond with valid JSON only, no markdown formatting.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices[0]?.message?.content || '';
    
    console.log('AI Response:', content);

    // Clean the response - remove markdown code blocks if present
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    let questions;
    try {
      questions = JSON.parse(content);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      // Return fallback questions
      questions = {
        questions: [
          { id: '1', question: `What is a key concept in ${subjectName}?`, options: ['Option A', 'Option B', 'Option C', 'Option D'], correct_answer: 'Option A', explanation: 'This is the correct answer.' },
          { id: '2', question: `Which of these relates to ${subjectName}?`, options: ['Choice 1', 'Choice 2', 'Choice 3', 'Choice 4'], correct_answer: 'Choice 1', explanation: 'This is correct.' },
          { id: '3', question: `In ${subjectName}, what is important?`, options: ['Answer A', 'Answer B', 'Answer C', 'Answer D'], correct_answer: 'Answer A', explanation: 'This is why.' },
          { id: '4', question: `What principle applies to ${subjectName}?`, options: ['First', 'Second', 'Third', 'Fourth'], correct_answer: 'First', explanation: 'Explanation here.' },
          { id: '5', question: `Which statement about ${subjectName} is true?`, options: ['True A', 'True B', 'True C', 'True D'], correct_answer: 'True A', explanation: 'Because...' }
        ]
      };
    }

    return new Response(JSON.stringify(questions), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error generating challenges:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      questions: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
