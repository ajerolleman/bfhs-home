import React, { useState, useEffect } from 'react';
import { UserProfile, MemoryNote } from '../types';
import { 
    saveUserProfile, 
    signInWithGoogle, 
    deleteMemoryNote, 
    getRecentMemoryNotes
} from '../services/firebase';
import { clearSpotifyAuth, getSpotifyLoginUrl } from '../services/authService';
import SchoolLogo from './SchoolLogo';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any; // Firebase User
  profile: UserProfile | null;
  onProfileUpdate: (p: UserProfile) => void;
  authMessage?: string | null;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, user, profile, onProfileUpdate, authMessage }) => {
  const [name, setName] = useState(profile?.name || '');
  const [grade, setGrade] = useState(profile?.grade || '9th');
  const [allowMemory, setAllowMemory] = useState(true);
  const [activeTab, setActiveTab] = useState<'profile' | 'schedule' | 'spotify'>('profile');
  const [notes, setNotes] = useState<MemoryNote[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  // Schedule State
  const [scheduleA, setScheduleA] = useState<string[]>(['', '', '', '']);
  const [scheduleB, setScheduleB] = useState<string[]>(['', '', '', '']);

  const calculateGradeFromEmail = (email: string): string => {
      const prefix = email.split('@')[0];
      // Match the last 2 digits at the end of the prefix
      const match = prefix.match(/(\d{2})$/);
      if (!match) return 'Faculty';
      
      const year = parseInt(match[1], 10);
      // Logic for 2025-2026 school year:
      // 26 -> 12th
      // 27 -> 11th
      // 28 -> 10th
      // 29 -> 9th
      if (year === 29) return '9th';
      if (year === 28) return '10th';
      if (year === 27) return '11th';
      if (year === 26) return '12th';
      return 'Student'; 
  };

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setGrade(profile.grade);
      setAllowMemory(profile.allowMemory);
      if (profile.schedule) {
          setScheduleA(profile.schedule.A);
          setScheduleB(profile.schedule.B);
      }
    } else if (user && user.displayName) {
        // Auto-fill name from Google Account if profile doesn't exist
        setName(user.displayName);
        if (user.email) {
            setGrade(calculateGradeFromEmail(user.email));
        }
    }
    // Always force update grade from email if user exists, to keep it sync
    if (user && user.email) {
        const calculated = calculateGradeFromEmail(user.email);
        if (calculated !== 'Faculty' && calculated !== 'Student') {
             setGrade(calculated);
        }
    }
  }, [profile, user]);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    const newProfile = {
      uid: user.uid,
      name,
      email: user.email, // Add this so people can find you by email
      grade,
      allowMemory,
      schedule: {
          A: scheduleA,
          B: scheduleB
      }
    };
    await saveUserProfile(user.uid, newProfile);
    onProfileUpdate(newProfile as UserProfile);
    setIsSaving(false);
    onClose();
  };

  const handleDeleteNote = async (id: string) => {
    if (!user) return;
    await deleteMemoryNote(user.uid, id);
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  const handleBackdropClick = () => {
      if (user) onClose();
  };

  // Helper to update schedule arrays
  const updateSchedule = (day: 'A' | 'B', index: number, value: string) => {
      if (day === 'A') {
          const newS = [...scheduleA];
          newS[index] = value;
          setScheduleA(newS);
      } else {
          const newS = [...scheduleB];
          newS[index] = value;
          setScheduleB(newS);
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={handleBackdropClick} />
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden relative z-10 animate-fade-in-up">
        
        {/* Header */}
        <div className="bg-falcon-green px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-header font-bold uppercase tracking-widest text-white">
            {user ? "BFHS Settings" : "BFHS Student Login"}
          </h2>
            {user && (
                <button onClick={onClose} className="text-white/70 hover:text-white">✕</button>
            )}
        </div>

        {/* Content */}
        <div className="p-6 max-h-[80vh] overflow-y-auto">
            {!user ? (
                // Auth View
                <div className="space-y-6 text-center py-4">
                    <div className="w-16 h-16 bg-falcon-green/10 rounded-full flex items-center justify-center mx-auto text-3xl">
                        🔒
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">Login Required</h3>
                        <p className="text-gray-600 text-sm">
                            Please sign in with your student Google account to access the portal.
                        </p>
                    </div>

                    {authMessage && (
                        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                            {authMessage}
                        </div>
                    )}
                    
                    <button 
                        onClick={() => signInWithGoogle()}
                        className="w-full py-4 bg-white border-2 border-gray-200 hover:border-falcon-green rounded-xl flex items-center justify-center gap-3 font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm hover:shadow-md group"
                    >
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt=""/>
                        <span>Sign in with Google</span>
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                    </button>
                    
                    <p className="text-xs text-gray-400 mt-4">
                        By signing in, you agree to the BFHS acceptable use policy.
                    </p>
                </div>
            ) : (
                // Settings View
                <div>
                     {/* Tabs */}
                     <div className="flex border-b border-gray-200 mb-6">
                        <button 
                            onClick={() => setActiveTab('profile')}
                            className={`flex-1 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'profile' ? 'border-falcon-green text-falcon-green' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            Profile
                        </button>
                        <button 
                            onClick={() => setActiveTab('schedule')}
                            className={`flex-1 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'schedule' ? 'border-falcon-green text-falcon-green' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            Schedule
                        </button>
                        <button 
                             onClick={() => setActiveTab('spotify')}
                             className={`flex-1 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'spotify' ? 'border-falcon-green text-falcon-green' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                             Spotify
                        </button>
                     </div>

                     {activeTab === 'profile' && (
                         <div className="space-y-4 max-w-md mx-auto">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Your Name</label>
                                <input 
                                    type="text" 
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. Jordan"
                                    className="w-full p-3 rounded-lg bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-falcon-green focus:outline-none"
                                />
                            </div>
                         </div>
                     )}

                     {activeTab === 'schedule' && (
                         <div className="space-y-6">
                            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                                <p className="text-sm text-blue-900 font-medium">
                                    <strong>Custom Schedule:</strong> Enter your specific class names (e.g., "Algebra II", "Chemistry"). 
                                    These will replace the generic "Period 1" in the top dashboard ticker.
                                </p>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {/* A Days Column */}
                                <div className="bg-white rounded-xl border-2 border-falcon-green/20 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                    <div className="bg-falcon-green py-3 px-4 text-center">
                                        <h4 className="font-header text-xl text-white tracking-wider uppercase">A Days</h4>
                                        <p className="text-white/80 text-[10px] uppercase font-bold tracking-widest">Mon • Wed • Alt Fri</p>
                                    </div>
                                    <div className="p-4 space-y-4 bg-falcon-green/5 h-full">
                                        {[0, 1, 2, 3].map(i => (
                                            <div key={`A-${i}`} className="relative">
                                                <label className="block text-xs font-bold text-falcon-green uppercase mb-1 ml-1">Period {i+1}</label>
                                                <input 
                                                    type="text"
                                                    value={scheduleA[i]}
                                                    onChange={(e) => updateSchedule('A', i, e.target.value)}
                                                    placeholder="Class Name"
                                                    className="w-full p-3 text-base font-medium text-gray-800 bg-white border border-falcon-green/20 rounded-lg focus:ring-2 focus:ring-falcon-green focus:border-transparent outline-none transition-all placeholder-gray-400"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* B Days Column */}
                                <div className="bg-white rounded-xl border-2 border-falcon-gold/20 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                    <div className="bg-falcon-gold py-3 px-4 text-center">
                                        <h4 className="font-header text-xl text-black tracking-wider uppercase">B Days</h4>
                                        <p className="text-black/70 text-[10px] uppercase font-bold tracking-widest">Tue • Thu • Alt Fri</p>
                                    </div>
                                    <div className="p-4 space-y-4 bg-falcon-gold/5 h-full">
                                        {[0, 1, 2, 3].map(i => (
                                            <div key={`B-${i}`} className="relative">
                                                <label className="block text-xs font-bold text-yellow-700 uppercase mb-1 ml-1">Period {i+1}</label>
                                                <input 
                                                    type="text"
                                                    value={scheduleB[i]}
                                                    onChange={(e) => updateSchedule('B', i, e.target.value)}
                                                    placeholder="Class Name"
                                                    className="w-full p-3 text-base font-medium text-gray-800 bg-white border border-falcon-gold/30 rounded-lg focus:ring-2 focus:ring-falcon-gold focus:border-transparent outline-none transition-all placeholder-gray-400"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                         </div>
                     )}

                     {activeTab === 'spotify' && (
                         <div className="space-y-4 max-w-md mx-auto text-center">
                             <div className="text-sm text-gray-600">
                                 Connect Spotify to enable focus mixes and playback controls.
                             </div>
                             <div className="flex flex-col gap-3">
                                 <button
                                     onClick={async () => {
                                         const url = await getSpotifyLoginUrl();
                                         window.location.href = url;
                                     }}
                                     className="w-full py-3 bg-[#1DB954] text-black font-bold rounded-xl hover:brightness-110 transition"
                                 >
                                     Connect Spotify
                                 </button>
                                 <button
                                     onClick={() => clearSpotifyAuth()}
                                     className="w-full py-3 border border-gray-300 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition"
                                 >
                                     Disconnect Spotify
                                 </button>
                             </div>
                         </div>
                     )}

                     {/* Save Button (Always visible if User is logged in) */}
                     <div className="mt-6 pt-4 border-t border-gray-100">
                        <button 
                            onClick={handleSave}
                            disabled={isSaving || !name}
                            className="w-full py-3 bg-falcon-green text-white rounded-lg font-bold hover:bg-falcon-dark transition-all disabled:opacity-50 shadow-md hover:shadow-lg hover:scale-[1.01]"
                        >
                            {isSaving ? "Saving..." : "Save Settings"}
                        </button>
                     </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;