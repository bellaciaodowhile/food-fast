import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface PayloadData {
  id?: string
  status?: string
  [key: string]: any
}

interface RealtimePayload {
  eventType: string
  table: string
  new?: PayloadData
  old?: PayloadData
}

export const useRealtime = (table: string, callback: () => void, events: string[] = ['*']) => {
  useEffect(() => {
    console.log(`🔗 Setting up realtime listener for table: ${table}, events: ${events.join(', ')}`)
    
    const channel = supabase.channel(`public:${table}:${events.join('-')}`)

    // Add listeners for each specified event
    events.forEach(event => {
      channel.on(
        'postgres_changes',
        {
          event: event as any,
          schema: 'public',
          table: table,
        },
        (payload: RealtimePayload) => {
          console.log(`📡 Realtime ${event} on ${table}:`, {
            event: payload.eventType,
            table: payload.table,
            new: payload.new ? { id: payload.new.id, status: payload.new.status } : null,
            old: payload.old ? { id: payload.old.id, status: payload.old.status } : null
          })
          
          // Only trigger callback for relevant changes
          if (event === 'INSERT' || 
              (event === 'UPDATE' && payload.old && payload.new && 
               payload.old.status !== payload.new.status)) {
            console.log(`✅ Triggering callback for ${event} on ${table}`)
            callback()
          } else {
            console.log(`⏭️ Skipping callback for ${event} on ${table} (not relevant)`)
          }
        }
      )
    })

    channel.subscribe((status) => {
      console.log(`📡 Realtime subscription status for ${table}:`, status)
    })

    return () => {
      console.log(`🔌 Cleaning up realtime listener for table: ${table}`)
      supabase.removeChannel(channel)
    }
  }, [table, callback, events.join(',')])
}