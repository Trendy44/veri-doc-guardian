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
      prompt = `You are an expert at extracting data from Indian state board marksheets. Analyze the following text and extract information following the EXACT table structure.

CRITICAL: The marksheet has a table with these columns:
1. Subject Name with Code (e.g., "013 ENGLISH", "050 MATHEMATICS")
2. Total Marks (100 for theory, 50 for practical)  
3. Marks Obtained (numerical value like 071, 093, 089)
4. Marks in Words (ignore this column)

EXTRACTION EXAMPLES FROM YOUR FORMAT:
- "013 ENGLISH (B.S.L.) 100 071" → English: 71/100
- "050 MATHEMATICS 100 093" → Mathematics: 93/100  
- "052 CHEMISTRY 100 089" → Chemistry: 89/100
- "053 CHEMISTRY PRACT 050 046" → Chemistry Practical: 46/50
- "054 PHYSICS 100 072" → Physics: 72/100
- "055 PHYSICS PRACT 050 049" → Physics Practical: 49/50
- "331 COMPUTER 100 085" → Computer: 85/100
- "332 COMPUTER PRACT 050 047" → Computer Practical: 47/50

PARSING INSTRUCTIONS:
1. ROLL NUMBER: Extract "B 283496" format (letter + space + 6 digits)
2. STUDENT NAME: Extract "GEVARIYA ANSH ARVINDBHAI" (full name in caps)
3. BOARD: Look for "Gujarat" → "Gujarat State Board"
4. YEAR: Extract 2024 or similar
5. CLASS: "Higher Secondary" = 12th

6. SUBJECTS: Parse each table row:
   - Find subject code (3 digits) + subject name
   - Extract total marks (100 or 050)
   - Extract obtained marks (2-3 digits)
   - Format as "Subject: obtained/total"

7. PERCENTAGE CALCULATION:
   - Add all obtained marks
   - Add all total marks  
   - Calculate: (total_obtained / total_possible) × 100

EXAMPLE OUTPUT for the marks you provided:
"subjects": "English: 71/100\\nMathematics: 93/100\\nChemistry: 89/100\\nChemistry Practical: 46/50\\nPhysics: 72/100\\nPhysics Practical: 49/50\\nComputer: 85/100\\nComputer Practical: 47/50"

Return ONLY valid JSON:
{
  "rollNumber": "B 283496",
  "studentName": "GEVARIYA ANSH ARVINDBHAI", 
  "board": "Gujarat State Board",
  "year": "2024",
  "class": "12th",
  "subjects": "English: 71/100\\nMathematics: 93/100\\nChemistry: 89/100\\nChemistry Practical: 46/50\\nPhysics: 72/100\\nPhysics Practical: 49/50\\nComputer: 85/100\\nComputer Practical: 47/50",
  "percentage": "82.40"
}

TEXT TO PARSE:
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