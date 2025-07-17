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
You are an AI that specializes in parsing CBSE and other Indian academic marksheets. Analyze the following extracted text from a marksheet and identify the key information. The text may contain OCR errors, so be intelligent about inferring the correct values.

EXTRACTED TEXT:
${extractedText}

Please extract and return ONLY a valid JSON object with the following structure:
{
  "rollNumber": "student's roll number or seat number (not centre number)",
  "studentName": "full student name",
  "board": "board/university/school name",
  "year": "year of examination (4 digits)",
  "class": "10th/Xth or 12th/XIIth - identify the class level",
  "subjects": "subject1: theory_marks + practical_marks = total_marks\\nsubject2: theory_marks + practical_marks = total_marks\\n...",
  "percentage": "calculated percentage based on total marks obtained / total possible marks * 100"
}

CRITICAL CBSE MARKSHEET PARSING RULES:

1. CLASS IDENTIFICATION:
   - Look for "SECONDARY" or "CLASS X" or "10th" = Class 10th/Xth
   - Look for "SENIOR SECONDARY" or "CLASS XII" or "12th" = Class 12th/XIIth

2. ROLL NUMBER: Look for "ROLL NO", "SEAT NO" - avoid centre numbers (usually larger)

3. CBSE TABLE STRUCTURE (typical columns left to right):
   - Column 1: Subject name (MATHEMATICS, PHYSICS, CHEMISTRY, etc.)
   - Column 2: Theory marks obtained
   - Column 3: Practical marks obtained (shows "XXX" or similar if no practical)
   - Column 4: Total marks obtained (theory + practical)
   - Column 5: Total marks in words (ignore this, use column 4)

4. MARKS EXTRACTION:
   - Extract theory and practical marks separately
   - If practical shows "XXX" or similar, treat as 0 practical marks
   - Total for each subject = theory + practical marks
   - Assume each subject is out of 100 marks total
   - IGNORE subjects without actual marks like: WORK EXPERIENCE, PHYSICAL EDUCATION, PHY & HEALTH EDUCA, GENERAL STUDIES

5. PERCENTAGE CALCULATION:
   - Only count subjects that have actual marks (not XXX or blank)
   - Total obtained = sum of all valid subject totals
   - Total possible = number of valid subjects × 100
   - Percentage = (total obtained / total possible) × 100

6. SUBJECT FORMAT:
   For each valid subject, format as: "SUBJECT_NAME: theory_marks + practical_marks = total_marks"
   Example: "MATHEMATICS: 85 + 0 = 85\\nPHYSICS: 78 + 22 = 100"

IMPORTANT: Only include subjects that have actual numerical marks. Skip subjects with no marks or marked as XXX.

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