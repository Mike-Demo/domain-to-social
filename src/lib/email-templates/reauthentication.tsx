import * as React from 'react'
import { Text } from '@react-email/components'
import { BrandCode, BrandLayout, text } from './brand'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <BrandLayout
    preview="Your verification code"
    title="Confirm reauthentication"
    footerNote="This code will expire shortly. If you didn't request this, you can safely ignore this email."
  >
    <Text style={text}>Use the code below to confirm your identity:</Text>
    <BrandCode code={token} />
  </BrandLayout>
)

export default ReauthenticationEmail
