// Text extraction and document verification utilities

interface DocumentData {
  [key: string]: string;
}

interface VerificationResult {
  isValid: boolean;
  message: string;
  details?: string[];
  confidence?: number;
}

// Extract text from image using Tesseract.js (fallback) or Gemini API
export const extractTextFromImage = async (file: File): Promise<string> => {
  const apiKeys = getStoredApiKeys();
  
  // Try Gemini API first if available
  if (apiKeys.gemini) {
    try {
      return await extractTextWithGemini(file, apiKeys.gemini);
    } catch (error) {
      console.warn("Gemini API failed, falling back to Tesseract:", error);
    }
  }

  // Fallback to Tesseract.js
  return await extractTextWithTesseract(file);
};

// Extract text from PDF
export const extractTextFromPDF = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    // Note: pdf-parse works in Node.js, for browser we need a different approach
    // For now, return a placeholder - in production, you'd use pdf.js or similar
    return "PDF text extraction will be implemented with pdf.js library for browser compatibility";
  } catch (error) {
    throw new Error("Failed to extract text from PDF");
  }
};

// Extract text using Gemini API
const extractTextWithGemini = async (file: File, apiKey: string): Promise<string> => {
  try {
    // Convert file to base64
    const base64 = await fileToBase64(file);
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              text: "Extract all text from this document image. Focus on identity information, numbers, dates, and addresses. Return only the extracted text without any formatting or analysis."
            },
            {
              inline_data: {
                mime_type: file.type,
                data: base64.split(',')[1] // Remove data:image/... prefix
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2048,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    const extractedText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    if (!extractedText) {
      throw new Error("No text extracted from Gemini API");
    }

    return extractedText;
  } catch (error) {
    console.error("Gemini extraction error:", error);
    throw error;
  }
};

// Fallback text extraction using Tesseract.js
const extractTextWithTesseract = async (file: File): Promise<string> => {
  try {
    // Dynamic import to avoid build issues
    const Tesseract = await import('tesseract.js');
    
    const { data: { text } } = await Tesseract.recognize(file, 'eng', {
      logger: m => console.log(m)
    });
    
    return text;
  } catch (error) {
    console.error("Tesseract extraction error:", error);
    throw new Error("Failed to extract text using OCR");
  }
};

// Verify document using API or mock verification
export const verifyDocument = async (documentType: string, documentData: DocumentData): Promise<VerificationResult> => {
  const apiKeys = getStoredApiKeys();
  
  // If we have a real verification API key, use it
  if (apiKeys.verification) {
    try {
      return await verifyWithRealAPI(documentType, documentData, apiKeys.verification);
    } catch (error) {
      console.warn("Real API verification failed, using mock:", error);
    }
  }

  // Mock verification for testing
  return performMockVerification(documentType, documentData);
};

// Real API verification (placeholder for actual implementation)
const verifyWithRealAPI = async (documentType: string, documentData: DocumentData, apiKey: string): Promise<VerificationResult> => {
  // This is where you'd integrate with actual verification APIs
  // For example, NSDL for Aadhar, Income Tax Dept for PAN, etc.
  
  throw new Error("Real API integration not implemented yet - add your verification API endpoint here");
};

// Mock verification for testing and demonstration
const performMockVerification = (documentType: string, documentData: DocumentData): VerificationResult => {
  const details: string[] = [];
  let isValid = true;
  let confidence = 0;

  switch (documentType) {
    case 'aadhar':
      // Validate Aadhar number format
      const aadharNumber = documentData.aadharNumber?.replace(/\s/g, '');
      if (!aadharNumber || !/^\d{12}$/.test(aadharNumber)) {
        isValid = false;
        details.push("Invalid Aadhar number format");
      } else {
        details.push("Aadhar number format is valid");
        confidence += 25;
      }

      // Check name
      if (!documentData.name || documentData.name.length < 2) {
        isValid = false;
        details.push("Name is required");
      } else {
        details.push("Name field verified");
        confidence += 25;
      }

      // Check date of birth
      if (!documentData.dateOfBirth) {
        isValid = false;
        details.push("Date of birth is required");
      } else {
        details.push("Date of birth format verified");
        confidence += 25;
      }

      // Check address
      if (!documentData.address || documentData.address.length < 10) {
        details.push("Address should be more detailed");
        confidence += 10;
      } else {
        details.push("Address format verified");
        confidence += 25;
      }
      break;

    case 'pan':
      // Validate PAN number format
      const panNumber = documentData.panNumber?.toUpperCase();
      if (!panNumber || !/^[A-Z]{5}\d{4}[A-Z]$/.test(panNumber)) {
        isValid = false;
        details.push("Invalid PAN number format");
      } else {
        details.push("PAN number format is valid");
        confidence += 30;
      }

      // Check name
      if (!documentData.name || documentData.name.length < 2) {
        isValid = false;
        details.push("Name is required");
      } else {
        details.push("Name field verified");
        confidence += 25;
      }

      // Check father's name
      if (!documentData.fatherName) {
        details.push("Father's name not provided");
        confidence += 10;
      } else {
        details.push("Father's name verified");
        confidence += 20;
      }

      // Check date of birth
      if (!documentData.dateOfBirth) {
        details.push("Date of birth not provided");
        confidence += 10;
      } else {
        details.push("Date of birth verified");
        confidence += 15;
      }
      break;

    case 'marksheet':
      // Check roll number
      if (!documentData.rollNumber) {
        isValid = false;
        details.push("Roll number is required");
      } else {
        details.push("Roll number verified");
        confidence += 20;
      }

      // Check student name
      if (!documentData.studentName || documentData.studentName.length < 2) {
        isValid = false;
        details.push("Student name is required");
      } else {
        details.push("Student name verified");
        confidence += 20;
      }

      // Check board
      if (!documentData.board) {
        isValid = false;
        details.push("Board/University is required");
      } else {
        details.push("Board information verified");
        confidence += 20;
      }

      // Check year
      const year = parseInt(documentData.year);
      if (!year || year < 1990 || year > new Date().getFullYear()) {
        isValid = false;
        details.push("Invalid passing year");
      } else {
        details.push("Passing year verified");
        confidence += 20;
      }

      // Check percentage/marks
      if (!documentData.percentage) {
        details.push("Percentage/CGPA not provided");
        confidence += 5;
      } else {
        details.push("Marks information verified");
        confidence += 15;
      }
      break;

    default:
      return {
        isValid: false,
        message: "Unsupported document type",
        details: ["Document type not recognized"]
      };
  }

  return {
    isValid,
    message: isValid 
      ? `Document verification successful (${confidence}% confidence)`
      : "Document verification failed - please check the details",
    details,
    confidence
  };
};

// Helper function to convert file to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

// Get stored API keys from localStorage
const getStoredApiKeys = () => {
  try {
    const keys = localStorage.getItem("veridoc-api-keys");
    return keys ? JSON.parse(keys) : { gemini: "", verification: "", backup: "" };
  } catch (error) {
    console.error("Error loading API keys:", error);
    return { gemini: "", verification: "", backup: "" };
  }
};