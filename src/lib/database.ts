import { supabase } from './supabase';
import { useUser } from '@clerk/nextjs';

export interface UserProfile {
  id: string;
  clerk_user_id: string;
  username?: string;
  display_name?: string;
  connection_code: string;
  partner_id?: string;
  mood: string;
  created_at: string;
  updated_at: string;
}

export interface DailyQuote {
  id: string;
  user_id: string;
  quote_text: string;
  quote_date: string;
  created_at: string;
}

export interface ConnectionRequest {
  id: string;
  requester_id: string;
  target_connection_code: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  updated_at: string;
}

export class DatabaseService {
  // User Profile Operations
  static async createUserProfile(clerkUserId: string, displayName?: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .insert({
          clerk_user_id: clerkUserId,
          display_name: displayName,
          connection_code: await this.generateConnectionCode()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating user profile:', error);
      return null;
    }
  }

  static async getUserProfile(clerkUserId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('clerk_user_id', clerkUserId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  static async updateUserMood(clerkUserId: string, mood: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ mood })
        .eq('clerk_user_id', clerkUserId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating user mood:', error);
      return false;
    }
  }

  static async disconnectPartner(clerkUserId: string): Promise<boolean> {
    try {
      // Get current user profile
      const userProfile = await this.getUserProfile(clerkUserId);
      if (!userProfile?.partner_id) return true;

      // Update both users to remove partner connection
      const { error: error1 } = await supabase
        .from('user_profiles')
        .update({ partner_id: null })
        .eq('clerk_user_id', clerkUserId);

      const { error: error2 } = await supabase
        .from('user_profiles')
        .update({ partner_id: null })
        .eq('id', userProfile.partner_id);

      if (error1 || error2) throw error1 || error2;
      return true;
    } catch (error) {
      console.error('Error disconnecting partner:', error);
      return false;
    }
  }

  static async getPartnerProfile(clerkUserId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          *,
          partner:user_profiles!user_profiles_partner_id_fkey(*)
        `)
        .eq('clerk_user_id', clerkUserId)
        .single();

      if (error) throw error;
      return data.partner;
    } catch (error) {
      console.error('Error getting partner profile:', error);
      return null;
    }
  }

  // Connection Code Operations
  static async generateConnectionCode(): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('generate_connection_code');
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error generating connection code:', error);
      // Fallback: generate a simple code
      return Math.random().toString(36).substring(2, 8).toUpperCase();
    }
  }

  static async connectWithPartner(connectionCode: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('connect_partners', {
        connection_code: connectionCode
      });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error connecting with partner:', error);
      return false;
    }
  }

  // Daily Quote Operations
  static async saveDailyQuote(clerkUserId: string, quoteText: string, quoteDate: string): Promise<boolean> {
    try {
      const userProfile = await this.getUserProfile(clerkUserId);
      if (!userProfile) return false;

      const { error } = await supabase
        .from('daily_quotes')
        .upsert({
          user_id: userProfile.id,
          quote_text: quoteText,
          quote_date: quoteDate
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error saving daily quote:', error);
      return false;
    }
  }

  static async getDailyQuote(clerkUserId: string, quoteDate: string): Promise<DailyQuote | null> {
    try {
      const userProfile = await this.getUserProfile(clerkUserId);
      if (!userProfile) return null;

      const { data, error } = await supabase
        .from('daily_quotes')
        .select('*')
        .eq('user_id', userProfile.id)
        .eq('quote_date', quoteDate)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting daily quote:', error);
      return null;
    }
  }

  static async getPartnerDailyQuote(clerkUserId: string, quoteDate: string): Promise<DailyQuote | null> {
    try {
      const partnerProfile = await this.getPartnerProfile(clerkUserId);
      if (!partnerProfile) return null;

      const { data, error } = await supabase
        .from('daily_quotes')
        .select('*')
        .eq('user_id', partnerProfile.id)
        .eq('quote_date', quoteDate)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting partner daily quote:', error);
      return null;
    }
  }

  // Real-time subscriptions
  static subscribeToPartnerUpdates(clerkUserId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`partner-updates-${clerkUserId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'user_profiles',
        filter: `clerk_user_id=eq.${clerkUserId}`
      }, callback)
      .subscribe();
  }

  static subscribeToDailyQuotes(clerkUserId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`daily-quotes-${clerkUserId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'daily_quotes'
      }, callback)
      .subscribe();
  }

  static subscribeToNudges(clerkUserId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`nudges-${clerkUserId}`)
      .on('broadcast', { event: 'nudge' }, callback)
      .subscribe();
  }

  // Send nudge to partner
  static async sendNudgeToPartner(clerkUserId: string) {
    try {
      const partnerProfile = await this.getPartnerProfile(clerkUserId);
      if (!partnerProfile) return false;

      const channel = supabase.channel(`nudges-${partnerProfile.clerk_user_id}`);
      await channel.send({
        type: 'broadcast',
        event: 'nudge',
        payload: {
          from: clerkUserId,
          timestamp: new Date().toISOString()
        }
      });

      return true;
    } catch (error) {
      console.error('Error sending nudge:', error);
      return false;
    }
  }
} 