
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { BFHS_SYSTEM_PROMPT } from '../constants';
import { UserProfile, MemoryNote } from '../types';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Safety check (optional but good)
if (!API_KEY) {
  console.error("Missing API Key! check your .env file");
}
let ai: GoogleGenAI | null = null;
let chatSession: Chat | null = null;
let currentUserId: string | null = null;

// --- Caching Configuration ---
const CACHE_KEY_PREFIX = 'bfhs_gemini_cache_v1_';
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 Hours
const memCache = new Map<string, { response: string, timestamp: number }>();

// --- FAQ Short-Circuit Dictionary ---
// These satisfy the "popular requests" requirement without hitting the API.
// They are stored in-memory for instant, zero-cost retrieval.
const FAQ_SHORT_CIRCUITS: Record<string, string> = {
    "dress code": "**BFHS Dress Code Policy (2025-2026)**\n\nThe dress code prioritizes safety and comfort.\n\n**Must Wear:**\n- Tops: Opaque material (covering front, back, and sides under arms).\n- Bottoms: Pants, sweatpants, shorts, skirts, dresses, or leggings (opaque).\n- Shoes: Must have a back (no flip-flops/slides). Closed-toe may be required for labs/PE.\n- **School ID**: Must be visible around the neck or clipped to upper body at all times.\n\n**Allowed:**\n- Hats/Hoodies (face/ears must be visible).\n- Ripped jeans (if underwear not exposed).\n- Religious headwear.\n\n**Prohibited:**\n- Visible underwear.\n- Pajamas or bathing suits.\n- Images/language depicting violence, drugs, alcohol, hate speech, or profanity.\n- Sunglasses indoors (unless medical need).\n\n*Violations result in a student conference, potential detention for repeat offenses, or being sent to the office for ID replacement ($5).*",

    "uniform": "**Uniform Policy**\n\nBFHS does not have a specific uniform, but follows a strict **Dress Code**. \n\nStudents must wear opaque tops and bottoms. Ripped jeans and hoodies are allowed if they meet coverage requirements. \n\n**Prohibited items include:**\n- Pajamas\n- Bathing suits\n- Visible underwear\n- Backless shoes (flip-flops/slides)\n\n*See 'Dress Code' for full details.*",

    "bell schedule": "**Standard Bell Schedule (2025-2026)**\n\n- **Period 1**: 8:05 AM – 9:40 AM\n- **Passing**: 9:40 AM – 9:50 AM\n- **Period 2**: 9:50 AM – 11:25 AM\n- **Lunch**: 11:25 AM – 12:05 PM\n- **Passing**: 12:05 PM – 12:10 PM\n- **Period 3**: 12:10 PM – 1:45 PM\n- **Passing**: 1:45 PM – 1:55 PM\n- **Period 4**: 1:55 PM – 3:30 PM\n\n*School hours are 8:05 AM to 3:30 PM. Students arriving after 8:05 AM must sign in at the front office.*",

    "schedule": "**Standard Bell Schedule (2025-2026)**\n\n- **Period 1**: 8:05 AM – 9:40 AM\n- **Passing**: 9:40 AM – 9:50 AM\n- **Period 2**: 9:50 AM – 11:25 AM\n- **Lunch**: 11:25 AM – 12:05 PM\n- **Passing**: 12:05 PM – 12:10 PM\n- **Period 3**: 12:10 PM – 1:45 PM\n- **Passing**: 1:45 PM – 1:55 PM\n- **Period 4**: 1:55 PM – 3:30 PM\n\n*School hours are 8:05 AM to 3:30 PM.*",

    "wifi": "**How to Connect to BFHS WiFi**\n\n1. Select the network **BFHS_Student** (or **BFHS Wifi**).\n2. **Identity/Username**: Your full school email address (e.g., `student@bfhsla.org`).\n3. **Password**: Your standard Google/Gmail password.\n4. **CA Certificate**: If prompted, select 'Do not validate', 'Use system certificates', or 'Trust'.\n5. **Domain**: If asked, enter `bfhs.org`.\n\n*If you cannot connect, try 'forgetting' the network and adding it again. IT support is available in the Library (Room 229).* " ,

    "print": "**Student Printing (PaperCut)**\n\nStudents can print to the library or lab printers from their own devices or school Chromebooks.\n\n**Instructions:**\n1. Ensure you are connected to **BFHS Wifi**.\n2. Install the **Mobility Print** app (Chrome/Android) or add printer via System Preferences (Mac/Windows).\n3. Print your document and select **Library_Copier** (Color) or **Lab_Printer** (B&W).\n4. Go to the release station in the library.\n5. Login with your school ID/password to release the job.\n\n**Cost:**\n- **Black & White**: $0.01 per page\n- **Color**: $0.10 per page\n*Credits are deducted from your PaperCut account.*",

    "attendance": "**Attendance Policy**\n\n- **Requirement**: Students must be present 94% of the time to earn credit.\n- **Limit**: Losing credit occurs after **10 absences** (excused or unexcused) in a single class per semester.\n- **Seat Time Recovery**: Required if you have **5 or more** absences (excused or unexcused) in a class. This must be completed before the semester ends.\n\n**Types of Absences:**\n- **Excused**: Personal illness (up to 2 days), serious family illness. (Note: 3 mental health days allowed per year).\n- **Exempt**: Medical extended (3+ days with note), death in family, school business. These do not require seat time recovery but work must be made up.\n- **Unexcused**: vacations, skipping, suspension. Result in 25% grade deduction on late work.",

    "late work": "**Late Work Policy**\n\n- **Excused Absences**: You have an equal number of days to make up work as days missed (e.g., out 2 days = 2 days to submit). No penalty.\n- **Unexcused Absences**: Late assignments and assessments receive a **25% deduction** from the grade earned.\n- **Summative Assessments**: If you miss a test due to an unexcused absence, you receive a 25% deduction. If you miss a final exam without medical documentation, it is a 10% deduction.\n- **Deadlines**: Teachers generally post summative assessments at least one week in advance.",

    "grading scale": "**BFHS Grading Scale**\n\nWe use a 10-point unweighted grading scale for report cards:\n\n- **A**: 90 – 100\n- **B**: 80 – 89\n- **C**: 70 – 79\n- **D**: 60 – 69\n- **F**: 0 – 59\n\n**Grade Composition:**\n- **Formative** (HW, classwork): 30%\n- **Summative** (Tests, projects): 45%\n- **Final Exam**: 25%\n\n*Retention Requirement: Students must maintain a 2.0 GPA in core subjects to remain at BFHS.*",

    "id policy": "**Student ID Card Policy**\n\n- **Mandatory**: IDs must be worn visible around the neck or clipped to the upper body at all times on campus.\n- **Entry**: Required to enter the side gate or front door.\n- **Dress Code**: Not wearing an ID is considered a dress code violation.\n- **Replacement**: If forgotten or lost, report to the main office. A replacement costs **$5**, charged to your student fee bill.",

    "cell phone": "**Electronic Device Policy**\n\n- **During Class**: Cell phones, smart watches, and headphones must be **powered off and put away** (not on your person) from 8:05 AM to 3:30 PM.\n- **Lunch**: Students MAY use devices during the lunch period only.\n- **Consequences**:\n  1. **1st Offense**: Device confiscated, 2-hour detention.\n  2. **2nd Offense**: Parent pickup required, 3-hour Saturday detention.\n  3. **3rd Offense**: Parent pickup, 4-hour Saturday detention, mandatory daily check-in of device.",

    "parking": "**Student Parking**\n\n- **Location**: Students must park in the **UNO Human Performance Center (HPC)** lot or **International Center** lot on Milneburg Rd.\n- **Seniors**: Limited spots available at Hynes UNO Charter (first come, first served).\n- **Permits**: A UNO parking decal is required ($25 fee). You need a valid license, registration, and insurance.\n- **Prohibited**: Do not park in the faculty lot or the front circle (visitors only). Violators risk towing.",

    "academic integrity": "**Academic Integrity**\n\nBFHS expects honesty in all work.\n\n**Violations include:**\n- Using AI (ChatGPT, etc.) without specific teacher permission.\n- Plagiarism (copying text without citation).\n- Copying homework or allowing others to copy yours.\n- Cheating on exams (notes, looking at neighbors, using phones).\n\n**Consequences:**\n- **Formative**: Zero on assignment.\n- **Summative (1st Offense)**: Opportunity to redo for max 50% credit.\n- **Discipline**: Detention (1st offense) to Suspension (2nd offense).",
    
    "tardy": "**Tardiness Policy**\n\n- **Start Time**: School begins at 8:05 AM. Students not seated by then are tardy.\n- **Procedure**: If arriving after 8:05 AM, sign in at the front office for a pass.\n- **Consequences (per semester)**:\n  - **5 Tardies**: 1-hour detention.\n  - **10 Tardies**: 2-hour detention.\n  - **15 Tardies**: 3-hour Saturday detention.\n- **Excused**: Only medical/court appointments with documentation are excused.",

    "chromebook": "**1:1 Chromebook Program**\n\n- **Device**: All students are issued a school-managed Chromebook.\n- **Requirement**: Must bring fully charged every day.\n- **Fees**: Annual technology fee of $100.\n- **Damage**: Students are responsible for repair costs (e.g., Screen: $100, Charger: $40, Replacement: $400).\n- **Monitoring**: Internet usage is filtered and monitored for safety (CIPA compliant), even at home.",
    
    "counselor": "**Counseling & Support**\n\n- **Academic Counselors**: Help with schedules, college prep, and study skills.\n- **Mental Health Professionals**: Available for social/emotional support.\n- **How to see them**: Request a pass or email them. Do not go during class without a scheduled appointment/pass.\n- **Crisis**: If you or a friend are in danger or crisis, report to a trusted adult immediately or call 988.",
    
    "homework": "**Homework Policy**\n\n- **Timing**: Assignments must be posted by 4:30 PM on the day class meets.\n- **Holidays**: No new projects or heavy workloads assigned over breaks (usual one-night homework is allowed).\n- **Testing**: No major tests/projects due on the two days before Semester Exams.\n- **Return**: Graded work should be returned within two weeks.",
    
    "food": "**Food Services**\n\n- **Breakfast**: 7:30 AM – 7:50 AM ($2.75).\n- **Lunch**: 11:25 AM – 12:05 PM ($4.20).\n- **Payment**: Use SchoolCafe.com.\n- **Delivery**: Students may **NOT** order food delivery (UberEats, DoorDash, etc.) to campus.",
    
    "detention": "**Detention Hierarchy**\n\n1. **Teacher Detention**: up to 1 hr before/after school or during lunch.\n2. **Administrative Detention**: 1 hr (for 5 tardies or minor infractions).\n3. **Extended Detention**: 2+ hrs (for cell phones, cutting class).\n4. **Saturday Detention**: 3-4 hrs (for repeated infractions).\n5. **Suspension (ISS/OSS)**: For major infractions (fighting, bullying, repeated violations).",

    "graduation": "**Graduation Requirements**\n\n**Total Credits**: 24 Units\n\n- **English**: 4 credits\n- **Math**: 4 credits\n- **Science**: 4 credits (Bio, Chem, Physics + 1)\n- **Social Studies**: 4 credits (Civics, US Hist + 2)\n- **World Language**: 3 credits (2 in same language)\n- **PE/Health**: 2 credits\n- **Arts**: 1 credit\n- **Electives**: 2 credits\n\n*Must also complete 3 AP courses and 1 Research Intensive course.*"
};

