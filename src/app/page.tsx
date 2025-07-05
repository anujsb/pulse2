"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Heart, Home, Calendar, BookOpen, Settings, Camera, Send, Sparkles, Moon, Sun, Cloud, Star, ChevronRight, Plus, Volume2, VolumeX, Users } from 'lucide-react';
import { SignedIn, SignedOut, useUser } from '@clerk/nextjs';
import { supabase } from '../lib/supabase';
import { DatabaseService, UserProfile, DailyQuote } from '../lib/database';
import ConnectionModal from '../components/ConnectionModal';

type MoodType = 'happy' | 'romantic' | 'peaceful' | 'dreamy' | 'cozy';

interface HeartbeatSettings {
  color: string;
  intensity: number;
  pattern: 'gentle' | 'steady' | 'sync';
  soundEnabled: boolean;
}

const defaultSettings: HeartbeatSettings = {
  color: '#ff6b9d',
  intensity: 70,
  pattern: 'gentle',
  soundEnabled: false
};

const colorPresets = [
  '#ff6b9d', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57',
  '#fd79a8', '#00b894', '#0984e3', '#a29bfe', '#e17055'
];

const CoupleApp = () => {
  const { user } = useUser();
  const [currentMood, setCurrentMood] = useState<MoodType>('happy');
  const [quoteOfTheDay, setQuoteOfTheDay] = useState('');
  const [partnerQuote, setPartnerQuote] = useState('');
  const [currentRoute, setCurrentRoute] = useState('home');
  const [isQuoteSet, setIsQuoteSet] = useState(false);
  const [isPartnerQuoteSet, setIsPartnerQuoteSet] = useState(false);
  const [heartPulse, setHeartPulse] = useState(false);
  const [notification, setNotification] = useState('');
  const [showQuoteInput, setShowQuoteInput] = useState(false);
  const [heartbeatSettings, setHeartbeatSettings] = useState<HeartbeatSettings>(defaultSettings);
  const [showHeartbeatSettings, setShowHeartbeatSettings] = useState(false);
  const [isHeartbeatActive, setIsHeartbeatActive] = useState(true);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const pulseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Enhanced mood backgrounds with more romantic gradients
  const moodBackgrounds: Record<MoodType, string> = {
    happy: 'bg-gradient-to-br from-rose-100 via-pink-100 to-orange-100',
    romantic: 'bg-gradient-to-br from-purple-100 via-pink-100 to-red-100',
    peaceful: 'bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-100',
    dreamy: 'bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100',
    cozy: 'bg-gradient-to-br from-amber-100 via-orange-100 to-red-100'
  };

  // Get the mood for background (use partner's mood if connected, otherwise use current mood)
  const getBackgroundMood = (): MoodType => {
    if (userProfile?.partner_id && partnerProfile?.mood) {
      return partnerProfile.mood as MoodType;
    }
    return currentMood;
  };

  // Initialize user profile and load data
  useEffect(() => {
    if (!user?.id) return;

    const initializeUser = async () => {
      try {
        setIsLoading(true);
        
        // Get or create user profile
        let profile = await DatabaseService.getUserProfile(user.id);
        if (!profile) {
          profile = await DatabaseService.createUserProfile(user.id, user.fullName || undefined);
        }
        setUserProfile(profile);

        if (profile) {
          setCurrentMood(profile.mood as MoodType);
          
          // Load partner profile if connected
          if (profile.partner_id) {
            const partner = await DatabaseService.getPartnerProfile(user.id);
            setPartnerProfile(partner);
          }

          // Load today's quotes
          const today = new Date().toISOString().split('T')[0];
          const userQuote = await DatabaseService.getDailyQuote(user.id, today);
          const partnerQuoteData = await DatabaseService.getPartnerDailyQuote(user.id, today);

          if (userQuote) {
            setQuoteOfTheDay(userQuote.quote_text);
            setIsQuoteSet(true);
          }

          if (partnerQuoteData) {
            setPartnerQuote(partnerQuoteData.quote_text);
            setIsPartnerQuoteSet(true);
          }
        }
      } catch (error) {
        console.error('Error initializing user:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeUser();
  }, [user?.id]);

  // Subscribe to partner updates and nudges
  useEffect(() => {
    if (!user?.id) return;

    const partnerChannel = DatabaseService.subscribeToPartnerUpdates(user.id, (payload) => {
      if (payload.new) {
        setPartnerProfile(payload.new);
        if (payload.new.mood !== currentMood) {
          setCurrentMood(payload.new.mood as MoodType);
        }
      }
    });

    const nudgeChannel = DatabaseService.subscribeToNudges(user.id, (payload) => {
      setNotification('💕 Your partner sent you a nudge!');
      if ('vibrate' in navigator) {
        navigator.vibrate([50, 30, 50]);
      }
      setTimeout(() => setNotification(''), 3000);
    });

    const quoteChannel = DatabaseService.subscribeToDailyQuotes(user.id, async (payload) => {
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        const today = new Date().toISOString().split('T')[0];
        const partnerQuoteData = await DatabaseService.getPartnerDailyQuote(user.id, today);
        if (partnerQuoteData) {
          setPartnerQuote(partnerQuoteData.quote_text);
          setIsPartnerQuoteSet(true);
        }
      }
    });

    return () => {
      supabase.removeChannel(partnerChannel);
      supabase.removeChannel(nudgeChannel);
      supabase.removeChannel(quoteChannel);
    };
  }, [user?.id, currentMood]);

  // Update user profile and refresh data
  const updateUserProfile = async () => {
    if (!user?.id) return;
    
    try {
      const profile = await DatabaseService.getUserProfile(user.id);
      setUserProfile(profile);
      
      if (profile?.partner_id) {
        const partner = await DatabaseService.getPartnerProfile(user.id);
        setPartnerProfile(partner);
      } else {
        setPartnerProfile(null);
      }
    } catch (error) {
      console.error('Error updating user profile:', error);
    }
  };

  // Check if quote is set for today (fallback to localStorage)
  useEffect(() => {
    if (!user?.id) {
      const today = new Date().toDateString();
      const storedQuote = localStorage.getItem(`quote_${today}`);
      const storedMood = localStorage.getItem('currentMood');
      
      if (storedQuote) {
        setQuoteOfTheDay(storedQuote);
        setIsQuoteSet(true);
      }
      
      if (storedMood) {
        setCurrentMood(storedMood as MoodType);
      }
    }
  }, [user?.id]);

  const handleQuoteSubmit = async () => {
    if (quoteOfTheDay.trim() && user?.id) {
      const today = new Date().toISOString().split('T')[0];
      const success = await DatabaseService.saveDailyQuote(user.id, quoteOfTheDay, today);
      
      if (success) {
        setIsQuoteSet(true);
        setShowQuoteInput(false);
      } else {
        // Fallback to localStorage
        const todayStr = new Date().toDateString();
        localStorage.setItem(`quote_${todayStr}`, quoteOfTheDay);
        setIsQuoteSet(true);
        setShowQuoteInput(false);
      }
    }
  };

  const handleMoodChange = async (mood: MoodType) => {
    setCurrentMood(mood);
    
    if (user?.id) {
      await DatabaseService.updateUserMood(user.id, mood);
    } else {
      localStorage.setItem('currentMood', mood);
    }
  };

  const sendNudge = useCallback(async () => {
    setHeartPulse(true);
    
    if (user?.id) {
      await DatabaseService.sendNudgeToPartner(user.id);
    }
    
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 30, 50]);
    }
    if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
    pulseTimeoutRef.current = setTimeout(() => setHeartPulse(false), 1000);
  }, [user?.id]);

  const updateHeartbeatSettings = (newSettings: Partial<HeartbeatSettings>) => {
    const updated = { ...heartbeatSettings, ...newSettings };
    setHeartbeatSettings(updated);
  };

  const getHeartbeatAnimationClass = () => {
    const baseClass = heartPulse ? 'animate-pulse' : '';
    switch (heartbeatSettings.pattern) {
      case 'gentle': return `${baseClass} heartbeat-gentle`;
      case 'steady': return `${baseClass} heartbeat`;
      case 'sync': return `${baseClass} heartbeat-sync`;
      default: return `${baseClass} heartbeat-gentle`;
    }
  };

  const getHeartbeatAnimationDuration = () => {
    switch (heartbeatSettings.pattern) {
      case 'gentle': return '3s';
      case 'steady': return '2s';
      case 'sync': return '4s';
      default: return '3s';
    }
  };

  const routes = [
    { id: 'home', name: 'Home', icon: Home },
    { id: 'events', name: 'Events', icon: Calendar },
    { id: 'scrapbook', name: 'Scrapbook', icon: BookOpen },
    { id: 'memories', name: 'Memories', icon: Camera },
    { id: 'settings', name: 'Settings', icon: Settings }
  ];

  const moods = [
    { id: 'happy', name: 'Happy', icon: Sun, color: 'text-yellow-500', bgColor: 'bg-yellow-50' },
    { id: 'romantic', name: 'Romantic', icon: Heart, color: 'text-pink-500', bgColor: 'bg-pink-50' },
    { id: 'peaceful', name: 'Peaceful', icon: Cloud, color: 'text-blue-500', bgColor: 'bg-blue-50' },
    { id: 'dreamy', name: 'Dreamy', icon: Star, color: 'text-purple-500', bgColor: 'bg-purple-50' },
    { id: 'cozy', name: 'Cozy', icon: Moon, color: 'text-orange-500', bgColor: 'bg-orange-50' }
  ];

  const renderHomeScreen = () => (
    <div className="flex-1 flex flex-col p-4 space-y-6">
      {/* Connection Status */}
      {userProfile && (
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-4 shadow-xl border border-white/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-pink-400 to-rose-400 rounded-full flex items-center justify-center">
                <Heart size={16} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {userProfile.partner_id ? 'Connected with Partner' : 'Not Connected'}
                </p>
                <p className="text-xs text-gray-600">
                  {userProfile.connection_code}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowConnectionModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-pink-400 to-rose-400 text-white rounded-xl font-medium hover:from-pink-500 hover:to-rose-500 transition-all duration-300 shadow-lg"
            >
              <Users size={16} className="inline mr-2" />
              {userProfile.partner_id ? 'Manage' : 'Connect'}
            </button>
          </div>
        </div>
      )}

      {/* Header with Quote */}
      <div className="relative">
        {!isQuoteSet ? (
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-rose-400 rounded-full flex items-center justify-center">
                <Sparkles size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Daily Quote</h3>
                <p className="text-sm text-gray-600">Share your thoughts for today</p>
              </div>
            </div>
            {!showQuoteInput ? (
              <button
                onClick={() => setShowQuoteInput(true)}
                className="w-full py-4 px-6 bg-gradient-to-r from-pink-400 to-rose-400 text-white rounded-2xl font-medium hover:from-pink-500 hover:to-rose-500 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <Plus size={20} className="inline mr-2" />
                Add Today's Quote
              </button>
            ) : (
              <div className="space-y-4">
                <textarea
                  value={quoteOfTheDay}
                  onChange={(e) => setQuoteOfTheDay(e.target.value)}
                  placeholder="Share your daily quote or message..."
                  className="w-full px-4 py-3 text-sm border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-transparent resize-none"
                  rows={3}
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleQuoteSubmit}
                    className="flex-1 py-3 bg-gradient-to-r from-pink-400 to-rose-400 text-white rounded-2xl font-medium hover:from-pink-500 hover:to-rose-500 transition-all duration-300 shadow-lg"
                  >
                    <Send size={16} className="inline mr-2" />
                    Save Quote
                  </button>
                  <button
                    onClick={() => setShowQuoteInput(false)}
                    className="px-6 py-3 bg-gray-100 text-gray-600 rounded-2xl font-medium hover:bg-gray-200 transition-all duration-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-rose-400 rounded-full flex items-center justify-center">
                <Sparkles size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Today's Quote</h3>
                <p className="text-sm text-gray-600">Your daily inspiration</p>
              </div>
            </div>
                      <div className="bg-gradient-to-r from-pink-50 to-rose-50 rounded-2xl p-4 border border-pink-100">
            <p className="text-gray-700 italic text-center leading-relaxed">"{quoteOfTheDay}"</p>
          </div>
        </div>
      )}

      {/* Partner's Quote */}
      {userProfile?.partner_id && (
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
              <Heart size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Partner's Quote</h3>
              <p className="text-sm text-gray-600">
                {partnerProfile?.display_name || 'Your Partner'}'s daily inspiration
              </p>
            </div>
          </div>
          {isPartnerQuoteSet ? (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-4 border border-purple-100">
              <p className="text-gray-700 italic text-center leading-relaxed">"{partnerQuote}"</p>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-4 border border-gray-200">
              <p className="text-gray-500 italic text-center">Waiting for partner's quote...</p>
            </div>
          )}
        </div>
      )}
    </div>

      {/* Enhanced Heart Nudge Section */}
      <div className="flex flex-col items-center py-8">
        <div className="relative">
          {/* Ambient glow background */}
          <div 
            className="absolute inset-0 w-64 h-64 opacity-20"
            style={{
              background: `radial-gradient(circle at center, ${heartbeatSettings.color}40 0%, transparent 70%)`
            }}
          />
          
          {/* Animated background circles */}
          {/* <div className="absolute inset-0 w-48 h-48 bg-gradient-to-r from-pink-200 to-rose-200 rounded-full opacity-20 animate-pulse"></div> */}
          {/* <div className="absolute inset-4 w-40 h-40 bg-gradient-to-r from-pink-300 to-rose-300 rounded-full opacity-30 animate-pulse" style={{ animationDelay: '0.5s' }}></div> */}
          
          {/* Main heartbeat circle */}
          <div
            className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer ${
              isHeartbeatActive ? getHeartbeatAnimationClass() : ''
            } ${heartPulse ? 'scale-110' : ''}`}
            style={{
              background: `radial-gradient(circle, ${heartbeatSettings.color}${Math.round(heartbeatSettings.intensity * 2.55).toString(16).padStart(2, '0')} 0%, ${heartbeatSettings.color}20 70%, transparent 100%)`,
              boxShadow: `0 0 ${heartbeatSettings.intensity}px ${heartbeatSettings.color}60, inset 0 0 ${heartbeatSettings.intensity/2}px ${heartbeatSettings.color}40`,
              animationDuration: getHeartbeatAnimationDuration(),
              transform: heartPulse ? 'scale(1.1)' : 'scale(1)'
            }}
            onClick={sendNudge}
          >
            <Heart 
              size={48} 
              className="text-white/80 fill-current drop-shadow-lg" 
            />
            
            {/* Pulse rings */}
            <div 
              className="absolute inset-0 rounded-full border-2 opacity-30 animate-ping"
              style={{ 
                borderColor: heartbeatSettings.color,
                animationDuration: getHeartbeatAnimationDuration()
              }}
            />
            <div 
              className="absolute inset-2 rounded-full border opacity-20 animate-ping"
              style={{ 
                borderColor: heartbeatSettings.color,
                animationDelay: '0.5s',
                animationDuration: getHeartbeatAnimationDuration()
              }}
            />
          </div>
        </div>
        
        <div className="mt-6 text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-2">Send Love 💕</h2>
          <p className="text-gray-600 text-sm max-w-xs">
            Tap the heart to send a gentle nudge to your partner
          </p>
        </div>

        {/* Heartbeat Controls */}
        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={() => setIsHeartbeatActive(!isHeartbeatActive)}
            className="w-10 h-10 rounded-full bg-white/70 backdrop-blur-sm border border-white/20 flex items-center justify-center text-gray-600 hover:text-gray-800 transition-all"
          >
            {isHeartbeatActive ? '⏸️' : '▶️'}
          </button>
          <button
            onClick={() => setShowHeartbeatSettings(true)}
            className="w-10 h-10 rounded-full bg-white/70 backdrop-blur-sm border border-white/20 flex items-center justify-center text-gray-600 hover:text-gray-800 transition-all"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* Mood Selector */}
      <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/20">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
            <Star size={16} className="text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800">How are you feeling?</h3>
        </div>
        
        <div className="grid grid-cols-5 gap-3">
          {moods.map((mood) => {
            const IconComponent = mood.icon;
            const isSelected = currentMood === mood.id;
            return (
              <button
                key={mood.id}
                onClick={() => handleMoodChange(mood.id as MoodType)}
                className={`relative p-4 rounded-2xl transition-all duration-300 transform hover:scale-105 ${
                  isSelected 
                    ? `${mood.bgColor} scale-110 shadow-lg` 
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                {isSelected && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-pink-400 rounded-full animate-pulse"></div>
                )}
                <IconComponent 
                  size={24} 
                  className={`${mood.color} ${isSelected ? 'fill-current' : ''} transition-all duration-300`} 
                />
                <p className={`text-xs mt-2 font-medium ${isSelected ? 'text-gray-800' : 'text-gray-600'}`}>
                  {mood.name}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/20">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full flex items-center justify-center">
            <Calendar size={16} className="text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800">Quick Actions</h3>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <button className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl border border-blue-100 hover:from-blue-100 hover:to-purple-100 transition-all duration-300">
            <Calendar size={20} className="text-blue-500" />
            <span className="text-sm font-medium text-gray-700">Plan Date</span>
            <ChevronRight size={16} className="text-gray-400 ml-auto" />
          </button>
          
          <button className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-100 hover:from-green-100 hover:to-emerald-100 transition-all duration-300">
            <Camera size={20} className="text-green-500" />
            <span className="text-sm font-medium text-gray-700">Take Photo</span>
            <ChevronRight size={16} className="text-gray-400 ml-auto" />
          </button>
        </div>
      </div>

      {/* Heartbeat Settings Modal */}
      {showHeartbeatSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto shadow-2xl border border-white/20">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-gray-800 text-xl font-semibold">Heartbeat Settings</h2>
              <button
                onClick={() => setShowHeartbeatSettings(false)}
                className="text-gray-600 hover:text-gray-800 text-2xl"
              >
                ×
              </button>
            </div>
            
            {/* Color selection */}
            <div className="mb-6">
              <label className="text-gray-700 text-sm block mb-3">Color</label>
              <div className="grid grid-cols-5 gap-2">
                {colorPresets.map(color => (
                  <button
                    key={color}
                    onClick={() => updateHeartbeatSettings({ color })}
                    className={`w-10 h-10 rounded-full border-2 transition-all ${
                      heartbeatSettings.color === color ? 'border-pink-500 scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <div className="mt-3">
                <input
                  type="color"
                  value={heartbeatSettings.color}
                  onChange={(e) => updateHeartbeatSettings({ color: e.target.value })}
                  className="w-full h-10 rounded-lg bg-transparent border border-gray-300"
                />
              </div>
            </div>
            
            {/* Intensity */}
            <div className="mb-6">
              <label className="text-gray-700 text-sm block mb-2">
                Intensity ({heartbeatSettings.intensity}%)
              </label>
              <input
                type="range"
                min="20"
                max="100"
                value={heartbeatSettings.intensity}
                onChange={(e) => updateHeartbeatSettings({ intensity: parseInt(e.target.value) })}
                className="w-full accent-pink-500"
              />
            </div>
            
            {/* Pattern */}
            <div className="mb-6">
              <label className="text-gray-700 text-sm block mb-2">Pattern</label>
              <div className="flex gap-2">
                {['gentle', 'steady', 'sync'].map(pattern => (
                  <button
                    key={pattern}
                    onClick={() => updateHeartbeatSettings({ pattern: pattern as any })}
                    className={`px-3 py-2 rounded-lg text-sm capitalize transition-all ${
                      heartbeatSettings.pattern === pattern 
                        ? 'bg-pink-500 text-white' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {pattern}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Sound toggle */}
            <div className="flex items-center justify-between">
              <span className="text-gray-700 text-sm">Sound</span>
              <button
                onClick={() => updateHeartbeatSettings({ soundEnabled: !heartbeatSettings.soundEnabled })}
                className="text-gray-600 hover:text-gray-800"
              >
                {heartbeatSettings.soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification */}
      {notification && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white/95 backdrop-blur-xl rounded-3xl px-8 py-6 shadow-2xl border border-white/20 z-50 animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-rose-400 rounded-full flex items-center justify-center animate-pulse">
              <Heart size={20} className="text-white" />
            </div>
            <p className="text-lg font-medium text-gray-800">{notification}</p>
          </div>
        </div>
      )}
    </div>
  );

  const renderPlaceholderScreen = (routeName: string) => (
    <div className="flex-1 flex flex-col items-center justify-center p-6">
      <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-white/20 text-center max-w-sm">
        <div className="w-20 h-20 bg-gradient-to-br from-pink-400 to-rose-400 rounded-full flex items-center justify-center mx-auto mb-6">
          <Heart size={32} className="text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4 capitalize">{routeName}</h2>
        <p className="text-gray-600 mb-6">This feature is coming soon! 💕</p>
        <div className="w-16 h-16 bg-gradient-to-br from-pink-200 to-rose-200 rounded-full flex items-center justify-center mx-auto animate-pulse">
          <Sparkles size={24} className="text-pink-500" />
        </div>
      </div>
    </div>
  );

  const renderWelcomeScreen = () => (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-rose-100 via-pink-100 to-orange-100">
      <div className="text-center space-y-8 max-w-md">
        <div className="relative">
          <div className="w-32 h-32 bg-gradient-to-br from-pink-400 to-rose-400 rounded-full flex items-center justify-center mx-auto shadow-2xl">
            <Heart size={64} className="text-white fill-white" />
          </div>
          <div className="absolute -top-4 -right-4 w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center animate-pulse">
            <Sparkles size={24} className="text-white" />
          </div>
        </div>
        
        <div className="space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">
            Together Forever
          </h1>
          <p className="text-xl text-gray-700 leading-relaxed">
            Stay connected with your partner through love, memories, and daily moments
          </p>
        </div>
        
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-white/20">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Welcome 💕</h2>
          <p className="text-gray-600 mb-6">
            Sign in to start sharing your journey together
          </p>
          <div className="w-16 h-16 bg-gradient-to-br from-pink-200 to-rose-200 rounded-full flex items-center justify-center mx-auto animate-pulse">
            <Heart size={24} className="text-pink-500" />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <SignedOut>
        {renderWelcomeScreen()}
      </SignedOut>
      
      <SignedIn>
        {isLoading ? (
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-100 via-pink-100 to-orange-100">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-pink-400 to-rose-400 rounded-full flex items-center justify-center mx-auto animate-pulse">
                <Heart size={32} className="text-white" />
              </div>
              <p className="text-gray-600">Loading your love space...</p>
            </div>
          </div>
        ) : (
          <div className={`min-h-screen transition-all duration-700 ${moodBackgrounds[getBackgroundMood()]}`}>
          {/* Header - Only show when signed in */}
          <header className="bg-white/80 backdrop-blur-xl shadow-lg border-b border-white/20 sticky top-0 z-40">
            <div className="px-6 py-4">
              <div className="flex items-center justify-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-pink-400 to-rose-400 rounded-full flex items-center justify-center">
                  <Heart size={16} className="text-white" />
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">
                  Together Forever
                </h1>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 pb-24">
            {currentRoute === 'home' && renderHomeScreen()}
            {currentRoute !== 'home' && renderPlaceholderScreen(currentRoute)}
          </main>

          {/* Bottom Navigation */}
          <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-white/20 shadow-2xl z-50">
            <div className="flex justify-around py-3 px-4">
              {routes.map((route) => {
                const IconComponent = route.icon;
                const isActive = currentRoute === route.id;
                return (
                  <button
                    key={route.id}
                    onClick={() => setCurrentRoute(route.id)}
                    className={`relative flex flex-col items-center p-3 rounded-2xl transition-all duration-300 ${
                      isActive 
                        ? 'text-pink-500 bg-gradient-to-r from-pink-50 to-rose-50 shadow-lg' 
                        : 'text-gray-600 hover:text-pink-400 hover:bg-gray-50'
                    }`}
                  >
                    {isActive && (
                      <div className="absolute -top-1 w-2 h-2 bg-pink-400 rounded-full"></div>
                    )}
                    <IconComponent size={22} className="mb-1" />
                    <span className="text-xs font-medium">{route.name}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        </div>
        )}

        {/* Connection Modal */}
        <ConnectionModal
          isOpen={showConnectionModal}
          onClose={() => setShowConnectionModal(false)}
          userProfile={userProfile}
          onProfileUpdate={updateUserProfile}
        />
      </SignedIn>
    </>
  );
};

export default CoupleApp;