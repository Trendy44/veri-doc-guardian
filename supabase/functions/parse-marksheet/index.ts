import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function tryGeminiAPI(prompt: string): Promise<any> {
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
  
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
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
  console.log('Gemini API response status:', response.status);
  console.log('Gemini API response data:', data);

  // Check if the API is overloaded or returned an error
  if (!response.ok || data.error) {
    throw new Error(data.error?.message || `Gemini API failed with status ${response.status}`);
  }

  const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!generatedText) {
    throw new Error('No generated text in Gemini response');
  }

  return generatedText;
}

async function tryOpenAIAPI(prompt: string): Promise<any> {
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an AI that specializes in parsing Indian academic documents and identity cards. Return only valid JSON responses.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 1000,
    }),
  });

  const data = await response.json();
  console.log('OpenAI API response status:', response.status);

  if (!response.ok || data.error) {
    throw new Error(data.error?.message || `OpenAI API failed with status ${response.status}`);
  }

  const generatedText = data.choices?.[0]?.message?.content;
  if (!generatedText) {
    throw new Error('No generated text in OpenAI response');
  }

  return generatedText;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { extractedText, documentType } = await req.json();
    console.log('Received request:', { documentType, textLength: extractedText?.length });

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

1. STUDENT IDENTIFICATION:
   - Student name usually appears after "Name:" or "Student Name:" 
   - AVOID picking mother's name, father's name, or school name as student name
   - Roll number is typically smaller (6-8 digits), NOT the large school/centre codes

2. CLASS IDENTIFICATION:
   - Look for "SECONDARY SCHOOL EXAMINATION" = Class 10th/Xth
   - Look for "SENIOR SECONDARY SCHOOL EXAMINATION" = Class 12th/XIIth
   - Look for "CLASS X" or "CLASS 10" = Class 10th/Xth
   - Look for "CLASS XII" or "CLASS 12" = Class 12th/XIIth

3. MARKS TABLE STRUCTURE (CBSE format - columns from left to right):
   - Subject Name (MATHEMATICS, PHYSICS, CHEMISTRY, ENGLISH, etc.)
   - Theory Marks (numerical value or blank)
   - Practical Marks (numerical value or "XXX" if no practical)
   - Total Marks (theory + practical, this is the main score)
   - Total in Words (ignore this column)

4. MARKS EXTRACTION RULES:
   - Focus on the TOTAL MARKS column (4th column) for each subject
   - If total marks column shows a number, use that as the subject total
   - Theory marks = Total marks - Practical marks (if practical exists)
   - If practical shows "XXX", "-", or similar, treat as 0 practical marks
   - Each subject is typically out of 100 marks
   - SKIP these subjects: WORK EXPERIENCE, PHYSICAL EDUCATION, PHY & HEALTH EDUCA, GENERAL STUDIES, ART EDUCATION (they often don't count toward percentage)

5. PERCENTAGE CALCULATION:
   - Only count subjects with actual numerical marks in the total column
   - Sum all valid subject totals = total marks obtained
   - Count number of valid subjects × 100 = total possible marks
   - Percentage = (total obtained ÷ total possible) × 100

6. SUBJECT FORMATTING:
   Format as: "SUBJECT_NAME: theory_marks + practical_marks = total_marks"
   Example: "MATHEMATICS: 85 + 0 = 85\\nPHYSICS: 78 + 22 = 100"

7. COMMON CBSE SUBJECTS TO RECOGNIZE:
   - ENGLISH, HINDI, MATHEMATICS, PHYSICS, CHEMISTRY, BIOLOGY
   - COMPUTER SCIENCE, PHYSICAL EDUCATION, ECONOMICS, POLITICAL SCIENCE
   - BUSINESS STUDIES, ACCOUNTANCY, GEOGRAPHY, HISTORY

EXTRACTION STRATEGY:
1. Find student name near "Name:" label (NOT mother's/father's name)
2. Find roll number (smaller number, usually 6-8 digits)
3. Identify class level from examination title
4. Locate marks table and extract total marks for each academic subject
5. Calculate percentage using only academic subjects with marks

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
Analyze this PAN card text and extract key information. Pay special attention to date formats and PAN card structure.

EXTRACTED TEXT:
${extractedText}

Return ONLY a valid JSON object:
{
  "panNumber": "10-character PAN number (format: ABCDE1234F)",
  "name": "person's name", 
  "fatherName": "father's name if visible",
  "dateOfBirth": "date of birth in DD/MM/YYYY format if visible"
}

PAN CARD PARSING RULES:

1. PAN NUMBER: Look for 10-character alphanumeric code (5 letters + 4 digits + 1 letter)
   - Format: ABCDE1234F
   - Usually prominently displayed

2. NAME: Look for the cardholder's name
   - Usually appears as the main name on the card
   - Avoid picking father's name as the main name

3. FATHER'S NAME: Look for text after "Father's Name" or similar labels

4. DATE OF BIRTH: 
   - Look for dates in DD/MM/YYYY format (like 31/10/1992)
   - May also appear as DD-MM-YYYY or DD.MM.YYYY
   - Could be labeled as "Date of Birth", "DOB", or just appear as a date
   - Convert any date format to DD/MM/YYYY format
   - Look carefully through all the text for date patterns

IMPORTANT: Pay special attention to extracting the date of birth correctly. Look for any date pattern that could represent a birth date.

Return ONLY the JSON object, no additional text.`;
    }

    let generatedText: string;
    
    // Try Gemini first, fallback to OpenAI if it fails
    try {
      console.log('Attempting Gemini API...');
      generatedText = await tryGeminiAPI(prompt);
      console.log('Gemini API succeeded');
    } catch (geminiError) {
      console.log('Gemini API failed:', geminiError.message);
      try {
        console.log('Attempting OpenAI API fallback...');
        generatedText = await tryOpenAIAPI(prompt);
        console.log('OpenAI API succeeded');
      } catch (openaiError) {
        console.log('OpenAI API also failed:', openaiError.message);
        return new Response(JSON.stringify({ 
          error: 'Both AI services unavailable',
          details: `Gemini: ${geminiError.message}. OpenAI: ${openaiError.message}. Please try again later.`
        }), {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    console.log('AI response:', generatedText);

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
      return new Response(JSON.stringify({ 
        error: 'Failed to parse AI response',
        details: 'The AI response could not be parsed. Please try again.'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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