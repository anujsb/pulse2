"use client"

import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Heart, Users, UserPlus } from 'lucide-react';
import { DatabaseService, UserProfile } from '../lib/database';
import { useUser } from '@clerk/nextjs';

interface ConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile | null;
  onProfileUpdate: () => void;
}

const ConnectionModal: React.FC<ConnectionModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  onProfileUpdate
}) => {
  const { user } = useUser();
  const [connectionCode, setConnectionCode] = useState('');
  const [partnerCode, setPartnerCode] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [copied, setCopied] = useState(false);
  const [partnerProfile, setPartnerProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (userProfile?.connection_code) {
      setConnectionCode(userProfile.connection_code);
    }
  }, [userProfile]);

  useEffect(() => {
    if (userProfile?.partner_id) {
      loadPartnerProfile();
    }
  }, [userProfile?.partner_id]);

  const loadPartnerProfile = async () => {
    if (!user?.id) return;
    
    try {
      const partner = await DatabaseService.getPartnerProfile(user.id);
      setPartnerProfile(partner);
    } catch (error) {
      console.error('Error loading partner profile:', error);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(connectionCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const connectWithPartner = async () => {
    if (!partnerCode.trim() || !user?.id) return;

    setIsConnecting(true);
    setConnectionStatus('idle');

    try {
      const success = await DatabaseService.connectWithPartner(partnerCode.trim());
      
      if (success) {
        setConnectionStatus('success');
        setPartnerCode('');
        onProfileUpdate();
        setTimeout(() => {
          setConnectionStatus('idle');
          onClose();
        }, 2000);
      } else {
        setConnectionStatus('error');
      }
    } catch (error) {
      console.error('Error connecting with partner:', error);
      setConnectionStatus('error');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectPartner = async () => {
    if (!user?.id) return;

    try {
      const success = await DatabaseService.disconnectPartner(user.id);
      if (success) {
        onProfileUpdate();
        setPartnerProfile(null);
      }
    } catch (error) {
      console.error('Error disconnecting partner:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl border border-white/20">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-rose-400 rounded-full flex items-center justify-center">
              <Users size={20} className="text-white" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">Partner Connection</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-800 text-2xl"
          >
            <X size={24} />
          </button>
        </div>

        {/* Connection Status */}
        {connectionStatus === 'success' && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <Check size={16} className="text-white" />
              </div>
              <p className="text-green-700 font-medium">Successfully connected with partner! 💕</p>
            </div>
          </div>
        )}

        {connectionStatus === 'error' && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                <X size={16} className="text-white" />
              </div>
              <p className="text-red-700 font-medium">Invalid connection code. Please try again.</p>
            </div>
          </div>
        )}

        {/* Your Connection Code */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Your Connection Code</h3>
          <div className="bg-gradient-to-r from-pink-50 to-rose-50 rounded-2xl p-4 border border-pink-100">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1">Share this code with your partner</p>
                <p className="text-2xl font-mono font-bold text-gray-800 tracking-wider">
                  {connectionCode}
                </p>
              </div>
              <button
                onClick={copyToClipboard}
                className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-all"
              >
                {copied ? (
                  <Check size={16} className="text-green-500" />
                ) : (
                  <Copy size={16} className="text-gray-600" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Connect with Partner */}
        {!userProfile?.partner_id ? (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Connect with Partner</h3>
            <div className="space-y-3">
              <input
                type="text"
                value={partnerCode}
                onChange={(e) => setPartnerCode(e.target.value.toUpperCase())}
                placeholder="Enter partner's connection code"
                className="w-full px-4 py-3 text-center text-lg font-mono border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-transparent"
                maxLength={6}
              />
              <button
                onClick={connectWithPartner}
                disabled={isConnecting || !partnerCode.trim()}
                className="w-full py-3 bg-gradient-to-r from-pink-400 to-rose-400 text-white rounded-2xl font-medium hover:from-pink-500 hover:to-rose-500 transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isConnecting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Connecting...
                  </>
                ) : (
                  <>
                    <UserPlus size={16} />
                    Connect
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Connected Partner Info */
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Connected Partner</h3>
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-400 rounded-full flex items-center justify-center">
                  <Heart size={20} className="text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-800">
                    {partnerProfile?.display_name || 'Your Partner'}
                  </p>
                  <p className="text-sm text-gray-600">
                    Connected since {new Date(partnerProfile?.created_at || '').toLocaleDateString()}
                  </p>
                </div>
              </div>
              <button
                onClick={disconnectPartner}
                className="mt-3 w-full py-2 bg-red-100 text-red-600 rounded-xl font-medium hover:bg-red-200 transition-all duration-300"
              >
                Disconnect
              </button>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
          <h4 className="font-semibold text-blue-800 mb-2">How to connect:</h4>
          <ol className="text-sm text-blue-700 space-y-1">
            <li>1. Share your connection code with your partner</li>
            <li>2. Ask your partner to enter your code in their app</li>
            <li>3. Once connected, you'll see each other's moods and quotes</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default ConnectionModal; 