import { Body, Container, Head, Heading, Hr, Html, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface LeadNotificationProps {
  name?: string
  email?: string
  phone?: string
  website?: string
  note?: string
  submittedAt?: string
}

function LeadNotificationEmail({ name, email, phone, website, note, submittedAt }: LeadNotificationProps) {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#0b0f1a', color: '#e6ebf5', fontFamily: 'Arial, sans-serif' }}>
        <Container style={{ margin: '0 auto', padding: '32px 24px', maxWidth: 560 }}>
          <Heading style={{ color: '#e6ebf5', fontSize: 22 }}>New analysis request</Heading>
          <Text style={{ color: '#9aa7bd', fontSize: 14 }}>
            A visitor requested a free business analysis on Apex Digital Systems.
          </Text>
          <Section style={{ backgroundColor: '#121828', borderRadius: 12, padding: '20px 24px', marginTop: 16 }}>
            <Text style={{ color: '#e6ebf5', fontSize: 14, margin: '0 0 8px' }}><strong>Name:</strong> {name || '—'}</Text>
            <Text style={{ color: '#e6ebf5', fontSize: 14, margin: '0 0 8px' }}><strong>Email:</strong> {email || '—'}</Text>
            <Text style={{ color: '#7ef0c4', fontSize: 16, margin: '0 0 8px' }}><strong>Phone:</strong> {phone || '—'}</Text>
            <Text style={{ color: '#e6ebf5', fontSize: 14, margin: '0 0 8px' }}><strong>Website:</strong> {website || '—'}</Text>
            {note ? (
              <Text style={{ color: '#e6ebf5', fontSize: 14, margin: '0', whiteSpace: 'pre-wrap' }}><strong>Business details:</strong><br />{note}</Text>
            ) : null}
          </Section>
          <Hr style={{ borderColor: '#232c42', margin: '24px 0' }} />
          <Text style={{ color: '#5b6680', fontSize: 12 }}>Received {submittedAt || 'just now'} · Apex Digital Systems lead notifications</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: LeadNotificationEmail,
  subject: (d: Record<string, any>) => `New analysis request from ${d['name'] || 'a visitor'}`,
  displayName: 'Lead notification',
  to: 'owner@example.com',
  previewData: {
    name: 'Jordan Smith',
    email: 'jordan@example.com',
    phone: '(775) 555-0142',
    website: 'https://example.com',
    note: 'Interested in SEO and a redesign.',
    submittedAt: new Date().toLocaleString(),
  },
} satisfies TemplateEntry
