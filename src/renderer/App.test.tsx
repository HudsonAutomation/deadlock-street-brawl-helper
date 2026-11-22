/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { App } from './App'

afterEach(() => cleanup())

describe('advisor window', () => {
  it('E1 shows the three tabs and E4 shows the first-run lines', async () => {
    render(<App />)
    expect(screen.getByText('Deadlock Street Brawl Helper')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Draft advisor' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'My Picks' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Street Brawl Tier List' })).toBeTruthy()
    expect(screen.getByText('Got it')).toBeTruthy()
    expect(screen.getByText('Show me')).toBeTruthy()
    fireEvent.click(screen.getByText('Got it'))
    expect(screen.queryByText('Show me')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'My Picks' }))
    expect(screen.getByText(/Choose a hero to edit that list/)).toBeTruthy()
    expect(screen.getByText('Highlight My Picks')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Street Brawl Tier List' }))
    expect(screen.getByText(/data from the 30 days to/)).toBeTruthy()
  })
})
