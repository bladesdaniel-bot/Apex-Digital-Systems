import { Body, Button, Container, Head, Heading, Html, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

const row = { color: '#e6ebf5', fontSize: 14, margin: '0 0 8px' }

// One owner-alert layout for team activity: new sign-ups and booked appointments.
type D = { title?: string; intro?: string; lines?: { label: string; value: string }[]; link?: string; linkLabel?: string }
function TeamAlertEmail(d: D) {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#0b0f1a', color: '#e6ebf5', fontFamily: 'Arial, sans-serif' }}>
        <Container style={{ margin: '0 auto', padding: '32px 24px', maxWidth: 560 }}>
          <Heading style={{ color: '#e6ebf5', fontSize: 22 }}>{d.title || 'Team update'}</Heading>
          {d.intro ? <Text style={{ color: '#9aa7bd', fontSize: 14 }}>{d.intro}</Text> : null}
          <Section style={{ backgroundColor: '#121828', borderRadius: 12, padding: '20px 24px', marginTop: 16 }}>
            {(d.lines ?? []).filter(l => l.value).map(l => <Text key={l.label} style={row}><strong>{l.label}:</strong> {l.value}</Text>)}
          </Section>
          {d.link ? <Button href={d.link} style={{ marginTop: 20, backgroundColor: '#3b82f6', color: '#fff', padding: '12px 20px', borderRadius: 8 }}>{d.linkLabel || 'Open team portal'}</Button> : null}
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: TeamAlertEmail,
  subject: (d: Record<string, any>) => d['title'] || 'Team update',
  displayName: 'Team activity alert',
  to: 'owner@example.com',
  previewData: { title: 'Appointment booked: Reno Plumbing Co', intro: 'A caller booked a meeting.', lines: [{ label: 'Sales rep', value: 'Alex (APX-1002)' }, { label: 'Appointment', value: 'Oct 12, 2026, 10:00 AM PT' }] },
} satisfies TemplateEntry
