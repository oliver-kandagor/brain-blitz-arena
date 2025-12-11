import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, difficulty = 'basic' } = await req.json();
    
    if (!topic) {
      throw new Error('Topic is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log(`Generating lesson for topic: ${topic}, difficulty: ${difficulty}`);

    const systemPrompt = `You are an AI Teaching Engine. Generate a teaching module in slide format for the given topic.

Rules:
- Use simple explanations appropriate for ${difficulty} level
- Break topics into 5-7 slides
- Include a micro-quiz slide after every 2-3 content slides
- Ensure correctness and avoid repetition
- Output ONLY valid JSON

Return a JSON object with this exact structure:
{
  "title": "Main topic title",
  "slides": [
    {
      "slide_number": 1,
      "type": "content",
      "title": "Slide title",
      "content": "Main explanation (2-3 paragraphs)",
      "example": "Practical example",
      "visual_description": "Description of supporting image",
      "key_points": ["point 1", "point 2"]
    },
    {
      "slide_number": 2,
      "type": "quiz",
      "title": "Quick Check",
      "question": "Quiz question",
      "options": ["A", "B", "C", "D"],
      "correct_answer": "A",
      "explanation": "Why this is correct"
    }
  ]
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Create a ${difficulty} level teaching module about: ${topic}` }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in AI response');
    }

    console.log('Raw AI response:', content);

    // Parse JSON from response
    let lesson;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                        content.match(/```\s*([\s\S]*?)\s*```/) ||
                        [null, content];
      const jsonStr = jsonMatch[1] || content;
      lesson = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      // Return a fallback lesson structure
      lesson = {
        title: topic,
        slides: [
          {
            slide_number: 1,
            type: 'content',
            title: `Introduction to ${topic}`,
            content: content.substring(0, 500),
            example: 'See the content above for details.',
            visual_description: `An educational diagram about ${topic}`,
            key_points: ['Understanding the basics', 'Key concepts explained']
          }
        ]
      };
    }

    console.log('Generated lesson with', lesson.slides?.length || 0, 'slides');

    return new Response(JSON.stringify({ lesson }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-lesson:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Failed to generate lesson' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
