import axios from 'axios'

export interface ExchangeRateResponse {
  fecha: string
  promedio: number
  compra: number
  venta: number
}

export const getExchangeRate = async (): Promise<number> => {
  try {
    const response = await axios.get<ExchangeRateResponse>('https://ve.dolarapi.com/v1/dolares/oficial')
    return response.data.promedio
  } catch (error) {
    console.error('Error fetching exchange rate:', error)
    // Fallback rate if API fails
    return 36.5
  }
}

export const convertUSDToBS = (usdAmount: number, exchangeRate: number): number => {
  return usdAmount * exchangeRate
}

export const formatCurrency = (amount: number, currency: 'USD' | 'BS'): string => {
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  } else {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'VES',
      minimumFractionDigits: 2,
    }).format(amount)
  }
}