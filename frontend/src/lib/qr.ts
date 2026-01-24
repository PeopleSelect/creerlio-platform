/**
 * QR Code Generation Utilities
 */

/**
 * Generate QR code data URL for a verification URL
 */
export async function generateQRCodeDataUrl(verificationUrl: string): Promise<string> {
  // Use a lightweight QR code library
  // For now, we'll use qrcode library (must be installed via npm)
  try {
    // Dynamic import to avoid SSR issues
    const QRCode = (await import('qrcode')).default
    
    return await QRCode.toDataURL(verificationUrl, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      width: 300,
    })
  } catch (error) {
    console.error('[QR] Generation error:', error)
    throw new Error('Failed to generate QR code. Please ensure qrcode package is installed.')
  }
}

/**
 * Generate QR code as SVG string
 */
export async function generateQRCodeSVG(verificationUrl: string): Promise<string> {
  try {
    const QRCode = (await import('qrcode')).default
    
    return await QRCode.toString(verificationUrl, {
      type: 'svg',
      errorCorrectionLevel: 'M',
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      width: 300,
    })
  } catch (error) {
    console.error('[QR] SVG generation error:', error)
    throw new Error('Failed to generate QR code SVG.')
  }
}

/**
 * Get verification URL for a QR token
 */
export function getVerificationUrl(qrToken: string, baseUrl?: string): string {
  const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '')
  return `${base}/verify/${qrToken}`
}
