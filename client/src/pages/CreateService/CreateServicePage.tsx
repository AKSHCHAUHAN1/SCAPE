import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../../components/layout/Layout.js';
import { ProvisioningProgress } from '../../components/feedback/ProvisioningProgress.js';
import { useTemplates } from '../../hooks/useTemplates.js';
import { useCreateService } from '../../hooks/useServices.js';
import { useServiceJobs } from '../../hooks/useServiceDetail.js';
import type { JobStatus } from '../../types/index.js';
import {
  EC2_INSTANCE_OPTIONS,
  FARGATE_MEMORY_BY_VCPU,
  getRecommendedTemplateType,
  isSupportedEc2InstanceType,
  recommendEc2InstanceType,
  type ApiRuntime,
  type ServiceUseCase,
  type WorkloadProfile,
} from '../../utils/serviceAdvisor.js';
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

export const CreateServicePage: React.FC = () => {

  const { data: templates = [], isLoading: templatesLoading } = useTemplates();
  const createServiceMutation = useCreateService();

  // Wizard state
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [serviceName, setServiceName] = useState('');
  const [region, setRegion] = useState('');
  const [environment, setEnvironment] = useState<'development' | 'staging' | 'production'>('development');
  const [computeMode, setComputeMode] = useState<'fargate' | 'ec2'>('ec2');
  const [ec2InstanceType, setEc2InstanceType] = useState('t3.small');
  const [requestedVcpu, setRequestedVcpu] = useState(0.5);
  const [requestedMemoryGiB, setRequestedMemoryGiB] = useState(1);
  const [workloadProfile, setWorkloadProfile] = useState<WorkloadProfile>('bursty');
  const [advisorEnabled, setAdvisorEnabled] = useState(false);
  const [serviceUseCase, setServiceUseCase] = useState<ServiceUseCase>('unsure');
  const [apiRuntime, setApiRuntime] = useState<ApiRuntime>('undecided');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Completed provisioning state
  const [createdServiceId, setCreatedServiceId] = useState<string | null>(null);
  const [createdJobId, setCreatedJobId] = useState<string | null>(null);
  const [previewOnly, setPreviewOnly] = useState(false);
  const [submittedStatus, setSubmittedStatus] = useState<JobStatus>('queued');
  const { data: createdJobs = [] } = useServiceJobs(createdServiceId ?? undefined);
  const activeJob = createdJobs.find((job) => job.id === createdJobId) ?? createdJobs[0];
  const provisioningStatus = activeJob?.status ?? submittedStatus;

  // Selected template object
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0];
  const recommendationType = getRecommendedTemplateType(serviceUseCase, apiRuntime);
  const recommendedTemplate = templates.find((template) => template.templateType === recommendationType);
  const recommendedInstance = recommendEc2InstanceType(
    requestedVcpu,
    requestedMemoryGiB,
    workloadProfile,
  );

  // Validation
  const isValidName = /^[a-z0-9-]+$/.test(serviceName) && serviceName.length >= 3;
  const isValidRegion = region.trim().length >= 5
    && region.trim().length <= 32
    && /^[a-z0-9]+(?:-[a-z0-9]+)+-\d+$/.test(region.trim());
  const isValidInstanceType = computeMode !== 'ec2'
    || isSupportedEc2InstanceType(ec2InstanceType.trim());

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
      if (!isValidRegion) {
        setErrorMsg('Enter an AWS region code, such as ap-south-1. SCAPE will not choose one for you.');
        return;
      }
      if (selectedTemplate?.templateType !== 'static-frontend' && !isValidInstanceType) {
        setErrorMsg('Choose an x86_64 EC2 instance type, such as t3.small or m8i.large.');
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
    setPreviewOnly(false);
    try {
      const templateId = selectedTemplateId || (templates[0]?.id as string);
      const res = await createServiceMutation.mutateAsync({
        name: serviceName,
        templateId,
        region,
        environment,
        computeMode: selectedTemplate?.templateType === 'static-frontend' ? 'fargate' : computeMode,
        ...(computeMode === 'ec2' && selectedTemplate?.templateType !== 'static-frontend'
          ? { ec2InstanceType }
          : {}),
        requestedVcpu,
        requestedMemoryGiB,
        workloadProfile,
      });

      setCreatedServiceId(res.service.id);
      setCreatedJobId(res.job.id);
      setSubmittedStatus(res.job.status);
      setCurrentStep(4);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit service creation';
      setErrorMsg(message);
    }
  };

  const handleLocalPreview = () => {
    setErrorMsg(null);
    setPreviewOnly(true);
    setCreatedServiceId(null);
    setCreatedJobId(null);
    setCurrentStep(4);
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
            Choose a service pattern, ask the advisor for a starting point, and select the AWS region and compute size yourself.
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
                Compare supported service patterns, or use the advisor and adjust its recommendation before provisioning.
              </p>
            </div>

            <section className="rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-text flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Need a recommendation?
                  </h3>
                  <p className="text-xs text-text-secondary mt-1 max-w-2xl">
                    Tell SCAPE what you are building. The advisor works locally and recommends a supported starter template; you can change it before continuing.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAdvisorEnabled((enabled) => !enabled)}
                  aria-expanded={advisorEnabled}
                  className="shrink-0 rounded-xl border border-primary/30 bg-surface px-3.5 py-2 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
                >
                  {advisorEnabled ? 'Hide advisor' : 'Help me choose'}
                </button>
              </div>

              {advisorEnabled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-primary/15 pt-4">
                  <div>
                    <label htmlFor="advisor-use-case" className="block text-xs font-semibold text-text mb-1.5">
                      What are you building?
                    </label>
                    <select
                      id="advisor-use-case"
                      value={serviceUseCase}
                      onChange={(event) => setServiceUseCase(event.target.value as ServiceUseCase)}
                      className="w-full rounded-xl border border-border bg-bg-secondary px-3 py-2.5 text-sm text-text"
                    >
                      <option value="unsure">I am not sure yet</option>
                      <option value="website">A website or frontend only</option>
                      <option value="api">An API or backend service</option>
                      <option value="container">An app I already package in Docker</option>
                    </select>
                  </div>
                  {serviceUseCase === 'api' && (
                    <div>
                      <label htmlFor="advisor-runtime" className="block text-xs font-semibold text-text mb-1.5">
                        Preferred API runtime
                      </label>
                      <select
                        id="advisor-runtime"
                        value={apiRuntime}
                        onChange={(event) => setApiRuntime(event.target.value as ApiRuntime)}
                        className="w-full rounded-xl border border-border bg-bg-secondary px-3 py-2.5 text-sm text-text"
                      >
                        <option value="undecided">Recommend a starter</option>
                        <option value="nodejs">Node.js</option>
                        <option value="python">Python / FastAPI</option>
                      </select>
                    </div>
                  )}
                  <div className="sm:col-span-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-border bg-surface p-4">
                    <div>
                      <p className="text-xs font-bold text-text">
                        {recommendedTemplate ? `Recommended: ${recommendedTemplate.name}` : 'Recommendation unavailable'}
                      </p>
                      <p className="mt-1 text-[11px] text-text-secondary">
                        {serviceUseCase === 'website'
                          ? 'A frontend without server-side logic can use static hosting.'
                          : serviceUseCase === 'container'
                            ? 'A Dockerized service can keep its current runtime and build.'
                            : serviceUseCase === 'api' && apiRuntime === 'python'
                              ? 'FastAPI is a supported Python API starter.'
                              : serviceUseCase === 'api'
                                ? 'Node.js is the default starter for an API when no runtime preference is given.'
                                : 'Since you are unsure, SCAPE starts with a Node.js API as an editable suggestion. Choose Static Frontend if you only need browser code and file hosting.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={!recommendedTemplate}
                      onClick={() => recommendedTemplate && setSelectedTemplateId(recommendedTemplate.id)}
                      className="shrink-0 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
                    >
                      Use recommendation
                    </button>
                  </div>
                </div>
              )}
            </section>

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
                    <button
                      type="button"
                      key={tpl.id}
                      onClick={() => setSelectedTemplateId(tpl.id)}
                      aria-pressed={isSelected}
                      className={`w-full p-6 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between text-left ${
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
                    </button>
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
                <label htmlFor="service-name" className="block text-xs font-semibold text-text mb-1.5">
                  Service Name <span className="text-danger">*</span>
                </label>
                <div className="relative">
                  <input
                    id="service-name"
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
                <label htmlFor="aws-region" className="block text-xs font-semibold text-text mb-1.5">
                  Deployment Target Region (AWS) <span className="text-danger">*</span>
                </label>
                <input
                  id="aws-region"
                  type="text"
                  value={region}
                  onChange={(event) => setRegion(event.target.value.trim().toLowerCase())}
                  placeholder="e.g. ap-south-1"
                  autoComplete="off"
                  aria-invalid={region.length > 0 && !isValidRegion}
                  className="w-full rounded-xl border border-border bg-bg-secondary px-3.5 py-2.5 font-mono text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary"
                />
                <p className="mt-1.5 text-[11px] text-text-muted">
                  Enter the AWS region from your account. SCAPE does not pick a region or assume one is enabled.
                </p>
              </div>

              {/* Environment */}
              <div>
                <label className="block text-xs font-semibold text-text mb-1.5">
                  Environment
                </label>
                <div className="flex items-center gap-3">
                  {(['development', 'staging', 'production'] as const).map((env) => (
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

              {selectedTemplate?.templateType !== 'static-frontend' && (
                <div className="border-t border-border pt-5 space-y-5">
                  <div>
                    <h3 className="text-sm font-bold text-text">Compute and sizing</h3>
                    <p className="mt-1 text-[11px] text-text-secondary">
                      Enter the task size and workload shape. For EC2, SCAPE suggests a matching instance type; you choose whether to use it.
                    </p>
                  </div>

                  <div>
                    <span className="block text-xs font-semibold text-text mb-2">Compute platform</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {([
                        { id: 'ec2', title: 'Amazon EC2', detail: 'Choose an instance family and type.' },
                        { id: 'fargate', title: 'AWS Fargate', detail: 'AWS manages the underlying servers.' },
                      ] as const).map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => {
                            setComputeMode(option.id);
                            if (option.id === 'fargate') {
                              const supportedCpu = Object.keys(FARGATE_MEMORY_BY_VCPU).map(Number);
                              if (!supportedCpu.includes(requestedVcpu)) {
                                setRequestedVcpu(1);
                                setRequestedMemoryGiB(2);
                              } else if (!FARGATE_MEMORY_BY_VCPU[requestedVcpu].includes(requestedMemoryGiB)) {
                                setRequestedMemoryGiB(FARGATE_MEMORY_BY_VCPU[requestedVcpu][0]);
                              }
                            }
                            if (option.id === 'ec2' && !ec2InstanceType && recommendedInstance) {
                              setEc2InstanceType(recommendedInstance.type);
                            }
                          }}
                          aria-pressed={computeMode === option.id}
                          className={`rounded-xl border p-3 text-left transition-colors ${computeMode === option.id ? 'border-primary bg-primary/10 ring-1 ring-primary/40' : 'border-border bg-bg-secondary hover:border-primary/40'}`}
                        >
                          <span className="block text-xs font-bold text-text">{option.title}</span>
                          <span className="mt-1 block text-[11px] text-text-secondary">{option.detail}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label htmlFor="requested-vcpu" className="block text-xs font-semibold text-text mb-1.5">Requested vCPU</label>
                      {computeMode === 'fargate' ? (
                        <select
                          id="requested-vcpu"
                          value={requestedVcpu}
                          onChange={(event) => {
                            const nextVcpu = Number(event.target.value);
                            setRequestedVcpu(nextVcpu);
                            const validMemory = FARGATE_MEMORY_BY_VCPU[nextVcpu];
                            if (!validMemory.includes(requestedMemoryGiB)) setRequestedMemoryGiB(validMemory[0]);
                          }}
                          className="w-full rounded-xl border border-border bg-bg-secondary px-3 py-2.5 text-sm text-text"
                        >
                          {Object.keys(FARGATE_MEMORY_BY_VCPU).map((value) => <option key={value} value={value}>{value}</option>)}
                        </select>
                      ) : (
                        <input
                          id="requested-vcpu"
                          type="number"
                          min="0.25"
                          max="192"
                          step="0.25"
                          value={requestedVcpu}
                          onChange={(event) => setRequestedVcpu(Number(event.target.value))}
                          className="w-full rounded-xl border border-border bg-bg-secondary px-3 py-2.5 text-sm text-text"
                        />
                      )}
                    </div>
                    <div>
                      <label htmlFor="requested-memory" className="block text-xs font-semibold text-text mb-1.5">Memory (GiB)</label>
                      {computeMode === 'fargate' ? (
                        <select
                          id="requested-memory"
                          value={requestedMemoryGiB}
                          onChange={(event) => setRequestedMemoryGiB(Number(event.target.value))}
                          className="w-full rounded-xl border border-border bg-bg-secondary px-3 py-2.5 text-sm text-text"
                        >
                          {FARGATE_MEMORY_BY_VCPU[requestedVcpu].map((value) => <option key={value} value={value}>{value}</option>)}
                        </select>
                      ) : (
                        <input
                          id="requested-memory"
                          type="number"
                          min="0.5"
                          max="1536"
                          step="0.5"
                          value={requestedMemoryGiB}
                          onChange={(event) => setRequestedMemoryGiB(Number(event.target.value))}
                          className="w-full rounded-xl border border-border bg-bg-secondary px-3 py-2.5 text-sm text-text"
                        />
                      )}
                    </div>
                    <div>
                      <label htmlFor="workload-profile" className="block text-xs font-semibold text-text mb-1.5">Workload pattern</label>
                      <select
                        id="workload-profile"
                        value={workloadProfile}
                        onChange={(event) => setWorkloadProfile(event.target.value as WorkloadProfile)}
                        className="w-full rounded-xl border border-border bg-bg-secondary px-3 py-2.5 text-sm text-text"
                      >
                        <option value="bursty">Bursty / demo</option>
                        <option value="balanced">General purpose</option>
                        <option value="compute">CPU intensive</option>
                        <option value="memory">Memory intensive</option>
                      </select>
                    </div>
                  </div>

                  {computeMode === 'ec2' && (
                    <div className="rounded-xl border border-border bg-bg-secondary/70 p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div>
                          <label htmlFor="ec2-instance-type" className="block text-xs font-semibold text-text mb-1.5">
                            EC2 instance type <span className="text-danger">*</span>
                          </label>
                          <p className="text-[11px] text-text-secondary">
                            Select a suggestion or type another x86_64 AWS instance type.
                          </p>
                        </div>
                        {recommendedInstance && (
                          <button
                            type="button"
                            onClick={() => setEc2InstanceType(recommendedInstance.type)}
                            className="rounded-lg border border-primary/30 px-3 py-1.5 text-[11px] font-semibold text-primary hover:bg-primary/10"
                          >
                            Use recommendation: {recommendedInstance.type}
                          </button>
                        )}
                      </div>
                      <input
                        id="ec2-instance-type"
                        type="text"
                        list="ec2-instance-options"
                        value={ec2InstanceType}
                        onChange={(event) => setEc2InstanceType(event.target.value.trim().toLowerCase())}
                        placeholder={recommendedInstance?.type ?? 'e.g. m8i.large'}
                        aria-invalid={ec2InstanceType.length > 0 && !isValidInstanceType}
                        className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 font-mono text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary"
                      />
                      <datalist id="ec2-instance-options">
                        {EC2_INSTANCE_OPTIONS.map((option) => (
                          <option key={option.type} value={option.type}>
                            {option.vcpu} vCPU · {option.memoryGiB} GiB · {option.useCase}
                          </option>
                        ))}
                      </datalist>
                      <p className="text-[11px] text-text-muted">
                        Suggestions are a starter catalog, not a live availability or price check. Use an x86_64 type with enough capacity for the requested task plus host overhead. AWS checks custom types in your selected account and region during provisioning.
                      </p>
                    </div>
                  )}
                </div>
              )}
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
                {selectedTemplate?.templateType !== 'static-frontend' && (
                  <>
                    <div className="p-3.5 rounded-xl bg-bg-secondary border border-border/60">
                      <span className="text-[11px] text-text-muted block mb-1">Compute platform</span>
                      <span className="text-sm font-semibold text-text">{computeMode === 'ec2' ? `EC2 · ${ec2InstanceType || 'type required'}` : 'AWS Fargate'}</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-bg-secondary border border-border/60">
                      <span className="text-[11px] text-text-muted block mb-1">Requested task size</span>
                      <span className="text-sm font-semibold text-text">{requestedVcpu} vCPU · {requestedMemoryGiB} GiB RAM</span>
                    </div>
                  </>
                )}
              </div>

              {/* IAM Least-Privilege & State Security */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-text flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-secondary" />
                  <span>Security & Provisioning Policies</span>
                </h4>
                <div className="p-3.5 rounded-xl bg-bg-secondary/40 border border-border/60 text-xs text-text-secondary space-y-1.5 leading-relaxed">
                  <p>• The AWS account and region are selected explicitly before provisioning.</p>
                  <p>• GitHub Actions workflows are generated for the selected service template.</p>
                  <p>• If AWS or GitHub is not connected yet, use this page to preview the architecture; provisioning requires those integrations.</p>
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
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2">
                <button
                  type="button"
                  onClick={handleLocalPreview}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-border bg-surface hover:bg-bg-secondary text-text-secondary text-xs font-semibold rounded-xl transition-colors"
                >
                  Preview locally
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={createServiceMutation.isPending}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-primary to-primary-hover hover:shadow-lg hover:shadow-primary/30 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  <Zap className="w-4 h-4" />
                  <span>{createServiceMutation.isPending ? 'Sending Request...' : 'Request AWS Provisioning'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 4: LIVE PROVISIONING ================= */}
        {currentStep === 4 && (
          previewOnly ? (
            <section className="space-y-6">
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 sm:p-8">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-primary/10 p-2.5 text-primary"><Sparkles className="h-5 w-5" /></div>
                  <div>
                    <h2 className="text-xl font-extrabold text-text">Local architecture preview</h2>
                    <p className="mt-1 max-w-2xl text-sm text-text-secondary">
                      This preview was generated in your browser. It did not create a GitHub repository or AWS resources.
                    </p>
                  </div>
                </div>
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-border bg-surface p-4"><span className="text-[11px] text-text-muted">Service</span><p className="mt-1 font-mono text-sm font-bold text-text">{serviceName}</p></div>
                  <div className="rounded-xl border border-border bg-surface p-4"><span className="text-[11px] text-text-muted">Selected template</span><p className="mt-1 text-sm font-bold text-text">{selectedTemplate?.name}</p></div>
                  <div className="rounded-xl border border-border bg-surface p-4"><span className="text-[11px] text-text-muted">AWS region</span><p className="mt-1 font-mono text-sm font-bold text-text">{region}</p></div>
                  {selectedTemplate?.templateType !== 'static-frontend' && (
                    <>
                      <div className="rounded-xl border border-border bg-surface p-4"><span className="text-[11px] text-text-muted">Compute</span><p className="mt-1 text-sm font-bold text-text">{computeMode === 'ec2' ? `EC2 · ${ec2InstanceType}` : 'AWS Fargate'}</p></div>
                      <div className="rounded-xl border border-border bg-surface p-4"><span className="text-[11px] text-text-muted">Requested capacity</span><p className="mt-1 text-sm font-bold text-text">{requestedVcpu} vCPU · {requestedMemoryGiB} GiB</p></div>
                      <div className="rounded-xl border border-border bg-surface p-4"><span className="text-[11px] text-text-muted">Workload profile</span><p className="mt-1 text-sm font-bold capitalize text-text">{workloadProfile}</p></div>
                    </>
                  )}
                </div>
                <div className="mt-5 flex flex-col-reverse sm:flex-row justify-between gap-3">
                  <button type="button" onClick={() => setCurrentStep(2)} className="rounded-xl border border-border bg-surface px-4 py-2.5 text-xs font-semibold text-text-secondary hover:bg-bg-secondary">Edit configuration</button>
                  <button type="button" onClick={() => { setPreviewOnly(false); setCurrentStep(1); }} className="rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-white hover:bg-primary-hover">Start another preview</button>
                </div>
              </div>
            </section>
          ) : (
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
              startedAt={activeJob?.startedAt}
              completedAt={activeJob?.completedAt}
              errorMessage={activeJob?.errorMessage}
              logs={activeJob?.terraformLogs}
            />
          </div>
          )
        )}
      </div>
    </Layout>
  );
};
