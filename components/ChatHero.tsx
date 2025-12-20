import React from 'react';

interface ChatHeroProps {
    onOpenChat: () => void;
    onPromptSelect?: (prompt: string) => void;
}

const ChatHero: React.FC<ChatHeroProps> = ({ onOpenChat, onPromptSelect }) => {
  const features = [
    { 
        icon: "😰", 
        label: "Stressed about a test?", 
        prompt: "I'm feeling really stressed about an upcoming test. What can I do to manage this anxiety?"
    },
    { 
        icon: "🧠", 
        label: "Tutoring Help", 
        prompt: "Can you help me understand a concept for my class?"
    },
    { 
        icon: "👕", 
        label: "Dress code", 
        prompt: "Can you explain the dress code policy?"
    },
    { 
        icon: "🤔", 
        label: "School Advice", 
        prompt: "I'm in a tough situation at school and need advice on what to do."
    }
  ];

  const handleCardClick = (prompt: string) => {
    onOpenChat();
    if (onPromptSelect) {
        setTimeout(() => onPromptSelect(prompt), 300);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto mb-10 mt-6 animate-fade-in-up">
      <div className="oled-card rounded-xl overflow-hidden transition-all duration-300">
        <div className="bg-gradient-to-r from-falcon-green to-[#142e25] dark:from-[#051a12] dark:to-[#0B1220] px-6 py-4 flex justify-between items-center relative overflow-hidden">
           {/* Header ambient glow */}
           <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
           
           <h2 className="text-white font-header text-xl uppercase tracking-wide flex items-center relative z-10">
             <span className="text-2xl mr-2">✨</span> Welcome to the Redesigned Startpage
           </h2>
           <span className="bg-white/10 border border-white/10 text-white text-[10px] px-2 py-1 rounded uppercase tracking-wider relative z-10 backdrop-blur-sm">AI Enabled</span>
        </div>
        
        <div className="p-6 md:p-8 flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1 text-center md:text-left">
                <p className="text-gray-700 dark:text-gray-200 text-lg mb-4 leading-relaxed transition-colors duration-300">
                    We've updated the visual design to be cleaner and more intuitive while keeping everything you need right here. 
                    <br/><br/>
                    <strong>Meet BFHS Help:</strong> Your new AI assistant and <strong>personal tutor</strong> is baked right in. Use it to find policies, manage stress, or get help understanding complex topics.
                    <span className="text-falcon-green dark:text-falcon-gold font-medium italic"> (It won't do your homework, but it will help you learn!)</span>
                </p>
                <button 
                    onClick={onOpenChat}
                    className="magnetic-btn inline-flex items-center px-6 py-2.5 bg-falcon-green hover:bg-falcon-dark dark:bg-falcon-gold dark:text-black dark:hover:bg-yellow-400 text-white font-bold rounded transition-all shadow-lg hover:shadow-falcon-green/30 dark:hover:shadow-falcon-gold/30 hover:scale-[1.02]"
                >
                    Chat with BFHS Help
                </button>
            </div>

            <div className="flex-1 w-full grid grid-cols-2 gap-3">
                {features.map((item, idx) => (
                    <button 
                        key={idx}
                        onClick={() => handleCardClick(item.prompt)}
                        className="magnetic-btn flex flex-col items-center justify-center p-4 bg-white/50 dark:bg-gray-800/40 hover:bg-white dark:hover:bg-gray-700 border border-gray-200 dark:border-white/5 hover:border-falcon-green/30 dark:hover:border-falcon-gold/30 rounded-lg shadow-sm hover:shadow-md transition-all group duration-300"
                    >
                        <span className="text-2xl mb-2 group-hover:scale-110 transition-transform duration-300 drop-shadow-sm">{item.icon}</span>
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300 text-center">{item.label}</span>
                    </button>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};

export default ChatHero;