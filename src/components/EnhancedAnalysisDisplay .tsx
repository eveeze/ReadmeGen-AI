import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Code2,
  Zap,
  TestTube,
  Rocket,
  Globe,
  Settings,
  GitBranch,
  Users,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Play,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Award,
} from "lucide-react";

interface EnhancedAnalysisDisplayProps {
  analysisData?: {
    repository: {
      name: string;
      description: string;
      language: string;
      topics: string[];
    };
    features: {
      cicd?: {
        platform: string;
        hasAutomatedTesting: boolean;
        hasAutomatedDeployment: boolean;
        workflows: number;
      };
      testing?: {
        framework: string;
        hasUnitTests: boolean;
        hasE2ETests: boolean;
        hasCoverage: boolean;
        testCommands: number;
      };
      deployment?: {
        platform: string;
        requiresEnvVars: boolean;
        hasBuildProcess: boolean;
      };
      api: {
        endpointCount: number;
        methods: string[];
      };
      environment: {
        variableCount: number;
        requiredVars: number;
      };
      codeQuality: {
        analyzedFiles: number;
        totalComplexity: number;
        detectedFeatures: string[];
      };
      contribution: {
        hasGuide: boolean;
        hasCodeOfConduct: boolean;
        suggestedSteps: number;
      };
    };
    metadata: {
      generatedAt: string;
      analysisVersion: string;
      featuresDetected: string[];
    };
  } | null;
  projectLogo?: string;
  isLoading?: boolean;
}

