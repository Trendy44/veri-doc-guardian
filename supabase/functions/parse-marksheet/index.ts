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
      prompt = `You are an expert at extracting data from Indian educational marksheets. Analyze the following text extracted from a marksheet and return a JSON object with the extracted information.

CRITICAL TABLE STRUCTURE UNDERSTANDING:
The marksheet contains a table with subjects and marks in this exact format:
- Column 1: Subject name with code (e.g., "013 ENGLISH", "050 MATHEMATICS") 
- Column 2: Total marks (usually 100 for theory, 50 for practical subjects)
- Column 3: Marks obtained (numbers only)
- Column 4: Marks obtained in words (ignore this for calculations)

SPECIFIC PARSING RULES:

1. ROLL NUMBER EXTRACTION:
   - Look for patterns like "B 283496" (letter followed by space and 6 digits)
   - May be labeled as "Seat No." or similar
   - NOT the large center/school codes

2. STUDENT NAME EXTRACTION:
   - Usually appears in ALL CAPS
   - Full name format like "GEVARIYA ANSH ARVINDBHAI"
   - Look for the longest name string in capitals

3. SUBJECT AND MARKS EXTRACTION:
   - Parse the table structure carefully
   - Extract subject code and name from column 1
   - Get total marks from column 2
   - Get obtained marks from column 3 (ignore column 4 words)
   - For practical subjects (those with "PRACT" in name):
     * Combine with corresponding theory subject
     * Theory (100) + Practical (50) = Combined total out of 150

4. CALCULATION RULES:
   - Calculate percentage based on actual marks structure
   - Validate that marks make logical sense (0-100 for theory, 0-50 for practical)
   - If marks seem incorrect, apply logical correction

5. BOARD IDENTIFICATION:
   - Look for "Gujarat" for Gujarat State Board
   - Look for "CBSE", "ICSE", etc.

6. CLASS IDENTIFICATION:
   - "Higher Secondary" = 12th class
   - "Secondary" = 10th class

VALIDATION AND ERROR CORRECTION:
- Check if extracted marks are realistic
- Verify subject names make sense
- Ensure roll number follows expected pattern
- Correct obvious OCR errors logically
- If percentage calculation seems wrong, recalculate

Return ONLY a valid JSON object with these exact keys:
{
  "rollNumber": "extracted roll number (e.g., B 283496)",
  "studentName": "full student name in proper case", 
  "board": "board name",
  "year": "examination year",
  "class": "10th or 12th",
  "subjects": "subject1: obtained/total\\nsubject2: obtained/total\\n...",
  "percentage": "calculated percentage (2 decimal places)"
}

EXTRACTED TEXT:
${extractedText}`;
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

    // Check if the API returned an error
    if (!response.ok || data.error) {
      console.error('Gemini API error:', data.error || 'Unknown error');
      return new Response(JSON.stringify({ 
        error: 'Gemini API Error',
        details: data.error?.message || `API request failed with status ${response.status}. Please try again in a few moments.`
      }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      console.error('No generated text in response:', data);
      return new Response(JSON.stringify({ 
        error: 'No response from Gemini',
        details: 'Gemini did not generate any text. Please try again.'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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