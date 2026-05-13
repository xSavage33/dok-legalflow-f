/**
 * ARCHIVO: PaymentModal.tsx
 * PROPOSITO: Modal de pago con Stripe Elements para procesar pagos de facturas.
 * Utiliza Stripe Elements para un formulario de pago seguro y compatible con PCI.
 */

import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { X, CreditCard, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import api from '../services/api'
import type { Invoice } from '../types'

// ========== CONFIGURACION DE STRIPE ==========

/**
 * Carga la instancia de Stripe con la publishable key
 * Se obtiene de las variables de entorno de Vite
 */
const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || ''
)

// ========== INTERFACES ==========

interface PaymentModalProps {
  invoice: Invoice
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface PaymentFormProps {
  invoice: Invoice
  onSuccess: () => void
  onCancel: () => void
}

// ========== COMPONENTE: FORMULARIO DE PAGO ==========

/**
 * Formulario de pago interno que usa los hooks de Stripe
 * Debe estar dentro del componente Elements
 */
function PaymentForm({ invoice, onSuccess, onCancel }: PaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()

  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentSucceeded, setPaymentSucceeded] = useState(false)

  /**
   * Maneja el envio del formulario de pago
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      // Confirma el pago con Stripe
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          // URL de retorno despues del pago (para 3D Secure, etc.)
          return_url: `${window.location.origin}/invoices?payment=success`,
        },
        // No redirigir automaticamente, manejar el resultado aqui
        redirect: 'if_required',
      })

      if (stripeError) {
        // Error de Stripe (tarjeta rechazada, datos invalidos, etc.)
        setError(stripeError.message || 'Error al procesar el pago')
      } else if (paymentIntent?.status === 'succeeded' || paymentIntent?.status === 'processing') {
        // Pago exitoso - confirmar en el backend para registrar el pago
        try {
          await api.post(`/invoices/${invoice.id}/pay/stripe/confirm/`, {
            payment_intent_id: paymentIntent.id,
          })
        } catch (confirmError) {
          // Si falla la confirmacion, el webhook de Stripe lo manejara
          console.warn('Error confirmando pago en backend:', confirmError)
        }

        // Mostrar exito al usuario
        setPaymentSucceeded(true)
        // Espera un momento para mostrar el mensaje de exito
        setTimeout(() => {
          onSuccess()
        }, 2000)
      }
    } catch (err) {
      setError('Error inesperado al procesar el pago')
      console.error('Payment error:', err)
    } finally {
      setIsProcessing(false)
    }
  }

  // ========== PANTALLA DE EXITO ==========

  if (paymentSucceeded) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          ¡Pago Exitoso!
        </h3>
        <p className="text-gray-600">
          Tu pago de ${Math.round(invoice.balance_due).toLocaleString('es-CO')} ha sido procesado correctamente.
        </p>
      </div>
    )
  }

  // ========== FORMULARIO DE PAGO ==========

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Resumen de la factura */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-600">Factura:</span>
          <span className="font-medium">{invoice.invoice_number}</span>
        </div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-600">Total:</span>
          <span className="font-medium">
            ${Math.round(invoice.total_amount).toLocaleString('es-CO')}
          </span>
        </div>
        <div className="flex justify-between items-center border-t pt-2">
          <span className="text-gray-900 font-semibold">A pagar:</span>
          <span className="text-xl font-bold text-primary-600">
            ${Math.round(invoice.balance_due).toLocaleString('es-CO')}
          </span>
        </div>
      </div>

      {/* Stripe Payment Element */}
      <div className="border rounded-lg p-4">
        <PaymentElement
          options={{
            layout: 'tabs',
          }}
        />
      </div>

      {/* Mensaje de error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Botones de accion */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isProcessing}
          className="flex-1 btn-secondary"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={!stripe || isProcessing}
          className="flex-1 btn-primary flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Procesando...
            </>
          ) : (
            <>
              <CreditCard className="h-5 w-5" />
              Pagar ${Math.round(invoice.balance_due).toLocaleString('es-CO')}
            </>
          )}
        </button>
      </div>

      {/* Nota de seguridad */}
      <p className="text-xs text-gray-500 text-center">
        Tu pago es procesado de forma segura por Stripe. No almacenamos los datos de tu tarjeta.
      </p>
    </form>
  )
}

// ========== COMPONENTE PRINCIPAL: PAYMENT MODAL ==========

/**
 * Modal principal que maneja la inicializacion de Stripe y el PaymentIntent
 */
export default function PaymentModal({ invoice, isOpen, onClose, onSuccess }: PaymentModalProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Inicia el proceso de pago creando un PaymentIntent en el backend
   */
  const initializePayment = async () => {
    if (clientSecret) return // Ya inicializado

    setIsLoading(true)
    setError(null)

    try {
      // Llama al endpoint del backend para crear el PaymentIntent
      // La ruta es /invoices/ porque el API Gateway enruta a billing-service
      const response = await api.post(`/invoices/${invoice.id}/pay/stripe/`, {
        amount: invoice.balance_due,
      })

      if (response.data.client_secret) {
        setClientSecret(response.data.client_secret)
      } else {
        setError('No se pudo iniciar el proceso de pago')
      }
    } catch (err: unknown) {
      console.error('Error initializing payment:', err)
      const axiosError = err as { response?: { data?: { error?: string } } }
      setError(
        axiosError.response?.data?.error ||
        'Error al conectar con el servicio de pagos'
      )
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Efecto para inicializar el pago cuando se abre el modal
   */
  if (isOpen && !clientSecret && !isLoading && !error) {
    initializePayment()
  }

  /**
   * Resetea el estado cuando se cierra el modal
   */
  const handleClose = () => {
    setClientSecret(null)
    setError(null)
    onClose()
  }

  /**
   * Callback cuando el pago es exitoso
   */
  const handleSuccess = () => {
    setClientSecret(null)
    onSuccess()
  }

  // No renderizar si el modal esta cerrado
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay oscuro */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />

      {/* Contenedor del modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full">
          {/* Header del modal */}
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                <CreditCard className="h-6 w-6 text-primary-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                Pagar Factura
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Contenido del modal */}
          <div className="p-6">
            {/* Estado de carga */}
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-12 w-12 text-primary-600 animate-spin mb-4" />
                <p className="text-gray-600">Preparando el pago...</p>
              </div>
            )}

            {/* Estado de error */}
            {error && !isLoading && (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Error al iniciar el pago
                </h3>
                <p className="text-gray-600 mb-4">{error}</p>
                <button
                  onClick={() => {
                    setError(null)
                    initializePayment()
                  }}
                  className="btn-primary"
                >
                  Reintentar
                </button>
              </div>
            )}

            {/* Formulario de pago de Stripe */}
            {clientSecret && !isLoading && !error && (
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: {
                    theme: 'stripe',
                    variables: {
                      colorPrimary: '#2563eb',
                      borderRadius: '8px',
                    },
                  },
                }}
              >
                <PaymentForm
                  invoice={invoice}
                  onSuccess={handleSuccess}
                  onCancel={handleClose}
                />
              </Elements>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
