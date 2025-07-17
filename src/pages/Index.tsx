import { useState } from "react";
import { Shield, FileText, CreditCard, GraduationCap, Upload, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);

  const documentTypes = [
    {
      id: "aadhar",
      title: "Aadhar Card",
      description: "Verify Aadhar card details and authenticity",
      icon: Shield,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      id: "pan",
      title: "PAN Card", 
      description: "Validate PAN card information and status",
      icon: CreditCard,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      id: "marksheet",
      title: "Marksheet",
      description: "Verify 10th/12th class marksheet details",
      icon: GraduationCap,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    }
  ];

  const handleDocumentSelect = (docType: string) => {
    setSelectedDocument(docType);
    navigate(`/verify/${docType}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-primary rounded-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">VeriDoc Guardian</h1>
                <p className="text-sm text-muted-foreground">Secure Document Verification</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/settings")}
              className="gap-2"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Professional Document Verification
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Upload or enter document details for instant verification using advanced OCR and AI technology. 
            Secure, accurate, and reliable verification for Aadhar, PAN cards, and academic certificates.
          </p>
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-secure rounded-full"></div>
              <span>Bank-grade Security</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span>AI-powered OCR</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-accent rounded-full"></div>
              <span>Instant Results</span>
            </div>
          </div>
        </div>

        {/* Document Type Selection */}
        <div className="mb-8">
          <h3 className="text-2xl font-semibold text-foreground mb-6 text-center">
            Choose Document Type to Verify
          </h3>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {documentTypes.map((doc) => {
              const IconComponent = doc.icon;
              return (
                <Card 
                  key={doc.id}
                  className="cursor-pointer transition-all duration-300 hover:shadow-floating hover:scale-105 border-2 hover:border-primary/30 bg-gradient-card"
                  onClick={() => handleDocumentSelect(doc.id)}
                >
                  <CardHeader className="text-center pb-4">
                    <div className={`w-16 h-16 mx-auto rounded-full ${doc.bgColor} flex items-center justify-center mb-4`}>
                      <IconComponent className={`h-8 w-8 ${doc.color}`} />
                    </div>
                    <CardTitle className="text-lg">{doc.title}</CardTitle>
                    <CardDescription className="text-sm">{doc.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button variant="professional" className="w-full" size="lg">
                      <Upload className="h-4 w-4 mr-2" />
                      Start Verification
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Features Section */}
        <div className="bg-muted rounded-lg p-8 mt-12">
          <h3 className="text-xl font-semibold text-foreground mb-6 text-center">
            Why Choose VeriDoc Guardian?
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h4 className="font-semibold mb-2">Secure & Encrypted</h4>
              <p className="text-sm text-muted-foreground">All documents are processed with end-to-end encryption</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                <FileText className="h-6 w-6 text-accent" />
              </div>
              <h4 className="font-semibold mb-2">Multiple Formats</h4>
              <p className="text-sm text-muted-foreground">Support for images, PDFs, and manual text entry</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                <GraduationCap className="h-6 w-6 text-warning" />
              </div>
              <h4 className="font-semibold mb-2">AI-Powered</h4>
              <p className="text-sm text-muted-foreground">Advanced OCR with Gemini AI for accurate text extraction</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