export default function EnhancedAnalysisDisplay({
  analysisData,
  projectLogo,
  isLoading = false,
}: EnhancedAnalysisDisplayProps) {
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    cicd: false,
    testing: false,
    deployment: false,
    api: false,
    codeQuality: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const getComplexityColor = (complexity: number) => {
    if (complexity <= 10) return "text-green-600 bg-green-50";
    if (complexity <= 25) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  const getComplexityLabel = (complexity: number) => {
    if (complexity <= 10) return "Low";
    if (complexity <= 25) return "Medium";
    return "High";
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="p-6">
              <div className="h-4 bg-gray-200 rounded mb-4"></div>
              <div className="h-8 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded"></div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!analysisData) {
    return (
      <Card className="p-8 text-center">
        <div className="text-gray-500">
          Generate a README to see enhanced analysis features
        </div>
      </Card>
    );
  }

  const { repository, features, metadata } = analysisData;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header with Project Info and Logo */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-none">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-6">
            {projectLogo && (
              <div className="flex-shrink-0">
                <div
                  className="w-16 h-16 rounded-lg shadow-lg border-2 border-white"
                  dangerouslySetInnerHTML={{ __html: projectLogo }}
                />
              </div>
            )}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {repository.name}
              </h2>
              <p className="text-gray-600 mb-3 max-w-2xl">
                {repository.description || "No description provided"}
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge
                  variant="secondary"
                  className="bg-blue-100 text-blue-800"
                >
                  {repository.language}
                </Badge>
                {repository.topics.slice(0, 3).map((topic) => (
                  <Badge key={topic} variant="outline" className="text-xs">
                    {topic}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500 mb-2">
              Analysis v{metadata.analysisVersion}
            </div>
            <div className="text-xs text-gray-400">
              {new Date(metadata.generatedAt).toLocaleString()}
            </div>
          </div>
        </div>
      </Card>

      {/* Feature Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* CI/CD Card */}
        {features.cicd && (
          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => toggleSection("cicd")}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <GitBranch className="w-5 h-5 text-green-600" />
                  </div>
                  <CardTitle className="text-lg">CI/CD Pipeline</CardTitle>
                </div>
                {expandedSections.cicd ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {features.cicd.platform}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {features.cicd.workflows} workflow
                    {features.cicd.workflows !== 1 ? "s" : ""}
                  </Badge>
                </div>
                {expandedSections.cicd && (
                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex items-center space-x-2">
                      {features.cicd.hasAutomatedTesting ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                      <span className="text-xs">Automated Testing</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {features.cicd.hasAutomatedDeployment ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                      <span className="text-xs">Automated Deployment</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Testing Card */}
        {features.testing && (
          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => toggleSection("testing")}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <TestTube className="w-5 h-5 text-blue-600" />
                  </div>
                  <CardTitle className="text-lg">Testing</CardTitle>
                </div>
                {expandedSections.testing ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {features.testing.framework}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {features.testing.testCommands} command
                    {features.testing.testCommands !== 1 ? "s" : ""}
                  </Badge>
                </div>
                {expandedSections.testing && (
                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex items-center space-x-2">
                      {features.testing.hasUnitTests ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                      <span className="text-xs">Unit Tests</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {features.testing.hasE2ETests ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                      <span className="text-xs">E2E Tests</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {features.testing.hasCoverage ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                      <span className="text-xs">Coverage Reports</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Deployment Card */}
        {features.deployment && (
          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => toggleSection("deployment")}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Rocket className="w-5 h-5 text-purple-600" />
                  </div>
                  <CardTitle className="text-lg">Deployment</CardTitle>
                </div>
                {expandedSections.deployment ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium capitalize">
                    {features.deployment.platform}
                  </span>
                  <Badge
                    variant={
                      features.deployment.platform === "vercel"
                        ? "default"
                        : "secondary"
                    }
                    className="text-xs"
                  >
                    Ready
                  </Badge>
                </div>
                {expandedSections.deployment && (
                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex items-center space-x-2">
                      {features.deployment.hasBuildProcess ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-yellow-600" />
                      )}
                      <span className="text-xs">Build Process</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {features.deployment.requiresEnvVars ? (
                        <AlertCircle className="w-4 h-4 text-yellow-600" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      )}
                      <span className="text-xs">
                        {features.deployment.requiresEnvVars
                          ? "Env Vars Required"
                          : "No Env Setup"}
                      </span>
                    </div>
                    {features.deployment.platform === "vercel" && (
                      <button className="mt-2 flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800">
                        <ExternalLink className="w-3 h-3" />
                        <span>Deploy Now</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* API Endpoints Card */}
        <Card
          className="hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => toggleSection("api")}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Globe className="w-5 h-5 text-orange-600" />
                </div>
                <CardTitle className="text-lg">API</CardTitle>
              </div>
              {expandedSections.api ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {features.api.endpointCount} endpoint
                  {features.api.endpointCount !== 1 ? "s" : ""}
                </span>
                {features.api.endpointCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    REST API
                  </Badge>
                )}
              </div>
              {expandedSections.api && features.api.methods.length > 0 && (
                <div className="pt-2 border-t">
                  <div className="text-xs text-gray-600 mb-2">
                    HTTP Methods:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {features.api.methods.map((method) => (
                      <Badge
                        key={method}
                        variant="outline"
                        className="text-xs px-2 py-0"
                      >
                        {method}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Code Quality & Environment Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Code Quality Analysis */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Code2 className="w-5 h-5 text-indigo-600" />
              </div>
              <CardTitle>Code Analysis</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Files Analyzed</span>
              <Badge variant="secondary">
                {features.codeQuality.analyzedFiles}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Complexity</span>
              <Badge
                className={`${getComplexityColor(
                  features.codeQuality.totalComplexity
                )} border-0`}
              >
                {getComplexityLabel(features.codeQuality.totalComplexity)}
              </Badge>
            </div>

            {features.codeQuality.detectedFeatures.length > 0 && (
              <div>
                <div className="text-sm font-medium mb-2">
                  Detected Features
                </div>
                <div className="flex flex-wrap gap-2">
                  {features.codeQuality.detectedFeatures
                    .slice(0, 6)
                    .map((feature) => (
                      <Badge
                        key={feature}
                        variant="outline"
                        className="text-xs"
                      >
                        {feature}
                      </Badge>
                    ))}
                  {features.codeQuality.detectedFeatures.length > 6 && (
                    <Badge variant="outline" className="text-xs text-gray-500">
                      +{features.codeQuality.detectedFeatures.length - 6} more
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Environment & Configuration */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-teal-100 rounded-lg">
                <Settings className="w-5 h-5 text-teal-600" />
              </div>
              <CardTitle>Configuration</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Environment Variables</span>
              <Badge variant="secondary">
                {features.environment.variableCount}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Required Variables</span>
              <Badge
                variant={
                  features.environment.requiredVars > 0
                    ? "destructive"
                    : "secondary"
                }
                className="text-xs"
              >
                {features.environment.requiredVars}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Contribution Guide</span>
              {features.contribution.hasGuide ? (
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-red-600" />
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Code of Conduct</span>
              {features.contribution.hasCodeOfConduct ? (
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-red-600" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            <span>Quick Actions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {features.testing && (
              <button className="flex items-center justify-center space-x-2 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <Play className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium">Run Tests</span>
              </button>
            )}

            {features.deployment && (
              <button className="flex items-center justify-center space-x-2 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <Rocket className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium">Deploy Project</span>
              </button>
            )}

            <button className="flex items-center justify-center space-x-2 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
              <Users className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium">View Contributors</span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Features Summary Badge */}
      <div className="flex flex-wrap justify-center gap-2">
        {metadata.featuresDetected.map((feature) => (
          <Badge key={feature} variant="outline" className="text-xs">
            <Award className="w-3 h-3 mr-1" />
            {feature}
          </Badge>
        ))}
      </div>
    </div>
  );
}
