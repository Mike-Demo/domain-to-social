import * as React from 'react'
import { Link, Text } from '@react-email/components'
import { BrandButton, BrandLayout, link, text } from './brand'

interface EmailChangeEmailProps {
  siteName: string
  // oldEmail is the user's current address (HookData.OldEmail). For the
  // NEW-recipient half of a secure email_change fanout, `email` equals the
  // recipient (NEW), so the "from" line must render oldEmail to read
  // "from OLD to NEW" instead of "from NEW to NEW".
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({ siteName, oldEmail, newEmail, confirmationUrl }: EmailChangeEmailProps) => (
  <BrandLayout
    siteName={siteName}
    preview={`Confirm your email change for ${siteName}`}
    title="Confirm your email change"
    footerNote="If you didn't request this change, please secure your account immediately."
  >
    <Text style={text}>
      You requested to change your email address for {siteName} from{' '}
      <Link href={`mailto:${oldEmail}`} style={link}>
        {oldEmail}
      </Link>{' '}
      to{' '}
      <Link href={`mailto:${newEmail}`} style={link}>
        {newEmail}
      </Link>
      .
    </Text>
    <Text style={text}>Click the button below to confirm this change:</Text>
    <BrandButton href={confirmationUrl} label="Confirm Email Change" />
  </BrandLayout>
)

export default EmailChangeEmail
