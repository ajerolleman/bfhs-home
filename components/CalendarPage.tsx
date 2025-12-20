
import React, { useState } from 'react';
import ChatWidget from './ChatWidget';
import CustomCursor from './CustomCursor';
import Spotlight from './Spotlight';

const CalendarPage: React.FC = () => {
  const [fullPageChatOpen, setFullPageChatOpen] = useState(false);
  
  const upcomingEvents = [
    { title: "Career Day", date: "Oct 24", time: "All Day" },
    { title: "Semester Exams", date: "Dec 11-17", time: "8:00 AM" },
    { title: "Winter Break", date: "Dec 22", time: "No School" },
    { title: "Admissions Event", date: "Jan 15", time: "5:30 PM" },
    { title: "Athletics: Boys' Soccer", date: "Jan 18", time: "4:00 PM" },
  ];

  return (
    <div>
       <CustomCursor />
       <Spotlight />
       <div className="min-h-screen bg-[#F3F4F6] font-sans text-gray-800 relative overflow-x-hidden transition-colors duration-500">
          <div className="bg-noise fixed inset-0 z-[1]" />
          
          {/* Header */}
          <header className="relative z-30 bg-falcon-green text-white pt-6 pb-24 shadow-md transition-all duration-500">
            <div className="container mx-auto px-6 max-w-6xl">
                <div className="flex justify-between items-center mb-6">
                     <a href="/" className="text-white/70 hover:text-white flex items-center gap-2 text-sm font-bold uppercase tracking-wide transition-colors">
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                         Back to Dashboard
                     </a>
                </div>
                
                <div>
                    <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">BFHS Calendar</h1>
                    <p className="text-white/70 font-medium text-lg">School events, important dates, and athletics.</p>
                </div>
            </div>
          </header>

          {/* Main Content */}
          <div className="container mx-auto px-4 sm:px-6 max-w-6xl -mt-16 relative z-40 pb-20">
             <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                
                {/* Sidebar - Upcoming */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="oled-card rounded-2xl p-6 bg-white border border-gray-200">
                        <h3 className="font-header text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                           <span className="text-falcon-gold">📅</span> Upcoming
                        </h3>
                        <div className="space-y-4">
                           {upcomingEvents.map((evt, i) => (
                               <div key={i} className="flex gap-3 items-start p-3 rounded-lg bg-gray-50 border border-gray-100 hover:border-falcon-green/30 transition-colors">
                                   <div className="flex flex-col items-center justify-center bg-white rounded shadow-sm w-12 h-12 border border-gray-100 shrink-0">
                                       <span className="text-[10px] uppercase font-bold text-gray-500">{evt.date.split(' ')[0]}</span>
                                       <span className="text-lg font-bold text-falcon-green leading-none">{evt.date.split(' ')[1].replace('-','')}</span>
                                   </div>
                                   <div>
                                       <h4 className="font-bold text-sm text-gray-800 leading-tight mb-1">{evt.title}</h4>
                                       <span className="text-xs text-gray-500 font-mono bg-gray-100 px-1.5 py-0.5 rounded">{evt.time}</span>
                                   </div>
                               </div>
                           ))}
                        </div>
                    </div>
                </div>

                {/* Calendar Embed */}
                <div className="lg:col-span-3">
                    <div className="oled-card rounded-2xl overflow-hidden bg-white border-4 border-white shadow-xl h-[650px] lg:h-[900px] relative group">
                        {/* Fallback Message (Behind Iframe) */}
                         <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 z-0">
                            <span className="text-4xl mb-4 opacity-50">📅</span>
                            <h3 className="text-xl font-bold text-gray-500 mb-2">Calendar couldn't load here.</h3>
                            <p className="text-sm text-gray-400 mb-6">It might be blocked by your browser settings.</p>
                        </div>

                        <iframe 
                           src="https://www.bfhsla.org/calendar" 
                           title="BFHS Official Calendar"
                           className="absolute inset-0 w-full h-full z-10"
                           loading="lazy"
                           style={{ border: 0 }}
                        >
                        </iframe>
                        
                        {/* Overlay Action Bar */}
                        <div className="absolute bottom-6 right-6 z-20 pointer-events-none">
                            <a 
                                href="https://www.bfhsla.org/calendar" 
                                target="_blank" 
                                rel="noreferrer"
                                className="pointer-events-auto magnetic-btn flex items-center gap-2 bg-falcon-green text-white px-4 py-2 rounded-full font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all text-sm"
                            >
                                <span>Open in New Tab</span>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                            </a>
                        </div>
                    </div>
                </div>

             </div>
          </div>
          
          <ChatWidget 
            forceOpen={fullPageChatOpen} 
            onCloseFullPage={() => setFullPageChatOpen(false)} 
            showTrigger={true}
            triggerLabel="BFHS Help"
          />
       </div>
    </div>
  );
};

export default CalendarPage;
