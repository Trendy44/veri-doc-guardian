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
    backup: ""
  });
  
  const [showKeys, setShowKeys] = useState({
    gemini: false,
    verification: false,
    backup: false
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
    setApiKeys({ gemini: "", verification: "", backup: "" });
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
    {
      key: "verification",
      title: "Document Verification API",
      description: "API key for document verification services (Aadhar, PAN, etc.)",
      placeholder: "veri_api_...",
      helpText: "Contact your verification service provider for this API key"
    },
    {
      key: "backup",
      title: "Backup Verification API",
      description: "Fallback API key for secondary verification service",
      placeholder: "backup_...",
      helpText: "Optional: Secondary API for backup verification when primary service is unavailable"
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
                  <Label htmlFor={config.key}>API Key</Label>
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
                <li>• For Indian documents: Consider APIs from vendors like NSDL, KARZA, or IDfy</li>
                <li>• Each service provides different verification capabilities</li>
                <li>• Test keys often available for development and testing</li>
                <li>• Contact the service provider for production API access</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">3. Testing Without Real APIs</h4>
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