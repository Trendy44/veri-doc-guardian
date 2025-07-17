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
    const { extractedText, documentType } = await req.json();
    console.log('Received request:', { documentType, textLength: extractedText?.length });
    
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY not found in environment');
      return new Response(JSON.stringify({ 
        error: 'GEMINI_API_KEY not configured',
        details: 'API key is missing from environment variables'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!extractedText || !extractedText.trim()) {
      return new Response(JSON.stringify({ 
        error: 'No text provided',
        details: 'extractedText parameter is empty or missing'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let prompt = '';
    
    if (documentType === 'marksheet') {
      prompt = `
You are an AI that specializes in parsing Indian academic marksheets. Analyze the following extracted text from a marksheet and identify the key information. The text may contain OCR errors, so be intelligent about inferring the correct values.

EXTRACTED TEXT:
${extractedText}

Please extract and return ONLY a valid JSON object with the following structure:
{
  "rollNumber": "student's roll number or seat number (not centre number)",
  "studentName": "full student name",
  "board": "board/university/school name",
  "year": "year of examination (4 digits)",
  "subjects": "subject1: marks1/total1\\nsubject2: marks2/total2\\n...",
  "percentage": "calculated percentage based on marks (e.g., 85.5%)"
}

IMPORTANT PARSING RULES:
1. Roll/Seat Number: Look for "ROLL NO", "SEAT NO", or similar labels. Avoid centre numbers which are usually larger.
2. Student Name: Usually in ALL CAPS, typically appears after roll number
3. Board: Often at the top, contains words like BOARD, UNIVERSITY, CBSE, ICSE, STATE
4. Year: 4-digit year, usually recent (2015-2025)
5. Subjects & Marks: Look for subject names (English, Mathematics, Physics, Chemistry, etc.) followed by marks
6. Calculate percentage as: (total marks obtained / total maximum marks) * 100

If marksheet appears to be in a table format, the typical structure is:
- Column 1: Subject name
- Column 2: Maximum marks
- Column 3: Marks obtained
- Column 4: Marks in words

Look for patterns like "410/500" which indicate total obtained/total maximum marks.

Return ONLY the JSON object, no additional text.`;
    } else if (documentType === 'aadhar') {
      prompt = `
Analyze this Aadhar card text and extract key information:

EXTRACTED TEXT:
${extractedText}

Return ONLY a valid JSON object:
{
  "aadharNumber": "12-digit aadhar number",
  "name": "person's name",
  "dateOfBirth": "date of birth",
  "address": "address if visible"
}`;
    } else if (documentType === 'pan') {
      prompt = `
Analyze this PAN card text and extract key information:

EXTRACTED TEXT:
${extractedText}

Return ONLY a valid JSON object:
{
  "panNumber": "10-character PAN number",
  "name": "person's name", 
  "fatherName": "father's name if visible",
  "dateOfBirth": "date of birth if visible"
}`;
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1000,
        }
      }),
    });

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      throw new Error('No response from Gemini');
    }

    console.log('Gemini response:', generatedText);

    // Try to parse the JSON response
    let parsedData;
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : generatedText;
      parsedData = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw response:', generatedText);
      throw new Error('Failed to parse Gemini response as JSON');
    }

    return new Response(JSON.stringify(parsedData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in parse-marksheet function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Failed to parse document with AI'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});