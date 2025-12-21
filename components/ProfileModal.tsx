
import React, { useState, useEffect } from 'react';
import { UserProfile, MemoryNote } from '../types';
import { 
    saveUserProfile, 
    signInWithGoogle, 
    deleteMemoryNote, 
    getRecentMemoryNotes
} from '../services/firebase';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any; // Firebase User
  profile: UserProfile | null;
  onProfileUpdate: (p: UserProfile) => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, user, profile, onProfileUpdate }) => {
  const [name, setName] = useState(profile?.name || '');
  const [grade, setGrade] = useState(profile?.grade || '9th');
  const [allowMemory, setAllowMemory] = useState(profile?.allowMemory ?? true);
  const [activeTab, setActiveTab] = useState<'profile' | 'schedule' | 'memory'>('profile');
  const [notes, setNotes] = useState<MemoryNote[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  // Schedule State
  const [scheduleA, setScheduleA] = useState<string[]>(['', '', '', '']);
  const [scheduleB, setScheduleB] = useState<string[]>(['', '', '', '']);

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
    }
  }, [profile, user]);

  useEffect(() => {
    if (isOpen && activeTab === 'memory' && user && profile?.allowMemory) {
        getRecentMemoryNotes(user.uid, 20).then(setNotes);
    }
  }, [isOpen, activeTab, user, profile]);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    const newProfile = {
      uid: user.uid,
      name,
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
            <h2 className="text-white font-bold text-lg flex items-center gap-2">
                <span className="text-2xl">🦅</span> 
                {user ? "BFHS Help Settings" : "BFHS Student Login"}
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
                            Please sign in with your Google account to access the BFHS Student Portal.
                        </p>
                    </div>
                    
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
                             onClick={() => setActiveTab('memory')}
                             disabled={!allowMemory}
                             className={`flex-1 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'memory' ? 'border-falcon-green text-falcon-green' : 'border-transparent text-gray-500'} ${!allowMemory ? 'opacity-50 cursor-not-allowed' : 'hover:text-gray-700'}`}
                        >
                            Memory
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
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Grade Level</label>
                                <select 
                                    value={grade}
                                    onChange={(e) => setGrade(e.target.value)}
                                    className="w-full p-3 rounded-lg bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-falcon-green focus:outline-none"
                                >
                                    <option value="9th">9th Grade</option>
                                    <option value="10th">10th Grade</option>
                                    <option value="11th">11th Grade</option>
                                    <option value="12th">12th Grade</option>
                                    <option value="Faculty">Faculty</option>
                                </select>
                            </div>
                            
                            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100">
                                <div>
                                    <h4 className="font-bold text-sm text-blue-900">Allow Memory</h4>
                                    <p className="text-xs text-blue-800 opacity-80">BFHS Help can remember key details to help tutor you better.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={allowMemory} onChange={(e) => setAllowMemory(e.target.checked)} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-falcon-green"></div>
                                </label>
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

                     {activeTab === 'memory' && (
                         <div className="space-y-4">
                             <p className="text-xs text-gray-500">BFHS Help keeps up to 50 short notes. Oldest ones are deleted automatically.</p>
                             <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                                 {notes.length === 0 ? (
                                     <div className="text-center py-8 text-gray-400 text-sm">No memories saved yet.</div>
                                 ) : (
                                     notes.map(note => (
                                         <div key={note.id} className="group flex justify-between items-start p-3 bg-gray-50 rounded border border-gray-100">
                                             <p className="text-sm text-gray-800">{note.note}</p>
                                             <button 
                                                onClick={() => handleDeleteNote(note.id)}
                                                className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                                title="Delete memory"
                                             >
                                                 🗑️
                                             </button>
                                         </div>
                                     ))
                                 )}
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
