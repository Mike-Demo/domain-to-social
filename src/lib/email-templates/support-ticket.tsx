import * as React from 'react'
import { Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { BrandLayout, text } from './brand'
import { SUPPORT_EMAIL } from '@/lib/support'

interface Props {
  ticketId?: string
  category?: string
  subject?: string
  message?: string
  fromEmail?: string
  userId?: string
  plan?: string
}

const label = { ...text, margin: '0 0 4px', fontWeight: 'bold' as const }

const SupportTicketEmail = ({ ticketId = '—', category = 'General help', subject = '(no subject)', message = '', fromEmail = 'unknown', userId = 'unknown', plan = 'free' }: Props) => (
  <BrandLayout preview={`[${category}] ${subject}`} title={`Ticket ${ticketId}`} footerNote="Sent from the support form on magicmanta.com. Reply to the customer at the address above.">
    <Text style={label}>From</Text>
    <Text style={text}>{fromEmail} · plan: {plan} · user: {userId}</Text>
    <Text style={label}>Category</Text>
    <Text style={text}>{category}</Text>
    <Text style={label}>Subject</Text>
    <Text style={text}>{subject}</Text>
    <Text style={label}>Message</Text>
    <Text style={{ ...text, whiteSpace: 'pre-wrap' as const }}>{message}</Text>
  </BrandLayout>
)

export const template = {
  component: SupportTicketEmail,
  subject: (d: Record<string, any>) => `[Support ${d['ticketId'] ?? ''}] ${d['category'] ?? ''}: ${d['subject'] ?? ''}`,
  displayName: 'Support ticket (to team)',
  to: SUPPORT_EMAIL,
  previewData: { ticketId: 'MM-7Q2K9', category: 'Bug report', subject: 'Batch stalls', message: 'Batch of 5 never finished.', fromEmail: 'jane@example.com', userId: '00000000-0000-0000-0000-000000000000', plan: 'operative' },
} satisfies TemplateEntry
