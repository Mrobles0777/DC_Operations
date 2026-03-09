import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export const useAuth = () => {
    const [user, setUser] = useState<User | null>(null)
    const [authLoading, setAuthLoading] = useState(true)

    useEffect(() => {
        // Check active sessions and sets the user
        supabase.auth.getSession().then(({ data: { session }, error }) => {
            if (error) {
                console.warn("Session error detected, clearing invalid auth tokens:", error.message);
                supabase.auth.signOut();
                setUser(null);
            } else {
                setUser(session?.user ?? null)
            }
            setAuthLoading(false)
        }).catch(err => {
            console.error("Failed to recover session:", err);
            supabase.auth.signOut();
            setUser(null);
            setAuthLoading(false);
        })

        // Listen for changes on auth state (logged in, signed out, etc.)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null)
        })

        return () => subscription.unsubscribe()
    }, [])

    const logout = async () => {
        await supabase.auth.signOut()
    }

    return { user, authLoading, logout, setUser }
}
