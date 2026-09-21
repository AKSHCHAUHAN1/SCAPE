import { query } from '../../database/index.js';
import { AppError } from '../../middleware/errorHandler.js';

interface TemplateRow {
  id: string;
  name: string;
  description: string | null;
  cloud_provider: string;
  resource_types: string[];
  terraform_module_path: string;
  cicd_template_path: string;
  is_active: boolean;
  created_at: Date;
}

/**
 * Get all active service templates.
 */
export async function getAllTemplates() {
  const result = await query<TemplateRow>(
    `SELECT id, name, description, cloud_provider, resource_types,
            terraform_module_path, cicd_template_path, is_active, created_at
     FROM service_templates
     WHERE is_active = true
     ORDER BY name`,
  );

  return result.rows.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    cloudProvider: t.cloud_provider,
    resourceTypes: t.resource_types,
    terraformModulePath: t.terraform_module_path,
    cicdTemplatePath: t.cicd_template_path,
    isActive: t.is_active,
    createdAt: t.created_at,
  }));
}

/**
 * Get a template by ID.
 */
export async function getTemplateById(templateId: string) {
  const result = await query<TemplateRow>(
    `SELECT id, name, description, cloud_provider, resource_types,
            terraform_module_path, cicd_template_path, is_active, created_at
     FROM service_templates
     WHERE id = $1`,
    [templateId],
  );

  if (!result.rowCount || result.rowCount === 0) {
    throw new AppError(404, 'TEMPLATE_NOT_FOUND', 'Service template not found');
  }

  const t = result.rows[0];
  return {
    id: t.id,
    name: t.name,
    description: t.description,
    cloudProvider: t.cloud_provider,
    resourceTypes: t.resource_types,
    terraformModulePath: t.terraform_module_path,
    cicdTemplatePath: t.cicd_template_path,
    isActive: t.is_active,
    createdAt: t.created_at,
  };
}
