
import React, { useState, useEffect, useRef } from 'react';
import ChatWidget from './ChatWidget';
import Spotlight from './Spotlight';
import CustomCursor from './CustomCursor';

type Tab = 'home' | 'password' | 'wifi' | 'printing' | 'chromebook';

const TechInfoPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [fullPageChatOpen, setFullPageChatOpen] = useState(false);
  const [initialPrompt, setInitialPrompt] = useState('');
  
  const PRINT_LINKS: Record<string, string> = {
    chromebook: "https://docs.google.com/presentation/d/1plc-sXq8hjStiPA3DPGMNIidi6ztTYd9B15mPHVtAf8/present",
    windows: "https://docs.google.com/presentation/d/14KphpEJUno3s0dNFoe-LpzjWBJRBKCcx_4FzXkkVQbs/present",
    mac: "https://docs.google.com/presentation/d/1uGe620PrgO9hXH-SiX0QOK9z3FPBmUc3Qz8hf_Dm5WE/present",
    iphone: "https://docs.google.com/presentation/d/1jOQ3S2i0mG9WC867uoLoP3o-dm4vcpWEMbqkecOnbB4/present",
    android: "https://docs.google.com/presentation/d/1dvbpBI8AjxjoRUR2HpSg65J55CuldXB7i59XxNGht_s/present"
  };

  const CHROMEBOOK_DOC = "https://docs.google.com/document/d/1mkrtRwUMHKayZysqyQ__glfnnh_3vYY-2RnT4xXn6-U/edit?usp=sharing";

  // WiFi Data extracted from PDFs
  const wifiData = {
    globalNotices: [
      { type: "info", title: "Credentials", body: "Always use your full school email (@bfhsla.org) and your standard Gmail password." },
      { type: "tip", title: "Forget Network", body: "If you have trouble connecting, try 'forgetting' the network and reconnecting from scratch." },
      { type: "warning", title: "Certificate", body: "If prompted to trust a certificate (bf-dc5.bfhs.org), please accept/trust it." }
    ],
    tabs: [
      {
        tabId: "android",
        tabLabel: "Android",
        steps: [
          { stepNumber: 1, title: "Settings", instruction: "Open the Settings app and select Connections -> Wi-Fi." },
          { stepNumber: 2, title: "Select Network", instruction: "Tap 'BFHS Wifi'." },
          { stepNumber: 3, title: "EAP Method", instruction: "Select 'PEAP'." },
          { stepNumber: 4, title: "Phase 2 Auth", instruction: "Select 'MSCHAPV2'." },
          { stepNumber: 5, title: "CA Certificate", instruction: "Select 'Use system certificates'." },
          { stepNumber: 6, title: "Online Cert Status", instruction: "Select 'Do not validate' (if option exists)." },
          { stepNumber: 7, title: "Domain", instruction: "Enter 'bfhs.org'." },
          { stepNumber: 8, title: "Identity", instruction: "Enter your full school email (e.g., meyer@bfhsla.org)." },
          { stepNumber: 9, title: "Password", instruction: "Enter your Gmail password." },
          { stepNumber: 10, title: "Connect", instruction: "Tap 'Save' to finish connecting." }
        ]
      },
      {
        tabId: "iphone",
        tabLabel: "iPhone",
        steps: [
          { stepNumber: 1, title: "Settings", instruction: "Open the Settings app and go to Wi-Fi settings." },
          { stepNumber: 2, title: "Select Network", instruction: "Choose 'BFHS Wifi'." },
          { stepNumber: 3, title: "Credentials", instruction: "Username: Your school email. Password: Your Gmail password." },
          { stepNumber: 4, title: "Join", instruction: "Tap 'Join' to authenticate." },
          { stepNumber: 5, title: "Trust Certificate", instruction: "Click 'Trust' in the top right to finish connecting." }
        ]
      },
      {
        tabId: "mac",
        tabLabel: "Mac OS",
        steps: [
          { stepNumber: 1, title: "Select Network", instruction: "Click the internet icon in top right of your desktop. Choose 'BFHS Wifi'." },
          { stepNumber: 2, title: "Credentials", instruction: "Username: Your school email. Password: Your Gmail password. Click 'Join'." },
          { stepNumber: 3, title: "Verify Certificate", instruction: "Click 'Continue' to allow the device to talk to our wifi." },
          { stepNumber: 4, title: "Authorize Changes", instruction: "You are making changes to your Certificate Trust Settings. Enter your Macbook's user and password (not school credentials) and click 'Update Settings'." }
        ]
      },
      {
        tabId: "windows",
        tabLabel: "Windows",
        steps: [
          { stepNumber: 1, title: "Select Network", instruction: "Click the internet icon in bottom right. Choose 'BFHS Wifi'. Check 'Connect automatically' and hit Connect." },
          { stepNumber: 2, title: "Credentials", instruction: "Username: Your school email. Password: Your Gmail password. Hit OK." },
          { stepNumber: 3, title: "Certificate", instruction: "If asked 'Continue connecting?' (Show certificate details), click 'Connect'." }
        ]
      },
      {
        tabId: "chromeos",
        tabLabel: "Chrome OS",
        steps: [
          { stepNumber: 1, title: "Select Network", instruction: "Click bottom right corner -> WiFi icon. Choose 'BFHS Wifi'." },
          { stepNumber: 2, title: "EAP Method", instruction: "Select 'PEAP'." },
          { stepNumber: 3, title: "EAP Phase 2", instruction: "Select 'MSCHAPv2'." },
          { stepNumber: 4, title: "Server CA Cert", instruction: "Select 'Do not check'." },
          { stepNumber: 5, title: "Credentials", instruction: "Identity: Your school email. Password: Your Gmail password." },
          { stepNumber: 6, title: "Connect", instruction: "Hit 'Connect' to finish connecting." }
        ]
      }
    ]
  };

  // Printing Data Structure
  const printingData = {
    pageTitle: "How to Print",
    subtitle: "We use PaperCut Mobility Print. Install once, then print from anywhere on campus.",
    globalNotices: [
      { type: "info", title: "Network Requirement", body: "You must be connected to BFHS Wifi before printing." },
      { type: "info", title: "Printing Costs", body: "Color: $0.10/page | B&W: $0.01/page" },
      { type: "warning", title: "Confirmation", body: "You will receive an email from scan@bfhsla.org. If no email arrives, the job failed." },
      { type: "tip", title: "Pickup", body: "Go to the library release station, enter school email/password, and select 'release'." }
    ],
    tabs: [
      {
        tabId: "chromebook",
        tabLabel: "Chromebook",
        sections: [
          {
            sectionId: "setup",
            sectionTitle: "Setup & Install",
            steps: [
              { stepNumber: 1, title: "Check Wifi", instruction: "Make sure you’re on the BFHS Wifi." },
              { stepNumber: 2, title: "Open Mobility Print", instruction: "Click the link below to open Mobility Print in a new tab.", link: "chrome://os-settings/osPrinting" },
              { stepNumber: 3, title: "Add App", instruction: "Select “Add to Chrome”." },
              { stepNumber: 4, title: "Confirm Add", instruction: "Select “Add app”." },
              { stepNumber: 5, title: "Success", instruction: "Confirmation notification that the app was added successfully." }
            ]
          },
          {
            sectionId: "print",
            sectionTitle: "How to Print",
            steps: [
              { stepNumber: 6, title: "Open Document", instruction: "Go to the document you want to print." },
              { stepNumber: 7, title: "Printer Options", instruction: "Select “see more”." },
              { stepNumber: 8, title: "Select Printer", instruction: "Select the printer you need (Color $0.10 or B&W $0.01)." },
              { stepNumber: 9, title: "Print", instruction: "Make sure the correct printer is selected then click print." },
              { stepNumber: 10, title: "Login", instruction: "Log in with your school email and password." }
            ]
          },
          {
            sectionId: "after",
            sectionTitle: "A few notes before you’re ready to print",
            steps: [
              { stepNumber: 11, title: "Ready", instruction: "You can now print from any program; if you don’t see correct printer select “see more…”" },
              { stepNumber: 12, title: "Check Email", instruction: "Confirmation email from scan@bfhsla.org; if no email, job unsuccessful; double check steps and try again." },
              { stepNumber: 13, title: "Release Station", instruction: "If you got the email, go to print release station in library." },
              { stepNumber: 14, title: "Final Step", instruction: "Enter school email and password and select “release”. Your document will now print!" }
            ]
          }
        ]
      },
      {
        tabId: "windows",
        tabLabel: "Windows",
        sections: [
          {
            sectionId: "setup",
            sectionTitle: "Setup & Install",
            steps: [
              { stepNumber: 1, title: "Check Wifi", instruction: "Make sure you’re on the BFHS Wifi." },
              { stepNumber: 2, title: "Download", instruction: "Download Mobility Print Program.", link: "https://papercut.bfhsla.org:9164/setup" },
              { stepNumber: 3, title: "Run Installer", instruction: "It’ll download a file in the corner. Click it!" },
              { stepNumber: 4, title: "Follow Prompts", instruction: "Now just follow the prompts." },
              { stepNumber: 5, title: "Agreement", instruction: "Select “I accept the agreement.”" },
              { stepNumber: 6, title: "Select Printers", instruction: "Select both library printers to add (Color & B&W)." },
              { stepNumber: 7, title: "Login", instruction: "Log in with your school email and password." }
            ]
          },
          {
            sectionId: "print_after",
            sectionTitle: "A few notes before you’re ready to print",
            steps: [
              { stepNumber: 8, title: "Ready", instruction: "You can now print from any program; if you don’t see correct printer select “see more…”" },
              { stepNumber: 9, title: "Select Printer", instruction: "Now you can select the one you need." },
              { stepNumber: 10, title: "Check Email", instruction: "Confirmation email from scan@bfhsla.org; if no email, unsuccessful; retry steps." },
              { stepNumber: 11, title: "Release Station", instruction: "If you got the email, go to print release station in library." },
              { stepNumber: 12, title: "Final Step", instruction: "Enter school email and password and select “release”. Your document will now print!" }
            ]
          }
        ]
      },
      {
        tabId: "mac",
        tabLabel: "Mac",
        sections: [
          {
            sectionId: "setup",
            sectionTitle: "Setup & Install",
            steps: [
              { stepNumber: 1, title: "Check Wifi", instruction: "Make sure you’re on the BFHS Wifi." },
              { stepNumber: 2, title: "System Preferences", instruction: "Go to System Preferences." },
              { stepNumber: 3, title: "Printers", instruction: "Select Printers & Scanners." },
              { stepNumber: 4, title: "Add Printer", instruction: "Select the “+” to add a printer." },
              { stepNumber: 5, title: "Select Printer", instruction: "Select the printer you would like to add (Color or B&W)." },
              { stepNumber: 6, title: "Add Second", instruction: "Follow the previous steps to add the other library printer." },
              { stepNumber: 7, title: "Verify", instruction: "Show what they look like when added correctly." }
            ]
          },
          {
            sectionId: "print",
            sectionTitle: "How to Print",
            steps: [
              { stepNumber: 8, title: "Print Doc", instruction: "Go to the document you would like to print." },
              { stepNumber: 9, title: "Login", instruction: "Log in with your SCHOOL email and password." },
              { stepNumber: 10, title: "Success", instruction: "If it says “Accepting” your print was successful." }
            ]
          },
          {
            sectionId: "troubleshooting",
            sectionTitle: "Troubleshooting",
            steps: [
              { stepNumber: 11, title: "Bounce Icon", instruction: "If it wasn’t successful the printer icon will jump up; likely wrong login info." },
              { stepNumber: 12, title: "Open Queue", instruction: "Select the printer icon to open the print queue." },
              { stepNumber: 13, title: "Refresh", instruction: "Hit the refresh button." },
              { stepNumber: 14, title: "Re-Login", instruction: "Log in with your SCHOOL username and password NOT your computer login info." }
            ]
          },
          {
            sectionId: "after",
            sectionTitle: "A few notes before you’re ready to print",
            steps: [
              { stepNumber: 15, title: "Ready", instruction: "You can now print from any program; if you don’t see correct printer select “see more…”" },
              { stepNumber: 16, title: "Select", instruction: "Now you can select the one you need." },
              { stepNumber: 17, title: "Check Email", instruction: "Confirmation email from scan@bfhsla.org; if no email, unsuccessful; retry steps." },
              { stepNumber: 18, title: "Release Station", instruction: "If you got the email, go to print release station in library." },
              { stepNumber: 19, title: "Final Step", instruction: "Enter school email and password and select “release”. Your document will now print!" }
            ]
          }
        ]
      },
      {
        tabId: "iphone",
        tabLabel: "iPhone",
        sections: [
          {
            sectionId: "print",
            sectionTitle: "How to Print",
            steps: [
              { stepNumber: 1, title: "Check Wifi", instruction: "Make sure you’re on the BFHS Wifi." },
              { stepNumber: 2, title: "Share", instruction: "Go to the file you want to print and press share." },
              { stepNumber: 3, title: "Print Option", instruction: "Press print." },
              { stepNumber: 4, title: "Printer Tab", instruction: "Press on the printer tab." },
              { stepNumber: 5, title: "Select", instruction: "Select the printer you want (Color or B&W)." },
              { stepNumber: 6, title: "Login", instruction: "Use your school email and password to log in." },
              { stepNumber: 7, title: "Success", instruction: "Now you are able to print." },
              { stepNumber: 8, title: "Pickup", instruction: "Go to the library to pick up your document." },
              { stepNumber: 9, title: "Final Step", instruction: "Enter school email and password and select “release”. Your document will now print!" }
            ]
          }
        ]
      },
      {
        tabId: "android",
        tabLabel: "Android",
        sections: [
          {
            sectionId: "setup",
            sectionTitle: "Setup & Install",
            steps: [
              { stepNumber: 1, title: "Check Wifi", instruction: "Make sure you’re on the BFHS Wifi." },
              { stepNumber: 2, title: "Play Store", instruction: "Go to the Google Play Store and search for “Mobility Print”." },
              { stepNumber: 3, title: "Install", instruction: "Install Mobility Print." },
              { stepNumber: 4, title: "Open App", instruction: "Open Mobility Print once it’s done installing." },
              { stepNumber: 5, title: "Permissions", instruction: "Tap to give Mobility Print needed permissions to run." },
              { stepNumber: 6, title: "Toggle On", instruction: "Make sure all of these are set to “On”." }
            ]
          },
          {
            sectionId: "print",
            sectionTitle: "How to Print",
            steps: [
              { stepNumber: 7, title: "Options", instruction: "Go to the document you want to print and tap the three “…” in the corner." },
              { stepNumber: 8, title: "Share", instruction: "Tap “Share & Export”." },
              { stepNumber: 9, title: "Print", instruction: "Under “Share & Export” tap “Print”." },
              { stepNumber: 10, title: "Select Printer", instruction: "Mobility Print will open; tap the down arrow to find the correct printer." },
              { stepNumber: 11, title: "Choose", instruction: "Select either the color printer ($0.10 per page) or black and white printer ($0.01 per page)." },
              { stepNumber: 12, title: "Execute", instruction: "Once you select the printer you need, press the print icon." },
              { stepNumber: 13, title: "Confirm", instruction: "It’ll open a prompt; tap “OK”." }
            ]
          },
          {
            sectionId: "login_success",
            sectionTitle: "Login + Success",
            steps: [
              { stepNumber: 14, title: "Notification", instruction: "Notification pops up; press it to log in to Mobility Print." },
              { stepNumber: 15, title: "Login", instruction: "Log in with your school email and password." },
              { stepNumber: 16, title: "Google Option", instruction: "You can also press “Log in with Google” and select your school email." },
              { stepNumber: 17, title: "Confirm", instruction: "You’ll receive a notification when your print was successful." },
              { stepNumber: 18, title: "Pickup", instruction: "Go to the library to pick up your document." },
              { stepNumber: 19, title: "Final Step", instruction: "Enter school email and password and select “release”. Your document will now print!" }
            ]
          }
        ]
      }
    ]
  };

  const handleBackToDashboard = () => {
    window.location.href = "/";
  };

  // Components
  const ActionButton = ({ icon, label, onClick }: any) => (
    <button onClick={onClick} className="flex flex-col items-center justify-center p-4 rounded-xl bg-white border border-gray-200 shadow-sm hover:shadow-md hover:border-falcon-green/30 transition-all group cursor-pointer h-full">
        <span className="text-2xl mb-2 group-hover:scale-110 transition-transform">{icon}</span>
        <span className="text-xs font-bold text-gray-700 text-center">{label}</span>
    </button>
  );

  const SectionCard = ({ icon, title, subtitle, children, action }: any) => (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.06)] hover:shadow-lg hover:border-falcon-green/20 transition-all duration-300 overflow-hidden group">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-falcon-green/10 text-falcon-green flex items-center justify-center text-lg">
                    {icon}
                </div>
                <div>
                    <h2 className="font-bold text-gray-900 text-base leading-tight">{title}</h2>
                    {subtitle && <p className="text-xs text-gray-500 font-medium">{subtitle}</p>}
                </div>
            </div>
            {action}
        </div>
        <div className="p-6">
            {children}
        </div>
    </div>
  );

  // Sub-Views
  const HomeView = () => (
    <div className="space-y-8 animate-fade-in-up">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
             <ActionButton icon="🔑" label="Password Change" onClick={() => setActiveTab('password')} />
             <ActionButton icon="📶" label="Connect to WiFi" onClick={() => setActiveTab('wifi')} />
             <ActionButton icon="🖨️" label="How to Print" onClick={() => setActiveTab('printing')} />
             <ActionButton icon="💻" label="1:1 Program" onClick={() => setActiveTab('chromebook')} />
             <a href="mailto:help@bfhsla.org" className="flex flex-col items-center justify-center p-4 rounded-xl bg-white border border-gray-200 shadow-sm hover:shadow-md hover:border-falcon-green/30 transition-all group cursor-pointer h-full">
                <span className="text-2xl mb-2 group-hover:scale-110 transition-transform">✉️</span>
                <span className="text-xs font-bold text-gray-700 text-center">Email IT</span>
             </a>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <SectionCard 
                icon="🔑" 
                title="Password Change" 
                subtitle="Requirements & Reset"
                action={<button onClick={() => setActiveTab('password')} className="text-xs font-bold text-falcon-green hover:underline">Details ↗</button>}
             >
                <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
                    <li>Must be at least 14 characters long.</li>
                    <li>We recommend a passphrase (e.g., "IloveBenFranklinHighSchool!").</li>
                    <li>Must include uppercase, lowercase, numbers, and symbols.</li>
                </ul>
             </SectionCard>

             <SectionCard 
                icon="📶" 
                title="WiFi Connection" 
                subtitle="BFHS_Student Network"
                action={<button onClick={() => setActiveTab('wifi')} className="text-xs font-bold text-falcon-green hover:underline">Setup ↗</button>}
             >
                <p className="text-sm text-gray-600 mb-2">Connect your personal devices to our secure network.</p>
                <div className="flex gap-2 mt-2 overflow-hidden opacity-50">
                    {['💻','📱','🍎','🤖'].map((icon, i) => <span key={i} className="text-lg grayscale">{icon}</span>)}
                </div>
             </SectionCard>

             <SectionCard 
                icon="🖨️" 
                title="Printing" 
                subtitle="PaperCut Mobility Print"
                action={<button onClick={() => setActiveTab('printing')} className="text-xs font-bold text-falcon-green hover:underline">Setup ↗</button>}
             >
                <p className="text-sm text-gray-600 mb-2">
                    Print from any device. Pick up at Library or Labs.
                </p>
                <div className="bg-yellow-50 p-2 rounded text-xs text-yellow-800 border border-yellow-100">
                    <strong>Cost:</strong> $0.10 B&W / $0.25 Color
                </div>
             </SectionCard>

             <SectionCard 
                icon="💻" 
                title="1:1 Chromebook Program" 
                subtitle="Policies & Documentation"
                action={<button onClick={() => setActiveTab('chromebook')} className="text-xs font-bold text-falcon-green hover:underline">View Doc ↗</button>}
             >
                 <p className="text-sm text-gray-600">
                    Information regarding device issuance, acceptable use, damage protocols, and optional insurance coverage.
                 </p>
             </SectionCard>
        </div>
    </div>
  );

  const PasswordView = () => (
      <div className="animate-fade-in-up space-y-6">
          <SectionCard icon="🔑" title="Change Your Password" subtitle="System-wide credentials">
              <div className="space-y-6">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                      <h4 className="font-bold text-blue-900 mb-2">Instructions</h4>
                      <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
                          <li>Click the button below to open the Microsoft portal.</li>
                          <li>Log in with your current school email and password.</li>
                          <li>Select "Change Password".</li>
                      </ol>
                  </div>
                  
                  <div>
                      <h4 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wide">Requirements</h4>
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                          <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Minimum 14 characters</li>
                          <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Uppercase Letter (A-Z)</li>
                          <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Lowercase Letter (a-z)</li>
                          <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Number (0-9)</li>
                          <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Symbol (!@#$%^&*)</li>
                          <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Cannot contain your name</li>
                      </ul>
                  </div>

                  <div className="pt-4 border-t border-gray-100 flex justify-center">
                      <a href="https://passwordreset.microsoftonline.com/" target="_blank" rel="noreferrer" className="magnetic-btn bg-falcon-green text-white px-8 py-3 rounded-lg font-bold hover:bg-falcon-dark transition-all shadow-lg hover:shadow-falcon-green/20">
                          Change Password Portal ↗
                      </a>
                  </div>
              </div>
          </SectionCard>
      </div>
  );

  const WifiView = () => {
    const [selectedDevice, setSelectedDevice] = useState("iphone");

    return (
       <div className="animate-fade-in-up space-y-8 pb-12">
           <div className="text-center max-w-2xl mx-auto mb-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect to BFHS WiFi</h2>
              <p className="text-gray-500">Select your device below for step-by-step instructions to connect to <strong>BFHS_Student</strong> or <strong>BFHS Wifi</strong>.</p>
          </div>

          {/* Global Notices */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {wifiData.globalNotices.map((notice, idx) => (
                <div key={idx} className={`p-4 rounded-xl border flex gap-3 ${
                    notice.type === 'tip' ? 'bg-green-50 border-green-100 text-green-900' :
                    notice.type === 'warning' ? 'bg-yellow-50 border-yellow-100 text-yellow-900' :
                    'bg-blue-50 border-blue-100 text-blue-900'
                }`}>
                    <div className="text-xl">
                        {notice.type === 'tip' ? '💡' : notice.type === 'warning' ? '⚠️' : 'ℹ️'}
                    </div>
                    <div>
                        <h4 className="font-bold text-sm uppercase mb-1 opacity-80">{notice.title}</h4>
                        <p className="text-sm font-medium leading-snug">{notice.body}</p>
                    </div>
                </div>
            ))}
           </div>

           {/* Device Tabs */}
           <div className="flex flex-wrap justify-center gap-2">
            {wifiData.tabs.map((tab) => (
                <button
                    key={tab.tabId}
                    onClick={() => setSelectedDevice(tab.tabId)}
                    className={`px-5 py-2.5 rounded-full font-bold text-sm transition-all ${
                        selectedDevice === tab.tabId
                        ? 'bg-falcon-green text-white shadow-lg scale-105'
                        : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                >
                    {tab.tabLabel}
                </button>
            ))}
           </div>

           {/* Steps Content */}
           <div className="space-y-4 max-w-3xl mx-auto">
                {wifiData.tabs.find(t => t.tabId === selectedDevice)?.steps.map((step, idx) => (
                    <div key={idx} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex gap-4 items-start transition-colors">
                        <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 bg-falcon-green/10 text-falcon-green font-bold rounded-full text-sm">
                            {step.stepNumber}
                        </span>
                        <div>
                            <h4 className="text-base font-bold text-gray-900 mb-1">{step.title}</h4>
                            <p className="text-sm text-gray-600 leading-relaxed">{step.instruction}</p>
                        </div>
                    </div>
                ))}
           </div>
       </div>
    );
  };

  const PrintingView = () => {
    const [selectedDevice, setSelectedDevice] = useState("chromebook");

    return (
      <div className="animate-fade-in-up space-y-8 pb-20">
         {/* Global Notices */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {printingData.globalNotices.map((notice, idx) => (
                <div key={idx} className={`p-4 rounded-xl border flex gap-3 ${
                    notice.type === 'warning' ? 'bg-red-50 border-red-100 text-red-900' :
                    notice.type === 'tip' ? 'bg-green-50 border-green-100 text-green-900' :
                    'bg-blue-50 border-blue-100 text-blue-900'
                }`}>
                    <div className="text-xl">
                        {notice.type === 'warning' ? '⚠️' : notice.type === 'tip' ? '💡' : 'ℹ️'}
                    </div>
                    <div>
                        <h4 className="font-bold text-sm uppercase mb-1 opacity-80">{notice.title}</h4>
                        <p className="text-sm font-medium leading-snug">{notice.body}</p>
                    </div>
                </div>
            ))}
         </div>

         {/* Device Tabs */}
         <div className="flex flex-wrap justify-center gap-2">
            {printingData.tabs.map((tab) => (
                <button
                    key={tab.tabId}
                    onClick={() => setSelectedDevice(tab.tabId)}
                    className={`px-5 py-2.5 rounded-full font-bold text-sm transition-all ${
                        selectedDevice === tab.tabId
                        ? 'bg-falcon-green text-white shadow-lg scale-105'
                        : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                >
                    {tab.tabLabel}
                </button>
            ))}
         </div>

         {/* Link to Slides */}
         <div className="text-center">
             <a 
                href={PRINT_LINKS[selectedDevice]}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-falcon-green font-bold text-sm bg-falcon-green/10 px-4 py-2 rounded-lg hover:bg-falcon-green/20 transition-colors"
             >
                 <span>View Official Visual Guide (Slides)</span>
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
             </a>
         </div>

         {/* Content Area */}
         <div className="space-y-12">
            {printingData.tabs.find(t => t.tabId === selectedDevice)?.sections.map((section, sIdx) => (
                <div key={sIdx} className="space-y-6">
                    <h3 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-4">
                        {section.sectionTitle}
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                        {section.steps.map((step, idx) => (
                            <div key={idx} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex flex-col md:flex-row gap-6 items-start hover:border-falcon-green/30 transition-colors">
                                <div className="flex-1 space-y-2">
                                    <span className="inline-block px-2.5 py-1 bg-gray-100 text-gray-500 text-xs font-black rounded uppercase tracking-wider">
                                        Step {step.stepNumber}
                                    </span>
                                    <h4 className="text-lg font-bold text-gray-900">{step.title}</h4>
                                    <p className="text-gray-600 leading-relaxed">{step.instruction}</p>
                                    {/* @ts-ignore */}
                                    {step.link && (
                                         /* @ts-ignore */
                                        <a href={step.link} target="_blank" rel="noreferrer" className="inline-block mt-2 text-falcon-green font-bold text-sm hover:underline">
                                            Open Link ↗
                                        </a>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
         </div>
      </div>
    );
  };

  const ChromebookView = () => (
      <div className="animate-fade-in-up space-y-8 pb-12">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto">
              <div className="inline-block p-4 rounded-full bg-blue-50 text-blue-600 mb-6 text-4xl shadow-sm">
                  💻
              </div>
              <h2 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">1:1 Chromebook Program</h2>
              <p className="text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto">
                  Providing a reliable, school-managed device to ensure an equitable educational environment for all students.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gray-100 text-sm font-semibold text-gray-600 border border-gray-200">
                  <span>ASUS Chromebook CR1104</span>
                  <span className="w-1 h-1 rounded-full bg-gray-400"></span>
                  <span>2025-2026</span>
              </div>
          </div>

          {/* Key Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                  <div className="text-falcon-green text-2xl mb-2">💰</div>
                  <h3 className="font-bold text-gray-900 mb-1">Annual Tech Fee</h3>
                  <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-gray-900">$100</span>
                      <span className="text-sm text-gray-500">/year</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Covers portion of cost. Fee waivers available.</p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                  <div className="text-falcon-green text-2xl mb-2">🎓</div>
                  <h3 className="font-bold text-gray-900 mb-1">Upon Graduation</h3>
                  <p className="text-sm text-gray-600 leading-snug">
                      After 4 successful years, you may <strong>keep the device</strong>. IT removes management software for personal use.
                  </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                  <div className="text-falcon-green text-2xl mb-2">🛡️</div>
                  <h3 className="font-bold text-gray-900 mb-1">Safety & Privacy</h3>
                  <p className="text-sm text-gray-600 leading-snug">
                      CIPA-compliant internet filtering is active 24/7, even at home. No expectation of privacy on school devices.
                  </p>
              </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Fees & Policies */}
              <div className="lg:col-span-2 space-y-6">
                  {/* Fees Card */}
                  <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                       <div className="px-6 py-4 border-b border-gray-100 bg-red-50/50 flex items-center justify-between">
                           <h3 className="font-bold text-gray-900 flex items-center gap-2">
                               <span className="text-red-500">⚠️</span> Lost & Damaged Fees
                           </h3>
                           <span className="text-xs font-bold uppercase tracking-wider text-red-600">Full Cost to Student</span>
                       </div>
                       <div className="p-6">
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                               {[
                                   { label: "Screen Replacement", price: "$100" },
                                   { label: "Charger Replacement", price: "$40" },
                                   { label: "Keyboard/Touchpad", price: "up to $129" },
                                   { label: "Full Unit Replacement", price: "up to $400" }
                               ].map((item, i) => (
                                   <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                                       <span className="text-sm font-medium text-gray-700">{item.label}</span>
                                       <span className="font-mono font-bold text-gray-900">{item.price}</span>
                                   </div>
                               ))}
                           </div>
                           <p className="text-xs text-gray-400 mt-4 italic text-center">
                               *Prices subject to change based on market rates. Do not attempt DIY repairs.
                           </p>
                       </div>
                  </div>

                  {/* FAQ Accordion Style List */}
                  <div className="space-y-4">
                      <SectionCard icon="🎒" title="Daily Expectations" subtitle="Being Ready to Learn">
                          <div className="space-y-4 text-sm text-gray-600">
                              <div className="flex gap-3">
                                  <div className="mt-0.5 text-green-500">✓</div>
                                  <div>
                                      <strong>Bring it fully charged.</strong>
                                      <p className="text-xs text-gray-500 mt-0.5">IT does NOT loan chargers. We have two no-cost charging lockers on campus available for use.</p>
                                  </div>
                              </div>
                              <div className="flex gap-3">
                                  <div className="mt-0.5 text-blue-500">ℹ</div>
                                  <div>
                                      <strong>Forgot your device?</strong>
                                      <p className="text-xs text-gray-500 mt-0.5">Check out a loaner for the day from the IT Department. Must be returned promptly.</p>
                                  </div>
                              </div>
                              <div className="flex gap-3">
                                  <div className="mt-0.5 text-orange-500">✕</div>
                                  <div>
                                      <strong>No Opt-Outs.</strong>
                                      <p className="text-xs text-gray-500 mt-0.5">School-issued devices are required for testing and coursework. Personal devices allowed only at teacher discretion.</p>
                                  </div>
                              </div>
                          </div>
                      </SectionCard>
                  </div>
              </div>

              {/* Right Column: Other Info */}
              <div className="space-y-6">
                   <div className="bg-falcon-green rounded-2xl p-6 text-white border border-falcon-green/20">
                       <h3 className="font-bold text-lg mb-2 text-white">Summer & Breaks</h3>
                       <p className="text-white/90 text-sm mb-4 leading-relaxed">
                           You keep your device over the summer and holidays!
                       </p>
                       <div className="bg-black/20 rounded-lg p-3 text-xs text-white/80">
                           <strong>Requirement:</strong> Periodically log in during breaks to receive critical device updates.
                       </div>
                   </div>

                   <SectionCard icon="🖥️" title="Monitoring" subtitle="Safety Software">
                       <p className="text-sm text-gray-600 mb-3">
                           To meet CIPA requirements, monitoring software tracks internet usage to prevent access to inappropriate content.
                       </p>
                       <ul className="space-y-2 text-xs text-gray-500">
                           <li className="flex items-center gap-2">
                               <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                               Active on external networks (home wifi)
                           </li>
                           <li className="flex items-center gap-2">
                               <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                               School may review files/history
                           </li>
                           <li className="flex items-center gap-2">
                               <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                               Webcam/Mic are <strong>NOT</strong> monitored
                           </li>
                       </ul>
                   </SectionCard>
              </div>
          </div>
          
          <div className="flex justify-center pt-8 border-t border-gray-200">
            <a href={CHROMEBOOK_DOC} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-gray-500 hover:text-falcon-green transition-colors text-sm font-bold uppercase tracking-wide">
                <span>View Official PDF</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
            </a>
          </div>
      </div>
  );

  return (
    <div>
      <CustomCursor />
      <Spotlight />
      <div className="min-h-screen bg-[#F9FAFB] font-sans text-gray-800 relative overflow-x-hidden transition-colors duration-500">
        <div className="bg-noise fixed inset-0 z-[1] opacity-[0.03]" />
        
        {/* Radial Gradient Background */}
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-falcon-green/5 rounded-full blur-[120px] pointer-events-none z-0" />

        {/* Tech Header */}
        <header className="relative z-30 bg-falcon-green text-white pt-6 pb-24 shadow-md transition-all duration-500">
            <div className="container mx-auto px-6 max-w-5xl">
                <div className="flex justify-between items-center mb-6">
                     <button onClick={handleBackToDashboard} className="text-white/70 hover:text-white flex items-center gap-2 text-sm font-bold uppercase tracking-wide transition-colors">
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                         Back to Dashboard
                     </button>
                </div>
                
                <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                    <div>
                        <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">BFHS Technology</h1>
                        <p className="text-white/70 font-medium text-lg">Official Support Portal & Knowledge Base</p>
                    </div>
                </div>
            </div>
        </header>

        {/* Floating Nav Tabs */}
        <div className="relative z-40 -mt-12 container mx-auto px-6 max-w-5xl">
             <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-1 flex overflow-x-auto scrollbar-hide">
                 {[
                     { id: 'home', label: 'Home' },
                     { id: 'password', label: 'Password' },
                     { id: 'wifi', label: 'WiFi' },
                     { id: 'printing', label: 'Printing' },
                     { id: 'chromebook', label: '1:1 Program' }
                 ].map((tab) => (
                     <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as Tab)}
                        className={`flex-1 min-w-[100px] py-3 text-sm font-bold rounded-lg transition-all text-center ${
                            activeTab === tab.id
                            ? 'bg-falcon-green text-white shadow-md'
                            : 'text-gray-500 hover:bg-gray-50 hover:text-falcon-green'
                        }`}
                     >
                         {tab.label}
                     </button>
                 ))}
             </div>
        </div>

        {/* Main Content Area */}
        <div className="container mx-auto px-6 max-w-5xl py-12 relative z-10 min-h-[500px]">
            {activeTab === 'home' && <HomeView />}
            {activeTab === 'password' && <PasswordView />}
            {activeTab === 'wifi' && <WifiView />}
            {activeTab === 'printing' && <PrintingView />}
            {activeTab === 'chromebook' && <ChromebookView />}
        </div>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 py-12 mt-12 relative z-10">
            <div className="container mx-auto px-6 max-w-5xl text-center">
                 <h3 className="font-bold text-gray-900 mb-6">Need additional help?</h3>
                 <div className="flex flex-col md:flex-row justify-center items-center gap-8 text-sm">
                     <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-lg">✉️</div>
                         <div className="text-left">
                             <div className="font-bold text-gray-900">Email Support</div>
                             <a href="mailto:help@bfhsla.org" className="text-gray-500 hover:text-falcon-green">help@bfhsla.org</a>
                         </div>
                     </div>
                     <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center text-lg">📍</div>
                         <div className="text-left">
                             <div className="font-bold text-gray-900">Visit Us</div>
                             <div className="text-gray-500">Room 229 (Library)</div>
                         </div>
                     </div>
                 </div>
                 <p className="text-xs text-gray-400 mt-12">BFHS IT DEPARTMENT • {new Date().getFullYear()}</p>
            </div>
        </footer>

        {/* Chat Widget */}
        <ChatWidget 
            forceOpen={fullPageChatOpen} 
            onCloseFullPage={() => setFullPageChatOpen(false)} 
            initialPrompt={initialPrompt}
            showTrigger={true}
            triggerLabel="BFHS Help"
        />
      </div>
    </div>
  );
};

export default TechInfoPage;
