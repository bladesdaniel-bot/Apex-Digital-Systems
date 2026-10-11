import { Body, Button, Container, Head, Heading, Html, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

function BillingLinkEmail({ link }: { link?: string }) {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#ffffff', color: '#111827', fontFamily: 'Arial, sans-serif' }}>
        <Container style={{ margin: '0 auto', padding: '32px 24px', maxWidth: 560 }}>
          <Heading style={{ fontSize: 22 }}>Manage your billing</Heading>
          <Text style={{ fontSize: 14, lineHeight: '22px' }}>Use the button below to update your card, download invoices or manage your plan with Apex Digital Systems. The link works for one hour.</Text>
          {link ? <Button href={link} style={{ marginTop: 12, backgroundColor: '#3b82f6', color: '#fff', padding: '12px 20px', borderRadius: 8 }}>Open my billing</Button> : null}
          <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 24 }}>If you didn't ask for this, you can ignore this email.</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: BillingLinkEmail,
  subject: 'Your Apex Digital Systems billing link',
  displayName: 'Customer billing link',
  previewData: { link: 'https://apexdigitalsystems.org/billing?token=example' },
} satisfies TemplateEntry
