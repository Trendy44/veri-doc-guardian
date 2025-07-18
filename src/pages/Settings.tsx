import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Key, Eye, EyeOff, Save, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [apiKeys, setApiKeys] = useState({
    gemini: "",
    verification: "",
    backup: "",
    // Document verification APIs
    aadharVerificationUrl: "",
    aadharApiKey: "",
    panVerificationUrl: "",
    panApiKey: "",
    class10VerificationUrl: "",
    class10ApiKey: "",
    class12VerificationUrl: "",
    class12ApiKey: ""
  });
  
  const [showKeys, setShowKeys] = useState({
    gemini: false,
    verification: false,
    backup: false,
    aadharVerificationUrl: false,
    aadharApiKey: false,
    panVerificationUrl: false,
    panApiKey: false,
    class10VerificationUrl: false,
    class10ApiKey: false,
    class12VerificationUrl: false,
    class12ApiKey: false
  });

  // Load saved API keys from localStorage
  useEffect(() => {
    const savedKeys = localStorage.getItem("veridoc-api-keys");
    if (savedKeys) {
      try {
        setApiKeys(JSON.parse(savedKeys));
      } catch (error) {
        console.error("Error loading saved API keys:", error);
      }
    }
  }, []);

  const handleKeyChange = (keyType: string, value: string) => {
    setApiKeys(prev => ({ ...prev, [keyType]: value }));
  };

  const toggleShowKey = (keyType: string) => {
    setShowKeys(prev => ({ ...prev, [keyType]: !prev[keyType as keyof typeof prev] }));
  };

  const saveSettings = () => {
    try {
      localStorage.setItem("veridoc-api-keys", JSON.stringify(apiKeys));
      toast({
        title: "Settings Saved",
        description: "API keys have been saved securely in your browser.",
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to save settings. Please try again.",
        variant: "destructive"
      });
    }
  };

  const clearAllKeys = () => {
    const emptyKeys = {
      gemini: "",
      verification: "",
      backup: "",
      aadharVerificationUrl: "",
      aadharApiKey: "",
      panVerificationUrl: "",
      panApiKey: "",
      class10VerificationUrl: "",
      class10ApiKey: "",
      class12VerificationUrl: "",
      class12ApiKey: ""
    };
    setApiKeys(emptyKeys);
    localStorage.removeItem("veridoc-api-keys");
    toast({
      title: "Settings Cleared",
      description: "All API keys have been removed.",
    });
  };

  const apiKeyConfigs = [
    {
      key: "gemini",
      title: "Gemini API Key",
      description: "Google Gemini API key for advanced text extraction from images and PDFs",
      placeholder: "AIzaSy...",
      helpText: "Get your API key from Google AI Studio (https://makersuite.google.com/app/apikey)"
    },
    // Aadhar Verification API
    {
      key: "aadharVerificationUrl",
      title: "Aadhar Verification API URL",
      description: "API endpoint for Aadhar card verification",
      placeholder: "https://api.example.com/verify/aadhar",
      helpText: "Enter the complete URL for your Aadhar verification API endpoint"
    },
    {
      key: "aadharApiKey", 
      title: "Aadhar Verification API Key",
      description: "API key for Aadhar verification service",
      placeholder: "aadhar_api_key...",
      helpText: "API key provided by your Aadhar verification service provider"
    },
    // PAN Verification API
    {
      key: "panVerificationUrl",
      title: "PAN Verification API URL", 
      description: "API endpoint for PAN card verification",
      placeholder: "https://api.example.com/verify/pan",
      helpText: "Enter the complete URL for your PAN verification API endpoint"
    },
    {
      key: "panApiKey",
      title: "PAN Verification API Key",
      description: "API key for PAN verification service", 
      placeholder: "pan_api_key...",
      helpText: "API key provided by your PAN verification service provider"
    },
    // Class 10th Marksheet API
    {
      key: "class10VerificationUrl",
      title: "Class 10th Marksheet API URL",
      description: "API endpoint for Class 10th marksheet verification",
      placeholder: "https://api.example.com/verify/class10",
      helpText: "Enter the complete URL for your Class 10th marksheet verification API"
    },
    {
      key: "class10ApiKey",
      title: "Class 10th Marksheet API Key", 
      description: "API key for Class 10th marksheet verification",
      placeholder: "class10_api_key...",
      helpText: "API key for your Class 10th marksheet verification service"
    },
    // Class 12th Marksheet API
    {
      key: "class12VerificationUrl",
      title: "Class 12th Marksheet API URL",
      description: "API endpoint for Class 12th marksheet verification", 
      placeholder: "https://api.example.com/verify/class12",
      helpText: "Enter the complete URL for your Class 12th marksheet verification API"
    },
    {
      key: "class12ApiKey", 
      title: "Class 12th Marksheet API Key",
      description: "API key for Class 12th marksheet verification",
      placeholder: "class12_api_key...",
      helpText: "API key for your Class 12th marksheet verification service"
    }
  ];

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
                <Key className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">API Settings</h1>
                <p className="text-sm text-muted-foreground">Configure your API keys and services</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Security Notice */}
        <Card className="mb-6 border-warning/50 bg-warning/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
              <div>
                <h3 className="font-medium text-warning-foreground">Security Information</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  API keys are stored locally in your browser's secure storage. They are never transmitted 
                  to our servers except when making API calls to the respective services. For production use, 
                  consider using environment variables or a secure key management service.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API Key Configuration */}
        <div className="space-y-6">
          {apiKeyConfigs.map((config) => (
            <Card key={config.key}>
              <CardHeader>
                <CardTitle className="text-lg">{config.title}</CardTitle>
                <CardDescription>{config.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={config.key}>
                    {config.key.includes('Url') ? 'API Endpoint URL' : 'API Key'}
                  </Label>
                  <div className="relative">
                    <Input
                      id={config.key}
                      type={showKeys[config.key as keyof typeof showKeys] ? "text" : "password"}
                      placeholder={config.placeholder}
                      value={apiKeys[config.key as keyof typeof apiKeys]}
                      onChange={(e) => handleKeyChange(config.key, e.target.value)}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1 h-8 w-8 p-0"
                      onClick={() => toggleShowKey(config.key)}
                    >
                      {showKeys[config.key as keyof typeof showKeys] ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">{config.helpText}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          <Button 
            onClick={saveSettings}
            variant="hero"
            size="lg"
            className="flex-1"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Settings
          </Button>
          <Button 
            onClick={clearAllKeys}
            variant="outline"
            size="lg"
            className="flex-1"
          >
            Clear All Keys
          </Button>
        </div>

        {/* Usage Instructions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>How to obtain and configure your API keys</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">1. Gemini API Key (Required for OCR)</h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• Visit Google AI Studio: https://makersuite.google.com/app/apikey</li>
                <li>• Create a new API key or use an existing one</li>
                <li>• Enable the Generative AI API in your Google Cloud Console</li>
                <li>• Paste the key above to enable advanced text extraction</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">2. Document Verification APIs</h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• <strong>Aadhar Verification:</strong> Enter your Aadhar verification API URL and key</li>
                <li>• <strong>PAN Verification:</strong> Configure separate PAN verification API endpoint</li>
                <li>• <strong>Class 10th Marksheet:</strong> Set up API for secondary school certificate verification</li>
                <li>• <strong>Class 12th Marksheet:</strong> Configure API for higher secondary certificate verification</li>
                <li>• Each document type uses its own dedicated API for accurate verification</li>
                <li>• The system automatically detects marksheet class (10th/12th) and uses appropriate API</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">3. API Response Format</h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• APIs should return JSON with: isValid, message, details[], confidence</li>
                <li>• Example: {`{"isValid": true, "message": "Document verified", "confidence": 95}`}</li>
                <li>• The system will automatically handle different response formats</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">4. Testing Without Real APIs</h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• The app includes mock verification responses for testing</li>
                <li>• OCR will work with any image upload (no API key needed for basic extraction)</li>
                <li>• Add real API keys when you're ready for production use</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Settings;