export const initializeGenAI = () => {
  if (API_KEY) {
    ai = new GoogleGenAI({ apiKey: API_KEY });
  } else {
    console.error("VITE_GEMINI_API_KEY is missing");
  }
};

// We reset session if the user changes
export const resetChatSession = () => {
  chatSession = null;
};

export const getChatSession = async (): Promise<Chat> => {
  if (!ai) initializeGenAI();
  if (!ai) throw new Error("Gemini API not initialized");

  if (!chatSession) {
    chatSession = ai.chats.create({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: BFHS_SYSTEM_PROMPT,
        temperature: 0.7,
        tools: [{ googleSearch: {} }],
      },
    });
  }
  return chatSession;
};

// --- Caching Helper Functions ---

function normalizePrompt(text: string): string {
    return text.trim().toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');
}

function getCacheKey(text: string, grade?: string, hasImage?: boolean): string {
    const normText = normalizePrompt(text);
    return `${normText}|grade:${grade || 'all'}|img:${hasImage ? 'y' : 'n'}`;
}

function getFromCache(key: string): string | null {
    // 1. Check Memory
    if (memCache.has(key)) {
        console.log(`[Gemini Cache] Memory Hit: ${key}`);
        return memCache.get(key)!.response;
    }

    // 2. Check LocalStorage
    try {
        const item = localStorage.getItem(CACHE_KEY_PREFIX + key);
        if (item) {
            const entry = JSON.parse(item);
            // Check TTL
            if (Date.now() - entry.timestamp < CACHE_TTL) {
                console.log(`[Gemini Cache] Storage Hit: ${key}`);
                memCache.set(key, entry); // Rehydrate memory
                return entry.response;
            } else {
                localStorage.removeItem(CACHE_KEY_PREFIX + key);
            }
        }
    } catch (e) {
        console.warn("Cache read error", e);
    }
    return null;
}

