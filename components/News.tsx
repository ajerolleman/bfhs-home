
import React, { useState } from 'react';
import { createPortal } from 'react-dom';

const News: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const docLink = "https://docs.google.com/document/d/1uLdRk51xU0XCTGEGpVQC1pVXBTzxNtZQgw_3_eB5-Q0/preview";

  return (
    <div className="w-full max-w-4xl mx-auto">
        <div className="oled-card rounded-xl p-6 flex flex-col md:flex-row items-center gap-6 group">
            {/* Visual Thumbnail */}
            <div className="shrink-0 w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 shadow-sm group-hover:scale-105 transition-transform duration-300 ease-spring">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
            </div>

            {/* Content */}
            <div className="flex-1 text-center md:text-left">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1 font-header uppercase tracking-wide transition-colors">Daily Bulletin</h2>
                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed transition-colors">
                    View official announcements, club meetings, and important updates for today.
                </p>
            </div>

            {/* Action */}
            <button 
                onClick={() => setIsModalOpen(true)}
                className="magnetic-btn shrink-0 inline-flex items-center space-x-2 bg-falcon-green dark:bg-falcon-gold dark:text-black text-white px-5 py-2.5 rounded-lg font-medium hover:bg-falcon-dark dark:hover:bg-yellow-400 transition-all duration-300 shadow-sm hover:shadow-lg hover:shadow-falcon-green/20 dark:hover:shadow-falcon-gold/20"
            >
                <span>View Bulletin</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            </button>
        </div>

        {/* Modal Overlay */}
        {isModalOpen && typeof document !== 'undefined' && createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                {/* Backdrop */}
                <div 
                    className="absolute inset-0 bg-black/85 backdrop-blur-lg transition-opacity animate-fade-in" 
                    onClick={() => setIsModalOpen(false)}
                ></div>
                
                {/* Modal Window */}
                <div className="relative bg-white dark:bg-gray-900 w-full max-w-5xl h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-fade-in-up border border-white/10">
                    
                    {/* Header */}
                    <div className="bg-[#1B3B2F] dark:bg-black px-4 py-3 flex justify-between items-center shrink-0 border-b border-falcon-gold/20 relative overflow-hidden">
                         <div className="absolute top-0 right-0 w-32 h-32 bg-falcon-gold/10 rounded-full blur-2xl pointer-events-none"></div>
                         <div className="flex items-center gap-3 relative z-10">
                            <div className="w-8 h-8 rounded bg-falcon-gold/10 flex items-center justify-center text-lg">📢</div>
                            <h3 className="text-white font-header text-lg uppercase tracking-wide">Daily Bulletin Preview</h3>
                         </div>
                         
                         <div className="flex items-center gap-3 relative z-10">
                            <a 
                                href={docLink} 
                                target="_blank" 
                                rel="noreferrer"
                                className="hidden md:inline-flex items-center gap-1 text-falcon-gold hover:text-white text-xs uppercase font-bold px-3 py-1.5 rounded hover:bg-white/10 transition-colors border border-transparent hover:border-falcon-gold/30"
                            >
                                Open in New Tab
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                            </a>
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                className="magnetic-btn text-white/50 hover:text-white hover:bg-red-500 rounded-lg p-1.5 transition-all duration-200"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                         </div>
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 w-full bg-gray-50 dark:bg-gray-900 relative">
                        {/* Thin Animated Line Loader */}
                        <div className="absolute inset-0 flex items-center justify-center z-0">
                             <div className="w-64 h-0.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                                 <div className="w-full h-full bg-falcon-green/60 dark:bg-falcon-gold/60 origin-left animate-loader-line"></div>
                             </div>
                        </div>
                        <iframe 
                            src={docLink} 
                            title="Daily Bulletin Preview"
                            className="absolute left-0 right-0 bottom-0 top-6 w-full h-full relative z-10"
                            style={{ border: 'none' }}
                        ></iframe>
                    </div>
                </div>
            </div>,
            document.body
        )}
    </div>
  );
};

export default News;
