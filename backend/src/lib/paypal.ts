/**
 * Thin PayPal REST API v2 client using Node's built-in fetch.
 * No SDK dependency — keeps things lean and auditable.
 */
import { env } from '../config/env.js'

const PAYPAL_BASE =
  env.PAYPAL_MODE === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com'

interface PayPalTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

interface PayPalOrderResponse {
  id: string
  status: string
  links: Array<{ href: string; rel: string; method: string }>
}

interface PayPalCaptureResponse {
  id: string
  status: string
  purchase_units: Array<{
    payments: {
      captures: Array<{ id: string; amount: { currency_code: string; value: string } }>
    }
  }>
}

async function getAccessToken(): Promise<string> {
  if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) {
    throw new Error('PayPal credentials not configured')
  }

  const credentials = Buffer.from(
    `${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`,
  ).toString('base64')

  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  if (!res.ok) {
    throw new Error(`PayPal token request failed: ${res.status}`)
  }

  const data = (await res.json()) as PayPalTokenResponse
  return data.access_token
}

export async function createOrder(params: {
  courseId: string
  amount: string
  currency?: string
  description: string
}): Promise<PayPalOrderResponse> {
  const token = await getAccessToken()
  const currency = params.currency ?? 'USD'

  const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: params.courseId,
          description: params.description,
          amount: { currency_code: currency, value: params.amount },
        },
      ],
    }),
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`PayPal create order failed: ${res.status} — ${error}`)
  }

  return (await res.json()) as PayPalOrderResponse
}

export async function captureOrder(orderId: string): Promise<PayPalCaptureResponse> {
  const token = await getAccessToken()

  const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`PayPal capture failed: ${res.status} — ${error}`)
  }

  return (await res.json()) as PayPalCaptureResponse
}
