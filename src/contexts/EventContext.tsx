import React, { createContext, useContext, useCallback, useRef } from 'react'

interface EventContextType {
  emit: (event: string, data?: any) => void
  on: (event: string, callback: (data?: any) => void) => () => void
}

const EventContext = createContext<EventContextType | undefined>(undefined)

export const EventProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const listeners = useRef<{ [key: string]: ((data?: any) => void)[] }>({})

  const emit = useCallback((event: string, data?: any) => {
    console.log(`🔔 Event emitted: ${event}`, data)
    if (listeners.current[event]) {
      listeners.current[event].forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error)
        }
      })
    }
  }, [])

  const on = useCallback((event: string, callback: (data?: any) => void) => {
    console.log(`👂 Listening to event: ${event}`)
    if (!listeners.current[event]) {
      listeners.current[event] = []
    }
    listeners.current[event].push(callback)

    // Return unsubscribe function
    return () => {
      if (listeners.current[event]) {
        listeners.current[event] = listeners.current[event].filter(cb => cb !== callback)
      }
    }
  }, [])

  return (
    <EventContext.Provider value={{ emit, on }}>
      {children}
    </EventContext.Provider>
  )
}

export const useEvents = () => {
  const context = useContext(EventContext)
  if (context === undefined) {
    throw new Error('useEvents must be used within an EventProvider')
  }
  return context
}