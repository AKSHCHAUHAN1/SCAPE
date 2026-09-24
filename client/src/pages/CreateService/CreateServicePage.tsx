import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../../components/layout/Layout.js';
import { ProvisioningProgress } from '../../components/feedback/ProvisioningProgress.js';
import { useTemplates } from '../../hooks/useTemplates.js';
import { useCreateService } from '../../hooks/useServices.js';
import type { JobStatus } from '../../types/index.js';
import {
  Sparkles,
  Server,
  Globe,
  Check,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  Shield,
  Zap,
  Info,
} from 'lucide-react';

const REGIONS = [
  { id: 'us-east-1', name: 'US East (N. Virginia)', latency: '~25ms' },
  { id: 'us-west-2', name: 'US West (Oregon)', latency: '~55ms' },
  { id: 'eu-west-1', name: 'Europe (Ireland)', latency: '~85ms' },
  { id: 'ap-southeast-1', name: 'Asia Pacific (Singapore)', latency: '~140ms' },
];

export const CreateServicePage: React.FC = () => {

  const { data: templates = [], isLoading: templatesLoading } = useTemplates();
  const createServiceMutation = useCreateService();

  // Wizard state
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [serviceName, setServiceName] = useState('');
  const [region, setRegion] = useState('us-east-1');
  const [environment, setEnvironment] = useState('staging');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Completed provisioning state
  const [createdServiceId, setCreatedServiceId] = useState<string | null>(null);
  const [provisioningStatus, setProvisioningStatus] = useState<JobStatus>('running');

  // Selected template object
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0];

  // Validation
  const isValidName = /^[a-z0-9-]+$/.test(serviceName) && serviceName.length >= 3;

  const handleNext = () => {
    setErrorMsg(null);
    if (currentStep === 1) {
      if (!selectedTemplateId && templates.length > 0) {
        setSelectedTemplateId(templates[0].id);
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!isValidName) {
        setErrorMsg('Service name must be lowercase alphanumeric with hyphens (min 3 chars).');
        return;
      }
      setCurrentStep(3);
    }
  };

  const handleBack = () => {
    setErrorMsg(null);
    if (currentStep === 2) setCurrentStep(1);
    if (currentStep === 3) setCurrentStep(2);
  };

  const handleSubmit = async () => {
    setErrorMsg(null);
    try {
      const templateId = selectedTemplateId || (templates[0]?.id as string);
      const res = await createServiceMutation.mutateAsync({
        name: serviceName,
        templateId,
        region,
      });

      setCreatedServiceId(res.service.id);
      setProvisioningStatus('running');
      setCurrentStep(4);

      // Simulate completion progression for realistic demo flow
      setTimeout(() => {
        setProvisioningStatus('succeeded');
      }, 7000);
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Failed to submit service creation';
      setErrorMsg(message);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8 pb-12">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Self-Service Provisioning Wizard</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-text">Create New Cloud Service</h1>
          <p className="text-sm text-text-secondary mt-1">
            Specify your architectural template, region, and metadata to provision infrastructure in under 5 minutes.
          </p>
        </div>

        {/* Wizard Stepper (Only when steps 1-3) */}
        {currentStep < 4 && (
          <div className="flex items-center justify-between p-4 rounded-2xl bg-surface border border-border">
            {[
              { num: 1, title: 'Select Template' },
              { num: 2, title: 'Configuration' },
              { num: 3, title: 'Review & Deploy' },
            ].map((st, idx) => (
              <React.Fragment key={st.num}>
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs transition-colors ${
                      currentStep === st.num
                        ? 'bg-primary text-white shadow-md shadow-primary/30 ring-2 ring-primary/40'
                        : currentStep > st.num
                        ? 'bg-emerald-500 text-white'
                        : 'bg-bg-secondary text-text-muted border border-border'
                    }`}
                  >
                    {currentStep > st.num ? <Check className="w-4 h-4" /> : st.num}
                  </div>
                  <div className="hidden sm:block">
                    <p
                      className={`text-xs font-semibold ${
                        currentStep === st.num ? 'text-text' : 'text-text-muted'
                      }`}
                    >
                      {st.title}
                    </p>
                  </div>
                </div>

                {idx < 2 && <div className="flex-1 mx-4 h-[1px] bg-border hidden sm:block" />}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Error notification */}
        {errorMsg && (
          <div className="p-4 rounded-xl bg-danger/10 border border-danger/30 text-xs text-danger flex items-center gap-3">
            <Info className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ================= STEP 1: SELECT TEMPLATE ================= */}
        {currentStep === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-text">Choose Infrastructure Template</h2>
              <p className="text-xs text-text-secondary mt-0.5">
                Each verified template includes production-ready Terraform modules, IAM roles, and CI/CD workflows.
              </p>
            </div>

            {templatesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="h-48 rounded-2xl bg-surface border border-border animate-pulse" />
                <div className="h-48 rounded-2xl bg-surface border border-border animate-pulse" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {templates.map((tpl) => {
                  const isSelected = (selectedTemplateId || templates[0]?.id) === tpl.id;
                  const isNodeApi = tpl.name.toLowerCase().includes('api') || tpl.name.toLowerCase().includes('node');

                  return (
                    <div
                      key={tpl.id}
                      onClick={() => setSelectedTemplateId(tpl.id)}
                      className={`p-6 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                        isSelected
                          ? 'border-primary bg-primary/5 shadow-xl shadow-primary/10 ring-1 ring-primary/40'
                          : 'border-border bg-surface hover:border-border/80 hover:bg-surface/80'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white shadow-sm">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      )}

                      <div>
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-primary/20 to-secondary/20 border border-primary/20 flex items-center justify-center text-primary mb-4">
                          {isNodeApi ? <Server className="w-6 h-6" /> : <Globe className="w-6 h-6" />}
                        </div>

                        <div className="flex items-center gap-2 mb-1.5">
                          <h3 className="font-bold text-base text-text">{tpl.name}</h3>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-bg-secondary text-text-secondary border border-border uppercase">
                            {tpl.cloudProvider}
                          </span>
                        </div>

                        <p className="text-xs text-text-secondary leading-relaxed mb-4">
                          {tpl.description}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">
                          Resources Provisioned:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {tpl.resourceTypes.map((res) => (
                            <span
                              key={res}
                              className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-bg-secondary text-text-secondary border border-border"
                            >
                              {res}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end pt-4">
              <button
                onClick={handleNext}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-xl shadow-md transition-all cursor-pointer"
              >
                <span>Continue to Configuration</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 2: CONFIGURATION ================= */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-text">Service Configuration</h2>
              <p className="text-xs text-text-secondary mt-0.5">
                Set identifier naming, target cloud region, and deployment environment.
              </p>
            </div>

            <div className="bg-surface border border-border rounded-2xl p-6 space-y-5">
              {/* Service Name */}
              <div>
                <label className="block text-xs font-semibold text-text mb-1.5">
                  Service Name <span className="text-danger">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={serviceName}
                    onChange={(e) => setServiceName(e.target.value.toLowerCase())}
                    placeholder="e.g. auth-api, billing-worker, static-portal"
                    className="w-full px-3.5 py-2.5 bg-bg-secondary border border-border rounded-xl text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors font-mono"
                  />
                </div>
                <p className="text-[11px] text-text-muted mt-1.5 flex items-center gap-1">
                  <span>Lowercase alphanumeric characters and hyphens only (e.g.</span>
                  <code className="text-primary bg-primary/10 px-1 rounded">order-service</code>
                  <span>)</span>
                </p>
              </div>

              {/* AWS Target Region */}
              <div>
                <label className="block text-xs font-semibold text-text mb-1.5">
                  Deployment Target Region (AWS) <span className="text-danger">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {REGIONS.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRegion(r.id)}
                      className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        region === r.id
                          ? 'border-primary bg-primary/10 ring-1 ring-primary/40'
                          : 'border-border bg-bg-secondary hover:bg-bg-secondary/80'
                      }`}
                    >
                      <div>
                        <p className="text-xs font-bold text-text">{r.name}</p>
                        <p className="text-[11px] font-mono text-text-muted">{r.id}</p>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        {r.latency}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Environment */}
              <div>
                <label className="block text-xs font-semibold text-text mb-1.5">
                  Environment
                </label>
                <div className="flex items-center gap-3">
                  {['staging', 'development', 'production'].map((env) => (
                    <button
                      key={env}
                      type="button"
                      onClick={() => setEnvironment(env)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-medium capitalize border transition-all cursor-pointer ${
                        environment === env
                          ? 'border-secondary bg-secondary/15 text-secondary font-semibold'
                          : 'border-border bg-bg-secondary text-text-muted hover:text-text'
                      }`}
                    >
                      {env}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                onClick={handleBack}
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-border text-xs font-semibold rounded-xl hover:bg-bg-secondary transition-colors cursor-pointer text-text-secondary"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                onClick={handleNext}
                disabled={!isValidName}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-md transition-all cursor-pointer"
              >
                <span>Review & Confirm</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 3: REVIEW & CONFIRM ================= */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-text">Review Deployment Architecture</h2>
              <p className="text-xs text-text-secondary mt-0.5">
                Confirm service attributes before launching the Terraform provisioning queue.
              </p>
            </div>

            <div className="bg-surface border border-border rounded-2xl p-6 space-y-6">
              {/* Summary Spec Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-6 border-b border-border/80">
                <div className="p-3.5 rounded-xl bg-bg-secondary border border-border/60">
                  <span className="text-[11px] text-text-muted block mb-1">Service Name</span>
                  <span className="text-sm font-mono font-bold text-text">{serviceName}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-bg-secondary border border-border/60">
                  <span className="text-[11px] text-text-muted block mb-1">Template Architecture</span>
                  <span className="text-sm font-semibold text-text">{selectedTemplate?.name}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-bg-secondary border border-border/60">
                  <span className="text-[11px] text-text-muted block mb-1">AWS Region</span>
                  <span className="text-sm font-mono text-secondary font-semibold">{region}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-bg-secondary border border-border/60">
                  <span className="text-[11px] text-text-muted block mb-1">Target Environment</span>
                  <span className="text-sm font-semibold text-emerald-400 capitalize">{environment}</span>
                </div>
              </div>

              {/* IAM Least-Privilege & State Security */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-text flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-secondary" />
                  <span>Security & Provisioning Policies</span>
                </h4>
                <div className="p-3.5 rounded-xl bg-bg-secondary/40 border border-border/60 text-xs text-text-secondary space-y-1.5 leading-relaxed">
                  <p>• Isolated S3 remote state backend with DynamoDB locking prevents concurrency race conditions.</p>
                  <p>• Temporary scoped IAM STS credentials assumed exclusively during provisioning execution.</p>
                  <p>• Automated GitHub Actions CI/CD pipeline definition committed on provisioning success.</p>
                  <p>• Automatic compensation rollback initiated if any terraform step encounters failure.</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                onClick={handleBack}
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-border text-xs font-semibold rounded-xl hover:bg-bg-secondary transition-colors cursor-pointer text-text-secondary"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                onClick={handleSubmit}
                disabled={createServiceMutation.isPending}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-primary to-primary-hover hover:shadow-lg hover:shadow-primary/30 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                <Zap className="w-4 h-4" />
                <span>{createServiceMutation.isPending ? 'Initiating Pipeline...' : 'Deploy Service Now'}</span>
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 4: LIVE PROVISIONING ================= */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-extrabold text-text">Service Provisioning in Progress</h2>
                <p className="text-xs text-text-secondary mt-0.5">
                  Terraform execution engine is allocating AWS infrastructure and synthesizing CI/CD workflows.
                </p>
              </div>

              {createdServiceId && (
                <Link
                  to={`/services/${createdServiceId}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
                >
                  <span>Go to Service Details</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>

            <ProvisioningProgress
              status={provisioningStatus}
              serviceName={serviceName}
              errorMessage={errorMsg}
            />
          </div>
        )}
      </div>
    </Layout>
  );
};
