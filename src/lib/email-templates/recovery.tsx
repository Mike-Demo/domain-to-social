import * as React from 'react'
import { Text } from '@react-email/components'
import { BrandButton, BrandLayout, text } from './brand'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ siteName, confirmationUrl }: RecoveryEmailProps) => (
  <BrandLayout
    siteName={siteName}
    preview={`Reset your password for ${siteName}`}
    title="Reset your password"
    footerNote="If you didn't request a password reset, you can safely ignore this email. Your password will not be changed."
  >
    <Text style={text}>
      We received a request to reset your password for {siteName}. Click the button below to
      choose a new password.
    </Text>
    <BrandButton href={confirmationUrl} label="Reset Password" />
  </BrandLayout>
)

export default RecoveryEmail
