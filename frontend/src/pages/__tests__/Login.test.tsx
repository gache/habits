import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Login from '../Login'

vi.mock('@/lib/firebase', () => ({ auth: {} }))

const signInWithEmailAndPassword = vi.fn()
const createUserWithEmailAndPassword = vi.fn()
const sendPasswordResetEmail = vi.fn()
const signInWithPopup = vi.fn()

vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: (...args: unknown[]) => signInWithEmailAndPassword(...args),
  createUserWithEmailAndPassword: (...args: unknown[]) => createUserWithEmailAndPassword(...args),
  sendPasswordResetEmail: (...args: unknown[]) => sendPasswordResetEmail(...args),
  signInWithPopup: (...args: unknown[]) => signInWithPopup(...args),
  GoogleAuthProvider: class {},
}))

function fillCredentials(email: string, password: string) {
  fireEvent.change(screen.getByPlaceholderText('tu@ejemplo.com'), { target: { value: email } })
  fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: password } })
}

function submitButton() {
  return document.querySelector('form button[type="submit"]') as HTMLButtonElement
}

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the sign-in form by default', () => {
    render(<Login />)

    expect(submitButton()).toHaveTextContent('Iniciar Sesión')
  })

  it('switches to sign-up mode when the Registrarse tab is clicked', () => {
    render(<Login />)

    fireEvent.click(screen.getByRole('button', { name: 'Registrarse' }))

    expect(submitButton()).toHaveTextContent('Crear Cuenta')
  })

  it('signs in with email and password on submit', async () => {
    signInWithEmailAndPassword.mockResolvedValue({})
    render(<Login />)
    fillCredentials('user@example.com', 'secret123')

    fireEvent.click(submitButton())

    await waitFor(() => {
      expect(signInWithEmailAndPassword).toHaveBeenCalledWith({}, 'user@example.com', 'secret123')
    })
  })

  it('creates an account with email and password when in sign-up mode', async () => {
    createUserWithEmailAndPassword.mockResolvedValue({})
    render(<Login />)
    fireEvent.click(screen.getByRole('button', { name: 'Registrarse' }))
    fillCredentials('new@example.com', 'secret123')

    fireEvent.click(submitButton())

    await waitFor(() => {
      expect(createUserWithEmailAndPassword).toHaveBeenCalledWith({}, 'new@example.com', 'secret123')
    })
  })

  it('shows an error message when sign-in fails', async () => {
    signInWithEmailAndPassword.mockRejectedValue(new Error('Credenciales inválidas'))
    render(<Login />)
    fillCredentials('user@example.com', 'wrong')

    fireEvent.click(submitButton())

    expect(await screen.findByText('Credenciales inválidas')).toBeInTheDocument()
  })

  it('requires an email before sending a password reset', () => {
    render(<Login />)

    fireEvent.click(screen.getByRole('button', { name: '¿Olvidaste tu contraseña?' }))

    expect(screen.getByText('Ingresa tu correo arriba y volvé a intentar.')).toBeInTheDocument()
    expect(sendPasswordResetEmail).not.toHaveBeenCalled()
  })

  it('sends a password reset email and shows a confirmation', async () => {
    sendPasswordResetEmail.mockResolvedValue(undefined)
    render(<Login />)
    fireEvent.change(screen.getByPlaceholderText('tu@ejemplo.com'), { target: { value: 'user@example.com' } })

    fireEvent.click(screen.getByRole('button', { name: '¿Olvidaste tu contraseña?' }))

    expect(await screen.findByText('Te enviamos un correo para restablecer tu contraseña.')).toBeInTheDocument()
    expect(sendPasswordResetEmail).toHaveBeenCalledWith({}, 'user@example.com')
  })

  it('signs in with Google when the Google button is clicked', async () => {
    signInWithPopup.mockResolvedValue({})
    render(<Login />)

    fireEvent.click(screen.getByRole('button', { name: /Continuar con Google/ }))

    await waitFor(() => {
      expect(signInWithPopup).toHaveBeenCalled()
    })
  })
})