function saveToCache(key: string, response: string) {
    const entry = { response, timestamp: Date.now() };
    memCache.set(key, entry);
    try {
        localStorage.setItem(CACHE_KEY_PREFIX + key, JSON.stringify(entry));
    } catch (e) {
        console.warn("Cache write error", e);
    }
}

// --- Main Service ---

export const sendMessageToGemini = async (
  message: string,
  imageBase64?: string,
  userContext?: { profile: UserProfile | null, notes: MemoryNote[] }
): Promise<string> => {
  try {
    // 0. Normalize Inputs
    const normalizedText = normalizePrompt(message);
    const hasImage = !!imageBase64;
    
    // 1. FAQ Short-Circuit (Zero Cost)
    // Only apply for short queries without images to avoid context mismatch
    // Increased length limit to 80 chars to catch slightly longer natural questions
    if (!hasImage && message.length < 80) {
        for (const [trigger, answer] of Object.entries(FAQ_SHORT_CIRCUITS)) {
            if (normalizedText.includes(trigger)) {
                console.log(`[Gemini Service] FAQ Hit: ${trigger}`);
                return answer;
            }
        }
    }

    // 2. Cache Check (Avoid API Call)
    // If the user has specific memory notes, we generally skip cache to ensure personalization,
    // unless we decide to make the cache key very specific. For now, skipping cache on memory notes is safer.
    const hasNotes = userContext?.notes && userContext.notes.length > 0;
    const cacheKey = getCacheKey(message, userContext?.profile?.grade, hasImage);

    if (!hasNotes && !hasImage) {
        const cachedResponse = getFromCache(cacheKey);
        if (cachedResponse) return cachedResponse;
    }

    // --- API CALL ---

    // If user changed, reset session (simple check)
    if (userContext?.profile?.uid && userContext.profile.uid !== currentUserId) {
        resetChatSession();
        currentUserId = userContext.profile.uid;
    }

    const session = await getChatSession();
    
    // Construct the context block
    let contextString = "";
    if (userContext?.profile && userContext.profile.allowMemory) {
        contextString += `\n\n[USER CONTEXT]\nName: ${userContext.profile.name}\nGrade: ${userContext.profile.grade}\n`;
        if (userContext.profile.schedule) {
            const schedule = userContext.profile.schedule;
            const formatDay = (day: 'A' | 'B') => {
                const entries = schedule[day]
                    .map((name, index) => name.trim() ? `${day}${index + 1} ${name.trim()}` : "")
                    .filter(entry => entry.length > 0);
                return entries.length > 0 ? entries.join(", ") : "";
            };
            const scheduleText = [formatDay('A'), formatDay('B')].filter(entry => entry.length > 0).join("; ");
            if (scheduleText) {
                contextString += `Classes: ${scheduleText}\n`;
            }
        }
        if (userContext.notes.length > 0) {
            contextString += "Memory Notes:\n";
            userContext.notes.forEach(n => {
                contextString += `- ${n.note}\n`;
            });
        }
        contextString += "[END USER CONTEXT]\n(Use this context to personalize the response, but do not explicitly mention 'Memory Notes' unless relevant.)\n\n";
    }

    // Prepend context to the user message
    const finalMessageText = contextString + message;

    let contentToSend: any = finalMessageText;

    // If an image is provided, we must send a parts array
    if (imageBase64) {
        // Strip data:image/jpeg;base64, prefix if present for the API call
        const cleanBase64 = imageBase64.split(',')[1] || imageBase64;
        
        contentToSend = [
            { text: finalMessageText },
            {
                inlineData: {
                    mimeType: 'image/jpeg',
                    data: cleanBase64
                }
            }
        ];
    }

    const result = await session.sendMessage({ message: contentToSend });
    let textResponse = result.text || "I'm sorry, I couldn't generate a response.";

    // 3. Log Token Usage (Cost Tracking)
    if (result.usageMetadata) {
        console.group("💎 Gemini Token Usage");
        console.log("Prompt Tokens:", result.usageMetadata.promptTokenCount);
        console.log("Output Tokens:", result.usageMetadata.candidatesTokenCount);
        console.log("Total Tokens:", result.usageMetadata.totalTokenCount);
        console.groupEnd();
    }

    // 4. Save to Cache
    // Only cache if no memory notes were involved and no image was used
    if (!hasNotes && !hasImage) {
        saveToCache(cacheKey, textResponse);
    }

    return textResponse;
  } catch (error) {
    console.error("Error sending message to Gemini:", error);
    return "I'm having trouble connecting to the school's knowledge base right now. Please try again later.";
  }
};
