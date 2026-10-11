import type { ComponentType } from 'react'
import { template as leadNotificationTemplate } from './lead-notification'
import { template as teamInviteCodeTemplate } from './team-invite-code'
import { template as buildOrderTemplate } from './build-order'
import { template as teamAlertTemplate } from './team-alert'
import { template as billingLinkTemplate } from './billing-link'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 *
 * Example:
 *   import { template as welcomeTemplate } from './welcome'
 *   // then add to TEMPLATES: 'welcome': welcomeTemplate
 */
export const TEMPLATES: Record<string, TemplateEntry> = {
  'lead-notification': leadNotificationTemplate,
  'team-invite-code': teamInviteCodeTemplate,
  'build-order': buildOrderTemplate,
  'team-alert': teamAlertTemplate,
  'billing-link': billingLinkTemplate,
}
