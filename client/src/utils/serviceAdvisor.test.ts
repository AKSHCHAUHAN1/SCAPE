import { describe, expect, it } from 'vitest';
import { getRecommendedTemplateType, isSupportedEc2InstanceType, recommendEc2InstanceType } from './serviceAdvisor.js';

describe('service advisor', () => {
  it('recommends a small demo EC2 type for the default bursty workload', () => {
    expect(recommendEc2InstanceType(0.5, 1, 'bursty')?.type).toBe('t3.small');
  });

  it('uses workload shape and requested capacity to recommend a host', () => {
    expect(recommendEc2InstanceType(1, 2, 'compute')?.type).toBe('c7i.large');
    expect(recommendEc2InstanceType(1, 8, 'memory')?.type).toBe('r7i.large');
    expect(recommendEc2InstanceType(16, 64, 'bursty')).toBeNull();
  });

  it('accepts x86 instance names and rejects unsupported Graviton families', () => {
    expect(isSupportedEc2InstanceType('t3.small')).toBe(true);
    expect(isSupportedEc2InstanceType('m7g.large')).toBe(false);
    expect(isSupportedEc2InstanceType('invalid')).toBe(false);
  });

  it('recommends a starter template from the selected use case and runtime', () => {
    expect(getRecommendedTemplateType('website', 'undecided')).toBe('static-frontend');
    expect(getRecommendedTemplateType('api', 'python')).toBe('python-api');
    expect(getRecommendedTemplateType('api', 'undecided')).toBe('nodejs-api');
    expect(getRecommendedTemplateType('container', 'nodejs')).toBe('container-api');
    expect(getRecommendedTemplateType('unsure', 'undecided')).toBe('nodejs-api');
  });
});
