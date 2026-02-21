import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorBoundary } from '../ErrorBoundary'

// A component that throws on render
function Bomb({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('Test explosion')
  return <div>All good</div>
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Suppress console.error noise from React's error boundary logging
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={false} />
      </ErrorBoundary>
    )
    expect(screen.getByText('All good')).toBeInTheDocument()
  })

  it('shows fallback UI when child throws', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('Test explosion')).toBeInTheDocument()
  })

  it('shows custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div>Custom fallback</div>}>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(screen.getByText('Custom fallback')).toBeInTheDocument()
  })

  it('fallback has role="alert" for accessibility', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('Try again resets the error state', () => {
    // Use a module-level flag so we can disarm the bomb before the reset re-render
    let armed = true
    function ControlledBomb() {
      if (armed) throw new Error('Controlled explosion')
      return <div>All good</div>
    }

    render(
      <ErrorBoundary>
        <ControlledBomb />
      </ErrorBoundary>
    )
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()

    // Disarm before clicking reset so the re-render succeeds
    armed = false
    fireEvent.click(screen.getByText('Try again'))

    expect(screen.getByText('All good')).toBeInTheDocument()
  })
})
