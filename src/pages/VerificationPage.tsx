import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import { 
  Upload, 
  FileText, 
  Image as ImageIcon, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  ArrowLeft,
  Camera,
  Shield,
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { extractTextFromImage, extractTextFromPDF, verifyDocument } from "@/lib/verification";

interface DocumentData {
  [key: string]: string;
}

const VerificationPage = () => {
  const { documentType } = useParams<{ documentType: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState<string>("");
  const [documentData, setDocumentData] = useState<DocumentData>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const [progress, setProgress] = useState(0);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("upload");

  const documentConfig = {
    aadhar: {
      title: "Aadhar Card Verification",
      fields: [
        { key: "aadharNumber", label: "Aadhar Number", placeholder: "XXXX XXXX XXXX", type: "text" },
        { key: "name", label: "Full Name", placeholder: "As per Aadhar card", type: "text" },
        { key: "dateOfBirth", label: "Date of Birth", placeholder: "DD/MM/YYYY", type: "date" },
        { key: "gender", label: "Gender", placeholder: "Male/Female/Other", type: "text" },
        { key: "address", label: "Address", placeholder: "Complete address", type: "textarea" }
      ]
    },
    pan: {
      title: "PAN Card Verification", 
      fields: [
        { key: "panNumber", label: "PAN Number", placeholder: "ABCDE1234F", type: "text" },
        { key: "name", label: "Full Name", placeholder: "As per PAN card", type: "text" },
        { key: "fatherName", label: "Father's Name", placeholder: "Father's name", type: "text" },
        { key: "dateOfBirth", label: "Date of Birth", placeholder: "DD/MM/YYYY", type: "date" }
      ]
    },
    marksheet: {
      title: "Marksheet Verification",
      fields: [
        { key: "rollNumber", label: "Roll Number", placeholder: "Roll/Registration number", type: "text" },
        { key: "studentName", label: "Student Name", placeholder: "As per marksheet", type: "text" },
        { key: "board", label: "Board/University", placeholder: "CBSE/ICSE/State Board", type: "text" },
        { key: "year", label: "Passing Year", placeholder: "YYYY", type: "text" },
        { key: "percentage", label: "Percentage/CGPA", placeholder: "Overall percentage", type: "text" },
        { key: "subjects", label: "Subjects & Marks", placeholder: "Subject-wise marks", type: "textarea" }
      ]
    }
  };

  const currentConfig = documentConfig[documentType as keyof typeof documentConfig];

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploadedFile(file);
    setIsProcessing(true);
    setProcessingStep("Uploading file...");
    setProgress(20);

    try {
      let extractedText = "";
      
      if (file.type.startsWith('image/')) {
        setProcessingStep("Extracting text from image...");
        setProgress(50);
        extractedText = await extractTextFromImage(file);
      } else if (file.type === 'application/pdf') {
        setProcessingStep("Extracting text from PDF...");
        setProgress(50);
        extractedText = await extractTextFromPDF(file);
      }

      setExtractedText(extractedText);
      setProcessingStep("Processing complete!");
      setProgress(100);
      
      // Parse extracted text into form fields
      parseExtractedText(extractedText);
      
      toast({
        title: "Text Extraction Successful",
        description: "Document text has been extracted and parsed.",
      });

      // Switch to manual entry tab to review/edit
      setActiveTab("manual");
      
    } catch (error) {
      console.error("Error processing file:", error);
      toast({
        title: "Processing Error",
        description: "Failed to extract text from the document. Please try manual entry.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setTimeout(() => setProgress(0), 1000);
    }
  }, []);

  const parseExtractedText = (text: string) => {
    console.log("Parsing extracted text:", text);
    const data: DocumentData = {};
    const lines = text.split('\n').filter(line => line.trim());
    
    if (documentType === 'aadhar') {
      // Look for Aadhar number pattern
      const aadharMatch = text.match(/\b\d{4}\s?\d{4}\s?\d{4}\b/);
      if (aadharMatch) data.aadharNumber = aadharMatch[0];
      
      // Look for DOB pattern
      const dobMatch = text.match(/\b\d{2}[-\/]\d{2}[-\/]\d{4}\b/);
      if (dobMatch) data.dateOfBirth = dobMatch[0];
      
      // Extract names - typically the first text lines after numbers
      const nameLines = lines.filter(line => /^[A-Z\s]+$/.test(line.trim()));
      if (nameLines.length > 0) data.name = nameLines[0];
      
    } else if (documentType === 'pan') {
      // Look for PAN pattern
      const panMatch = text.match(/\b[A-Z]{5}\d{4}[A-Z]\b/);
      if (panMatch) data.panNumber = panMatch[0];
      
      // Extract names
      const nameLines = lines.filter(line => /^[A-Z\s]+$/.test(line.trim()));
      if (nameLines.length > 0) data.name = nameLines[0];
      if (nameLines.length > 1) data.fatherName = nameLines[1];
      
    } else if (documentType === 'marksheet') {
      // Extract roll number or seat number
      const rollMatch = text.match(/(?:ROLL\s*NO|SEAT\s*NO|ROLL\s*NUMBER|SEAT\s*NUMBER)[\s:]*(\d+)/i);
      if (rollMatch) {
        data.rollNumber = rollMatch[1];
      } else {
        // Fallback: look for standalone numbers that could be roll/seat numbers
        const numMatch = lines.find(line => /^\d{4,8}$/.test(line.trim()));
        if (numMatch) data.rollNumber = numMatch.trim();
      }
      
      // Extract student name (lines with all caps text, longer than 5 chars)
      const nameLines = lines.filter(line => {
        const cleanLine = line.trim();
        return /^[A-Z\s]+$/.test(cleanLine) && cleanLine.length > 5 && cleanLine.length < 50;
      });
      if (nameLines.length > 0) data.studentName = nameLines[0];
      
      // Extract board/school name
      const schoolLine = lines.find(line => 
        /(?:VIDYALAYA|SCHOOL|COLLEGE|BOARD|UNIVERSITY|CBSE|ICSE|KERALA|MAHARASHTRA|UP|BIHAR|WEST BENGAL)/i.test(line)
      );
      if (schoolLine) data.board = schoolLine;
      
      // Extract year from date patterns
      const yearMatch = text.match(/\b(19|20)\d{2}\b/);
      if (yearMatch) data.year = yearMatch[0];
      
      // Dynamic subject and marks extraction
      const subjectKeywords = /(?:MATHEMATICS|MATHS|ENGLISH|PHYSICS|CHEMISTRY|COMPUTER|BIOLOGY|HINDI|SANSKRIT|SOCIAL|SCIENCE|PRACTICAL|THEORY)/i;
      const subjectsData: Array<{subject: string, marks: string}> = [];
      
      // Look for subject-mark patterns in the text
      const subjectLines = text.split('\n').filter(line => subjectKeywords.test(line));
      
      for (const line of subjectLines) {
        // Extract subject name
        const subjectMatch = line.match(/([A-Z\s]+(?:PRACTICAL|THEORY)?)/i);
        if (subjectMatch) {
          const subject = subjectMatch[1].trim();
          
          // Look for marks in the same line or nearby lines
          const marksInLine = line.match(/\b(\d{2,3})\b/g);
          if (marksInLine) {
            // Filter out likely non-mark numbers (like years, codes)
            const validMarks = marksInLine.filter(mark => {
              const num = parseInt(mark);
              return num >= 0 && num <= 100;
            });
            
            if (validMarks.length > 0) {
              subjectsData.push({subject, marks: validMarks[0]});
            }
          }
        }
      }
      
      // If dynamic extraction didn't work well, try pattern-based extraction
      if (subjectsData.length === 0) {
        // Look for patterns like "013", "050", "093" which are common mark patterns
        const markPattern = /\b(\d{2,3})\b/g;
        const allMarks = [...text.matchAll(markPattern)]
          .map(match => match[1])
          .filter(mark => {
            const num = parseInt(mark);
            return num >= 0 && num <= 100;
          });
        
        // Try to match with common subjects if we have marks
        const commonSubjects = ['English', 'Mathematics', 'Physics', 'Chemistry', 'Computer', 'Biology'];
        allMarks.slice(0, Math.min(allMarks.length, 6)).forEach((mark, index) => {
          if (index < commonSubjects.length) {
            subjectsData.push({subject: commonSubjects[index], marks: mark});
          }
        });
      }
      
      // Format subjects string
      if (subjectsData.length > 0) {
        data.subjects = subjectsData.map(item => `${item.subject}: ${item.marks}`).join('\n');
        
        // Calculate percentage from actual marks
        const totalObtained = subjectsData.reduce((sum, item) => sum + parseInt(item.marks), 0);
        const maxMarksPerSubject = 100; // Assuming 100 max marks per subject
        const totalMaxMarks = subjectsData.length * maxMarksPerSubject;
        const percentage = (totalObtained / totalMaxMarks) * 100;
        data.percentage = `${percentage.toFixed(1)}%`;
      }
    }
    
    console.log("Parsed document data:", data);
    setDocumentData(data);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.bmp'],
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  const handleInputChange = (key: string, value: string) => {
    setDocumentData(prev => ({ ...prev, [key]: value }));
  };

  const handleVerification = async () => {
    if (!documentData || Object.keys(documentData).length === 0) {
      toast({
        title: "Missing Information",
        description: "Please fill in the required document details.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setProcessingStep("Verifying document details...");
    setProgress(30);

    try {
      setProgress(70);
      const result = await verifyDocument(documentType!, documentData);
      setVerificationResult(result);
      setProgress(100);
      
      toast({
        title: result.isValid ? "Verification Successful" : "Verification Failed",
        description: result.message,
        variant: result.isValid ? "default" : "destructive"
      });
    } catch (error) {
      console.error("Verification error:", error);
      toast({
        title: "Verification Error", 
        description: "Failed to verify document. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  if (!currentConfig) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Invalid Document Type</CardTitle>
            <CardDescription>The requested document type is not supported.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/")} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate("/")}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-primary rounded-lg">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">{currentConfig.title}</h1>
                <p className="text-sm text-muted-foreground">Secure document verification</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Progress Bar */}
        {isProcessing && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{processingStep}</span>
                  <span className="text-sm text-muted-foreground">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Verification Result */}
        {verificationResult && (
          <Card className={`mb-6 border-2 ${verificationResult.isValid ? 'border-secure bg-green-50' : 'border-failed bg-red-50'}`}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                {verificationResult.isValid ? (
                  <CheckCircle className="h-8 w-8 text-secure" />
                ) : (
                  <XCircle className="h-8 w-8 text-failed" />
                )}
                <div>
                  <h3 className="font-semibold text-lg">
                    {verificationResult.isValid ? 'Document Verified' : 'Verification Failed'}
                  </h3>
                  <p className="text-muted-foreground">{verificationResult.message}</p>
                  {verificationResult.details && (
                    <div className="mt-2 space-y-1">
                      {verificationResult.details.map((detail: string, index: number) => (
                        <p key={index} className="text-sm text-muted-foreground">• {detail}</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload" className="gap-2">
              <Upload className="h-4 w-4" />
              Upload Document
            </TabsTrigger>
            <TabsTrigger value="manual" className="gap-2">
              <FileText className="h-4 w-4" />
              Manual Entry
            </TabsTrigger>
          </TabsList>

          {/* Upload Tab */}
          <TabsContent value="upload" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Upload Document
                </CardTitle>
                <CardDescription>
                  Upload an image or PDF of your {documentType} document for automatic text extraction
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}
                >
                  <input {...getInputProps()} />
                  <div className="space-y-4">
                    <div className="flex justify-center">
                      {uploadedFile ? (
                        uploadedFile.type.startsWith('image/') ? (
                          <ImageIcon className="h-12 w-12 text-primary" />
                        ) : (
                          <FileText className="h-12 w-12 text-primary" />
                        )
                      ) : (
                        <Upload className="h-12 w-12 text-muted-foreground" />
                      )}
                    </div>
                    
                    {uploadedFile ? (
                      <div>
                        <p className="font-medium">{uploadedFile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="font-medium">
                          {isDragActive ? 'Drop your document here' : 'Drag & drop your document here'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          or click to browse • PNG, JPG, PDF up to 10MB
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                {uploadedFile && !isProcessing && (
                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <Label className="text-sm font-medium">Extracted Text Preview:</Label>
                    <div className="mt-2 max-h-32 overflow-y-auto text-sm bg-background p-3 rounded border">
                      {extractedText || "No text extracted yet"}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Manual Entry Tab */}
          <TabsContent value="manual" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Document Details
                </CardTitle>
                <CardDescription>
                  Enter or review the extracted document information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {currentConfig.fields.map((field) => (
                  <div key={field.key} className="space-y-2">
                    <Label htmlFor={field.key}>{field.label}</Label>
                    {field.type === 'textarea' ? (
                      <Textarea
                        id={field.key}
                        placeholder={field.placeholder}
                        value={documentData[field.key] || ''}
                        onChange={(e) => handleInputChange(field.key, e.target.value)}
                        className="min-h-[100px]"
                      />
                    ) : (
                      <Input
                        id={field.key}
                        type={field.type}
                        placeholder={field.placeholder}
                        value={documentData[field.key] || ''}
                        onChange={(e) => handleInputChange(field.key, e.target.value)}
                      />
                    )}
                  </div>
                ))}
                
                <div className="pt-4">
                  <Button 
                    onClick={handleVerification}
                    disabled={isProcessing}
                    variant="hero"
                    size="lg"
                    className="w-full"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <Shield className="h-4 w-4 mr-2" />
                        Verify Document
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Security Notice */}
        <Card className="mt-6 border-warning/50 bg-warning/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
              <div>
                <h4 className="font-medium text-warning-foreground">Security Notice</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  All uploaded documents are processed securely and are not stored permanently. 
                  Verification is performed using encrypted connections to ensure your data privacy.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default VerificationPage;