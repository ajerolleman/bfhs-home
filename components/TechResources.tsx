
import React from 'react';

interface TechResourcesProps {
    isOpen: boolean;
    onClose: () => void;
}

const TechResources: React.FC<TechResourcesProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const resources = [
        {
            title: "WiFi Access",
            icon: "📶",
            content: "Connect to 'BFHS_Student'. Use your standard BFHS Google credentials to log in. If prompted for a certificate, select 'Do not validate'.",
            actionLabel: "View Map",
            actionUrl: "#"
        },
        {
            title: "Printing",
            icon: "🖨️",
            content: "Use PaperCut Mobility Print. Send documents to 'Library_Copier' or 'Lab_Printer'. Release jobs using your ID code at the station.",
            actionLabel: "PaperCut Login",
            actionUrl: "http://papercut.bfhsla.org:9191/user"
        },
        {
            title: "Chromebooks",
            icon: "💻",
            content: "Report damage immediately to the Library Help Desk. Do not attempt DIY repairs. Loaners are available for day-use only.",
            actionLabel: "Repair Form",
            actionUrl: "#"
        },
        {
            title: "PowerSchool",
            icon: "📊",
            content: "Student login requires your student ID number and the password set at the beginning of the year. Locked out? See Ms. Anderson.",
            actionLabel: "Reset Password",
            actionUrl: "#"
        },
        {
            title: "IT Support Site",
            icon: "🌐",
            content: "Visit the full BFHS Tech Support website for setup guides, FAQs, policy documents, and more resources.",
            actionLabel: "Visit Site",
            actionUrl: "https://sites.google.com/bfhsla.org/tech/home"
        }
    ];

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-fade-in">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative z-10 flex flex-col">
                
                {/* Header */}
                <div className="bg-falcon-green dark:bg-black px-6 py-4 flex justify-between items-center shrink-0">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-xl">🛠️</div>
                        <div>
                            <h2 className="text-white text-xl font-bold uppercase tracking-wide">Technology Resources</h2>
                            <p className="text-white/60 text-xs">BFHS IT DEPARTMENT</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Grid */}
                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 dark:bg-black/50">
                    {resources.map((res, idx) => (
                        <div key={idx} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between mb-4">
                                <span className="text-4xl">{res.icon}</span>
                                <a href={res.actionUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-falcon-green dark:text-falcon-gold hover:underline uppercase tracking-wider">
                                    {res.actionLabel} ↗
                                </a>
                            </div>
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">{res.title}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{res.content}</p>
                        </div>
                    ))}
                    
                    {/* Direct Help Contact */}
                    <div className="col-span-1 md:col-span-2 bg-[#12261E] dark:bg-black/80 rounded-xl p-6 text-white flex flex-col md:flex-row items-center justify-between border border-white/5">
                        <div className="mb-4 md:mb-0">
                            <h3 className="font-bold text-lg text-falcon-gold mb-1">Still need help?</h3>
                            <p className="text-sm text-white/80">The IT Help Desk is located in the Library Media Center.</p>
                        </div>
                        <a href="mailto:help@bfhsla.org" className="px-6 py-3 bg-white text-falcon-green font-bold rounded-lg hover:bg-falcon-gold hover:text-black transition-colors">
                            Email help@bfhsla.org
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TechResources;
