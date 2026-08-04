import React, { useState } from 'react';
import {
  ArrowLeft,
  HelpCircle,
  ShieldCheck,
  Check,
  CheckCircle2,
  Phone,
  MoreVertical,
  Lock,
  ChevronRight,
  Calendar,
  User,
  Clock,
  Send,
  Paperclip,
  Search,
  SlidersHorizontal,
  Megaphone,
  Headphones,
  Gift,
  IndianRupee,
  ShieldAlert,
  Car,
  MessageCircle,
  Download,
  Copy,
  AlertCircle,
  RefreshCw,
  Landmark,
  Wallet,
  Home,
  Mail,
  Grid,
  Upload,
  Maximize2,
  X,
  Signal,
  Wifi,
  Info
} from 'lucide-react';

export default function App() {
  // Screen Router state set to default Screen 9 (tripSupport) for Batch 3
  const [currentScreen, setCurrentScreen] = useState('tripSupport');
  const [activeTab, setActiveTab] = useState('Inbox');
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleTabChange = (tabName, screenId) => {
    setActiveTab(tabName);
    setCurrentScreen(screenId);
  };

  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-slate-950 sm:py-6 font-sans antialiased text-slate-800 selection:bg-orange-500 selection:text-white">
      
      {/* Batch 3 Quick Selector Navigation Bar */}
      <div className="w-full max-w-[430px] mb-3 px-3 py-2 bg-slate-900/90 backdrop-blur-md rounded-2xl flex items-center justify-between text-xs text-slate-300 shadow-xl border border-slate-800">
        <span className="font-bold text-slate-400 flex items-center gap-1.5 shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Batch 3 Screens:
        </span>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {[
            { id: 'tripSupport', label: '9. Trip Support (9_2.jpeg)' },
            { id: 'inbox', label: '10. Inbox (10_2.jpeg)' },
            { id: 'payoutHistory', label: '11. Payout History (11_2.jpeg)' },
            { id: 'profilePhoto', label: '12. Profile Photo (12_2.jpeg)' },
          ].map((screen) => (
            <button 
              key={screen.id}
              onClick={() => {
                setCurrentScreen(screen.id);
                if (screen.id === 'inbox') setActiveTab('Inbox');
              }}
              className={`px-2.5 py-1 rounded-lg transition-all font-semibold whitespace-nowrap text-[11px] ${
                currentScreen === screen.id 
                  ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-500/20' 
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              {screen.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Device Mobile Frame Wrapper */}
      <div className="w-full max-w-[430px] bg-white min-h-[915px] sm:rounded-[44px] shadow-2xl flex flex-col justify-between relative overflow-hidden border-0 sm:border-[8px] sm:border-slate-800">
        
        {/* Scrollable Screen Content Container */}
        <div className="flex-1 overflow-y-auto no-scrollbar pb-6">
          
          {/* iOS OS Status Bar */}
          <div className="sticky top-0 bg-white/95 backdrop-blur-md z-30 px-6 pt-3 pb-1 flex justify-between items-center text-xs font-semibold text-slate-900">
            <span className="font-bold">9:41</span>
            <div className="flex items-center gap-1.5 text-[11px]">
              <Signal className="w-3.5 h-3.5" />
              <Wifi className="w-3.5 h-3.5" />
              <div className="flex items-center gap-1 border border-slate-900/40 rounded px-1 py-0.2">
                <span className="text-[10px] font-extrabold">100</span>
              </div>
            </div>
          </div>

          {/* Render Active Screen */}
          {currentScreen === 'tripSupport' && (
            <TripSupportScreen 
              onBack={() => setCurrentScreen('inbox')} 
              showToast={showToast}
            />
          )}

          {currentScreen === 'inbox' && (
            <InboxScreen 
              showToast={showToast}
              setCurrentScreen={setCurrentScreen}
              activeTab={activeTab}
              handleTabChange={handleTabChange}
            />
          )}

          {currentScreen === 'payoutHistory' && (
            <PayoutHistoryScreen 
              onBack={() => setCurrentScreen('inbox')} 
              showToast={showToast}
            />
          )}

          {currentScreen === 'profilePhoto' && (
            <ProfilePhotoScreen 
              onBack={() => setCurrentScreen('inbox')} 
              showToast={showToast}
            />
          )}

        </div>

        {/* Global Floating Toast Alert */}
        {toastMessage && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-2xl z-50 flex items-center gap-2 border border-slate-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

      </div>
    </div>
  );
}

function TripSupportScreen({ onBack, showToast }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'support',
      text: 'Hi Ashutosh,\nYour trip to Jaipur, Rajasthan on 17 May 2025 has been confirmed.\n\nPickup: Delhi (IGI Airport)\nDrop: Jaipur, Rajasthan\nTime: 10:30 AM\nCustomer: Rahul Sharma\n\nPlease review the trip details in the bookings section.',
      time: '09:30 AM',
      date: '16 May 2025'
    },
    {
      id: 2,
      sender: 'user',
      text: 'Hello,\nI have checked the details.\nWill reach on time.',
      time: '09:32 AM',
      date: '16 May 2025'
    },
    {
      id: 3,
      sender: 'support',
      text: 'Great! 👍\nMake sure to contact the customer 30 mins before pickup.\nHave a safe trip!',
      time: '09:33 AM',
      date: '16 May 2025'
    },
    {
      id: 4,
      sender: 'user',
      text: 'Hello,\nCustomer is not picking up the call.\nPlease advise.',
      time: '10:45 AM',
      date: '17 May 2025'
    },
    {
      id: 5,
      sender: 'support',
      text: 'Please wait for 5 more minutes and try again.\nIf the customer is still not reachable,\nyou can start the trip.',
      time: '10:46 AM',
      date: '17 May 2025'
    },
    {
      id: 6,
      sender: 'user',
      text: 'Okay, thanks!',
      time: '10:47 AM',
      date: '17 May 2025'
    }
  ]);

  const [inputMsg, setInputMsg] = useState('');

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;

    const newMsg = {
      id: Date.now(),
      sender: 'user',
      text: inputMsg,
      time: '10:48 AM',
      date: '17 May 2025'
    };

    setMessages([...messages, newMsg]);
    setInputMsg('');
    showToast('Message sent to Trip Support');
  };

  return (
    <div className="bg-slate-50 min-h-full flex flex-col justify-between">
      {/* Header Bar */}
      <div>
        <header className="px-4 py-3 flex items-center justify-between bg-white border-b border-slate-100 sticky top-7 z-20">
          <div className="flex items-center gap-2.5">
            <button onClick={onBack} className="p-1 rounded-full hover:bg-slate-100 transition active:scale-95">
              <ArrowLeft className="w-5 h-5 text-slate-800" />
            </button>
            <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-slate-900 leading-tight">Trip Support</h1>
              <p className="text-[11px] font-bold text-emerald-600 leading-none">Online</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-700">
            <button onClick={() => showToast('Calling Support...')} className="p-1.5 rounded-full hover:bg-slate-100 transition">
              <Phone className="w-5 h-5" />
            </button>
            <button onClick={() => showToast('Options')} className="p-1.5 rounded-full hover:bg-slate-100 transition">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Official Conversation Warning Banner */}
        <div className="m-3 p-3 bg-emerald-50/80 border border-emerald-100/80 rounded-2xl flex items-center gap-2 text-[11px] text-emerald-900 font-medium">
          <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>This is an official conversation with MBconnect.<br />We will never ask for your password or OTP.</span>
        </div>

        {/* Embedded Trip Details Card */}
        <div className="mx-3 mb-4 bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-xs">
          <div className="px-3.5 py-2.5 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>Trip Details</span>
            </div>
            <span className="bg-emerald-100/80 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
              Confirmed
            </span>
          </div>

          <div className="p-3.5 grid grid-cols-2 gap-3 text-xs">
            <div className="space-y-2">
              <div>
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-900">
                  <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                  <span>Jaipur, Rajasthan</span>
                </div>
                <p className="text-[10px] text-slate-400 pl-3">Pickup</p>
              </div>

              <div>
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-900">
                  <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                  <span>Jaipur, Rajasthan</span>
                </div>
                <p className="text-[10px] text-slate-400 pl-3">Drop</p>
              </div>

              <div>
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-900">
                  <User className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Rahul Sharma</span>
                </div>
                <p className="text-[10px] text-slate-400 pl-4.5">Customer</p>
              </div>
            </div>

            <div className="space-y-2 pl-2 border-l border-slate-100">
              <div>
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-900">
                  <span className="text-purple-600 font-extrabold">#</span>
                  <span>Trip ID</span>
                </div>
                <p className="text-[11px] font-bold text-slate-900 pl-3">MB2505171002</p>
              </div>

              <div>
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-900">
                  <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>Date</span>
                </div>
                <p className="text-[11px] font-bold text-slate-900 pl-4.5">17 May 2025</p>
              </div>

              <div>
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-900">
                  <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>Time</span>
                </div>
                <p className="text-[11px] font-bold text-slate-900 pl-4.5">10:30 AM</p>
              </div>
            </div>
          </div>

          <button 
            onClick={() => showToast("Viewing full trip details...")}
            className="w-full py-2 bg-slate-50/80 border-t border-slate-100 text-center text-xs font-bold text-blue-600 flex items-center justify-center gap-1 hover:bg-slate-100 transition"
          >
            <span>View full trip details</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Message Thread List */}
        <div className="px-3 space-y-3 pb-4">
          <div className="text-center my-2">
            <span className="bg-slate-200/80 text-slate-600 text-[10px] font-extrabold px-3 py-1 rounded-full">
              16 May 2025
            </span>
          </div>

          {messages.slice(0, 3).map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}

          <div className="text-center my-2">
            <span className="bg-slate-200/80 text-slate-600 text-[10px] font-extrabold px-3 py-1 rounded-full">
              17 May 2025
            </span>
          </div>

          {messages.slice(3).map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}
        </div>
      </div>

      {/* Fixed Bottom Input Bar */}
      <form onSubmit={handleSendMessage} className="sticky bottom-0 bg-white border-t border-slate-100 p-3 flex items-center gap-2 z-20">
        <div className="flex-1 bg-slate-100/80 rounded-full px-4 py-2.5 flex items-center justify-between border border-slate-200/60">
          <input
            type="text"
            placeholder="Type a message..."
            value={inputMsg}
            onChange={(e) => setInputMsg(e.target.value)}
            className="w-full bg-transparent text-xs text-slate-900 focus:outline-none placeholder:text-slate-400 font-medium"
          />
          <button type="button" onClick={() => showToast("Attaching file...")} className="p-1 text-slate-500 hover:text-slate-800 transition shrink-0">
            <Paperclip className="w-4 h-4" />
          </button>
        </div>

        <button 
          type="submit"
          className="w-10 h-10 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/30 transition active:scale-95"
        >
          <Send className="w-4 h-4 ml-0.5" />
        </button>
      </form>
    </div>
  );
}

function MessageBubble({ msg }) {
  const isUser = msg.sender === 'user';
  return (
    <div className={`flex gap-2 items-end ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 text-xs shadow-xs mb-1">
          <Calendar className="w-4 h-4" />
        </div>
      )}

      <div 
        className={`max-w-[78%] rounded-2xl p-3 text-xs leading-relaxed shadow-xs whitespace-pre-line ${
          isUser 
            ? 'bg-[#E1F4EA] text-slate-900 rounded-br-xs border border-emerald-100' 
            : 'bg-white text-slate-900 rounded-bl-xs border border-slate-100'
        }`}
      >
        <p className="font-medium text-[11px]">{msg.text}</p>
        <div className={`flex items-center gap-1 justify-end mt-1 text-[9px] ${isUser ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
          <span>{msg.time}</span>
          {isUser && <span className="text-emerald-600 font-extrabold stroke-[3]">✓✓</span>}
        </div>
      </div>
    </div>
  );
}

function InboxScreen({ showToast, setCurrentScreen, activeTab, handleTabChange }) {
  const [filter, setFilter] = useState('All');

  const inboxItems = [
    {
      id: 1,
      category: 'Official',
      icon: Megaphone,
      color: 'bg-orange-100 text-orange-600',
      title: 'MBconnect Official',
      badge: 'Official',
      badgeColor: 'bg-orange-100 text-orange-700',
      desc: 'Independence Day Special! Earn extra incentives on trips from 13th to 15th Aug.',
      time: '09:30 AM',
      unreadBadge: 1,
      hasDot: true,
      screenTarget: 'tripSupport'
    },
    {
      id: 2,
      category: 'Support',
      icon: Calendar,
      color: 'bg-emerald-100 text-emerald-700',
      title: 'Trip Support',
      desc: 'Your trip to Jaipur, Rajasthan on 17 May has been confirmed.',
      time: 'Yesterday',
      unreadBadge: 2,
      screenTarget: 'tripSupport'
    },
    {
      id: 3,
      category: 'Support',
      icon: Headphones,
      color: 'bg-purple-100 text-purple-600',
      title: 'Support Team',
      desc: 'Your query about payment for Trip ID MB2505171001 has been resolved.',
      time: 'Yesterday',
      unreadBadge: 1,
      screenTarget: 'payoutHistory'
    },
    {
      id: 4,
      category: 'Trips',
      icon: User,
      color: 'bg-blue-100 text-blue-600',
      title: 'Rahul Sharma',
      badge: 'Customer',
      badgeColor: 'bg-slate-100 text-slate-700',
      desc: 'Hello, I will be at Terminal 3. Please call me when you arrive.',
      time: '17 May',
      screenTarget: 'tripSupport'
    },
    {
      id: 5,
      category: 'Official',
      icon: Gift,
      color: 'bg-orange-100 text-orange-500',
      title: 'Promotions',
      desc: 'Refer a driver partner and get ₹500 bonus after their first trip!',
      time: '16 May',
      screenTarget: 'inbox'
    },
    {
      id: 6,
      category: 'Official',
      icon: IndianRupee,
      color: 'bg-emerald-100 text-emerald-600',
      title: 'Earnings & Payouts',
      desc: 'Your payout of ₹8,620 is completed on 20 May 2025.',
      time: '16 May',
      screenTarget: 'payoutHistory'
    },
    {
      id: 7,
      category: 'Official',
      icon: ShieldAlert,
      color: 'bg-rose-100 text-rose-600',
      title: 'Safety & Compliance',
      desc: 'Update your documents before 25 May to avoid suspension.',
      time: '15 May',
      screenTarget: 'profilePhoto'
    },
    {
      id: 8,
      category: 'Official',
      icon: Car,
      color: 'bg-blue-100 text-blue-600',
      title: 'MBconnect Updates',
      desc: 'New feature alert! Now you can set your preferred ride areas in the app.',
      time: '14 May',
      hasDot: true,
      screenTarget: 'inbox'
    },
    {
      id: 9,
      category: 'Support',
      icon: MessageCircle,
      color: 'bg-emerald-100 text-emerald-600',
      title: 'Help Center',
      desc: 'How to update RC in MBconnect? Tap here to know more.',
      time: '13 May',
      screenTarget: 'inbox'
    }
  ];

  return (
    <div className="bg-white min-h-full flex flex-col justify-between">
      <div>
        {/* Header Bar */}
        <header className="px-5 py-4 flex items-center justify-between bg-white border-b border-slate-100 sticky top-7 z-20">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Inbox</h1>
            <p className="text-xs text-slate-400 font-medium">Messages and updates</p>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => showToast("Search messages...")} className="w-9 h-9 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-700 transition">
              <Search className="w-4 h-4" />
            </button>
            <button onClick={() => showToast("Inbox Filters")} className="w-9 h-9 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-700 transition">
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>
        </header>

        <main className="p-4 space-y-3">
          
          {/* Category Filter Chips */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {[
              { id: 'All', label: 'All', count: 12 },
              { id: 'Unread', label: 'Unread', count: 5, color: 'bg-blue-500' },
              { id: 'Trips', label: 'Trips', count: 4, color: 'bg-slate-500' },
              { id: 'Support', label: 'Support', count: 3, color: 'bg-slate-500' },
            ].map((chip) => (
              <button
                key={chip.id}
                onClick={() => setFilter(chip.id)}
                className={`px-3.5 py-1.5 rounded-2xl text-xs font-extrabold flex items-center gap-1.5 whitespace-nowrap transition ${
                  filter === chip.id
                    ? 'bg-orange-50 text-orange-600 border border-orange-200 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border border-slate-100 hover:bg-slate-100'
                }`}
              >
                <span>{chip.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  filter === chip.id ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {chip.count}
                </span>
              </button>
            ))}
          </div>

          {/* Messages List */}
          <div className="divide-y divide-slate-100 border-t border-slate-100 pt-1">
            {inboxItems.map((item) => {
              const IconComp = item.icon;
              return (
                <div
                  key={item.id}
                  onClick={() => setCurrentScreen(item.screenTarget)}
                  className="py-3.5 flex items-start justify-between gap-3 hover:bg-slate-50/80 px-1 rounded-xl cursor-pointer transition"
                >
                  <div className="flex items-start gap-3">
                    <div className="relative shrink-0">
                      {item.hasDot && (
                        <span className="absolute -top-0.5 -left-0.5 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-white z-10" />
                      )}
                      <div className={`w-10 h-10 rounded-2xl ${item.color} flex items-center justify-center shrink-0`}>
                        <IconComp className="w-5 h-5" />
                      </div>
                    </div>

                    <div className="space-y-0.5 pr-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-extrabold text-xs text-slate-900">{item.title}</h2>
                        {item.badge && (
                          <span className={`text-[9px] font-extrabold px-2 py-0.2 rounded ${item.badgeColor}`}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium line-clamp-2 leading-tight">
                        {item.desc}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0 pt-0.5">
                    <span className="text-[10px] text-slate-400 font-semibold">{item.time}</span>
                    {item.unreadBadge && (
                      <span className="w-4 h-4 rounded-full bg-orange-500 text-white text-[9px] font-black flex items-center justify-center">
                        {item.unreadBadge}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        </main>
      </div>

      {/* Floating Offline Status & Bottom Navigation Bar */}
      <div className="sticky bottom-0 bg-white border-t border-slate-100 pt-2 pb-6 px-4 z-20">
        
        {/* Offline Status Pill Bar */}
        <div className="bg-red-50/80 border border-red-100 rounded-2xl p-2.5 flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 pl-1">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <div>
              <p className="text-xs font-extrabold text-red-600 leading-none">You are offline</p>
              <p className="text-[9px] text-slate-500 mt-0.5">↑ Go online to start receiving bookings</p>
            </div>
          </div>

          <button 
            onClick={() => showToast("Going online...")}
            className="bg-orange-500 text-white text-xs font-bold px-4 py-1.5 rounded-xl flex items-center gap-1 shadow-sm hover:bg-orange-600 transition"
          >
            <span>Go Online</span>
          </button>
        </div>

        {/* Global Bottom Navigation Tabs */}
        <nav className="flex justify-around items-center pt-1">
          {[
            { name: 'Home', icon: Home, screen: 'inbox' },
            { name: 'Bookings', icon: Calendar, screen: 'inbox' },
            { name: 'Earnings', icon: Wallet, screen: 'payoutHistory' },
            { name: 'Inbox', icon: Mail, badge: 2, screen: 'inbox' },
            { name: 'Menu', icon: Grid, screen: 'inbox' },
          ].map((tab) => {
            const IconComp = tab.icon;
            const isActive = activeTab === tab.name;
            return (
              <button
                key={tab.name}
                onClick={() => handleTabChange(tab.name, tab.screen)}
                className={`flex flex-col items-center relative transition ${
                  isActive ? 'text-[#FF4500]' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <IconComp className="w-5 h-5" />
                {tab.badge && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center border border-white">
                    {tab.badge}
                  </span>
                )}
                <span className={`text-[10px] mt-1 ${isActive ? 'font-bold' : 'font-medium'}`}>
                  {tab.name}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="w-32 h-1 bg-slate-900 rounded-full mx-auto mt-3" />
      </div>

    </div>
  );
}

function PayoutHistoryScreen({ onBack, showToast }) {
  const payouts = [
    { id: '1', date: '20 May 2025, 09:30 AM', utr: '512345678901', type: 'Bank Account', bank: 'HDFC Bank **** 4567', amount: '₹8,620', status: 'Completed' },
    { id: '2', date: '13 May 2025, 09:30 AM', utr: '412345678901', type: 'Bank Account', bank: 'HDFC Bank **** 4567', amount: '₹7,980', status: 'Completed' },
    { id: '3', date: '06 May 2025, 09:30 AM', utr: '312345678901', type: 'Bank Account', bank: 'HDFC Bank **** 4567', amount: '₹9,260', status: 'Completed' },
    { id: '4', date: '02 May 2025, 09:30 AM', utr: '', type: 'Payout Initiated', bank: 'HDFC Bank **** 4567', amount: '₹9,260', status: 'Processing' },
    { id: '5', date: '28 Apr 2025, 09:30 AM', utr: '', type: 'Payment Failed', bank: 'HDFC Bank **** 4567', amount: '₹650', status: 'Failed' },
    { id: '6', date: '20 Apr 2025, 09:30 AM', utr: '212345678901', type: 'Bank Account', bank: 'HDFC Bank **** 4567', amount: '₹6,550', status: 'Completed' },
    { id: '7', date: '13 Apr 2025, 09:30 AM', utr: '112345678901', type: 'Bank Account', bank: 'HDFC Bank **** 4567', amount: '₹5,780', status: 'Completed' },
    { id: '8', date: '05 Apr 2025, 09:30 AM', utr: '', type: 'Payment Failed', bank: 'HDFC Bank **** 4567', amount: '₹650', status: 'Failed' },
    { id: '9', date: '30 Mar 2025, 09:30 AM', utr: '012345678901', type: 'Bank Account', bank: 'HDFC Bank **** 4567', amount: '₹8,450', status: 'Completed' },
  ];

  return (
    <div className="bg-white min-h-full pb-10">
      {/* Header Bar */}
      <header className="px-5 py-3.5 flex items-center justify-between bg-white border-b border-slate-100 sticky top-7 z-20">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1 rounded-full hover:bg-slate-100 transition active:scale-95">
            <ArrowLeft className="w-5 h-5 text-slate-800" />
          </button>
          <div>
            <h1 className="text-lg font-black text-slate-900 leading-tight">Payout History</h1>
            <p className="text-[10px] text-slate-400 font-medium">View all your earnings payouts and their status</p>
          </div>
        </div>
        <button onClick={() => showToast("Filter Payouts")} className="flex items-center gap-1 text-slate-700 text-xs font-bold hover:text-slate-900">
          <SlidersHorizontal className="w-4 h-4" /> Filter
        </button>
      </header>

      <main className="p-4 space-y-4">
        {/* Top 4 Summary Cards Grid */}
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-2.5 space-y-1">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <Wallet className="w-4 h-4" />
            </div>
            <p className="text-[9px] text-slate-400 font-medium">Total Payouts</p>
            <p className="font-black text-slate-900 text-xs">₹78,450</p>
            <p className="text-[8px] text-emerald-600 font-bold">12 Transactions</p>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-2.5 space-y-1">
            <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
              <Download className="w-4 h-4" />
            </div>
            <p className="text-[9px] text-slate-400 font-medium">Completed</p>
            <p className="font-black text-slate-900 text-xs">₹67,890</p>
            <p className="text-[8px] text-emerald-600 font-bold">9 Transactions</p>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-2.5 space-y-1">
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <Clock className="w-4 h-4" />
            </div>
            <p className="text-[9px] text-slate-400 font-medium">Processing</p>
            <p className="font-black text-slate-900 text-xs">₹9,260</p>
            <p className="text-[8px] text-amber-600 font-bold">1 Transaction</p>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-2.5 space-y-1">
            <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-4 h-4" />
            </div>
            <p className="text-[9px] text-slate-400 font-medium">Failed</p>
            <p className="font-black text-slate-900 text-xs">₹1,300</p>
            <p className="text-[8px] text-rose-600 font-bold">2 Transactions</p>
          </div>
        </div>

        {/* Date Selector & Statement Download */}
        <div className="flex items-center justify-between pt-1">
          <button onClick={() => showToast("Select Date Range")} className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-extrabold text-slate-800 flex items-center gap-2 hover:bg-slate-50">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>17 May – 23 May 2025</span>
            <ChevronRight className="w-3.5 h-3.5 rotate-90 text-slate-400" />
          </button>

          <button onClick={() => showToast("Downloading Statement...")} className="text-xs text-blue-600 font-extrabold flex items-center gap-1 hover:underline">
            <Download className="w-3.5 h-3.5" />
            <span>Download Statement</span>
          </button>
        </div>

        {/* Transactions Table Ledger */}
        <div className="border border-slate-100 rounded-2xl bg-white shadow-xs overflow-hidden">
          <div className="bg-slate-50/80 px-3 py-2 border-b border-slate-100 grid grid-cols-12 text-[10px] font-extrabold text-slate-400 uppercase tracking-tight">
            <div className="col-span-4">Date & Time</div>
            <div className="col-span-4">Payout Details</div>
            <div className="col-span-2 text-right">Amount</div>
            <div className="col-span-2 text-right">Status</div>
          </div>

          <div className="divide-y divide-slate-50 text-xs">
            {payouts.map((item) => (
              <div key={item.id} className="p-3 grid grid-cols-12 items-center hover:bg-slate-50/60 transition">
                <div className="col-span-4 space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                      item.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' :
                      item.status === 'Processing' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
                    }`}>
                      <Download className="w-3 h-3" />
                    </div>
                    <span className="font-extrabold text-slate-900 text-[11px] leading-tight">{item.date}</span>
                  </div>
                  {item.utr ? (
                    <div className="flex items-center gap-1 text-[9px] text-slate-400 pl-7">
                      <span>UTR: {item.utr}</span>
                      <Copy onClick={() => showToast(`UTR ${item.utr} copied!`)} className="w-2.5 h-2.5 text-slate-400 hover:text-slate-600 cursor-pointer" />
                    </div>
                  ) : (
                    <div className={`text-[9px] font-bold pl-7 ${item.status === 'Failed' ? 'text-rose-500' : 'text-amber-500'}`}>
                      {item.type}
                    </div>
                  )}
                </div>

                <div className="col-span-4 text-[10px] space-y-0.5">
                  <div className="font-bold text-slate-800">{item.type}</div>
                  <div className="text-slate-400">{item.bank}</div>
                </div>

                <div className="col-span-2 text-right font-black text-slate-900 text-xs">
                  {item.amount}
                </div>

                <div className="col-span-2 flex items-center justify-end gap-1">
                  <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md flex items-center gap-0.5 ${
                    item.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                    item.status === 'Processing' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                  }`}>
                    {item.status}
                    {item.status === 'Completed' && <CheckCircle2 className="w-2.5 h-2.5" />}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* About Payouts Information Disclaimer */}
        <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-3 flex items-start gap-2 text-xs text-blue-900">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-extrabold text-blue-950 text-xs">About Payouts</h4>
            <p className="text-[10px] text-slate-600 mt-0.5">
              Payouts are usually completed within 24 hours. In case of any issues, please contact support.
            </p>
          </div>
        </div>

        {/* Bottom Wallet & Payout Method Row */}
        <div className="grid grid-cols-3 gap-2 border border-slate-100 rounded-2xl p-3 bg-white text-xs">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
              <Wallet className="w-3.5 h-3.5 text-slate-500" />
              <span>Wallet Balance</span>
            </div>
            <p className="font-black text-slate-900 text-xs">₹1,250</p>
            <button onClick={() => showToast("Opening Wallet...")} className="text-[10px] font-bold text-blue-600 flex items-center gap-0.5 hover:underline">
              <span>View Wallet</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-0.5 border-l border-slate-100 pl-2">
            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
              <Calendar className="w-3.5 h-3.5 text-purple-500" />
              <span>Next Payout Date</span>
            </div>
            <p className="font-black text-slate-900 text-xs">27 May 2025</p>
            <p className="text-[9px] text-slate-400">Tuesday</p>
          </div>

          <div className="space-y-0.5 border-l border-slate-100 pl-2">
            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
              <Landmark className="w-3.5 h-3.5 text-blue-600" />
              <span>Payout Method</span>
            </div>
            <p className="font-black text-slate-900 text-xs">HDFC Bank</p>
            <p className="text-[9px] text-slate-400">**** **** 4567</p>
          </div>
        </div>

      </main>
    </div>
  );
}

function ProfilePhotoScreen({ onBack, showToast }) {
  return (
    <div className="bg-white min-h-full pb-10">
      {/* Header Bar */}
      <header className="px-5 py-3.5 flex items-center justify-between bg-white border-b border-slate-100 sticky top-7 z-20">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1 rounded-full hover:bg-slate-100 transition active:scale-95">
            <ArrowLeft className="w-5 h-5 text-slate-800" />
          </button>
          <h1 className="text-lg font-black text-slate-900">Profile Photo</h1>
        </div>
        <button onClick={() => showToast("Profile Photo Help")} className="flex items-center gap-1 text-slate-600 text-xs font-semibold hover:text-slate-900">
          <HelpCircle className="w-4 h-4" /> Help
        </button>
      </header>

      <main className="p-4 space-y-4">
        {/* Verified Green Hero Banner */}
        <div className="bg-[#EFF8F3] border border-emerald-100 rounded-2xl p-4 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <span className="font-extrabold text-emerald-800 text-sm">Verified</span>
              <p className="text-[11px] text-slate-600 font-medium leading-tight mt-0.5">
                Your profile photo has been verified on 18 May 2025
              </p>
            </div>
          </div>
          <div className="w-6 h-6 rounded-full border-2 border-emerald-500 flex items-center justify-center shrink-0 ml-2">
            <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
          </div>
        </div>

        {/* Photo Preview Section */}
        <div className="border border-slate-100 rounded-2xl p-4 space-y-3 bg-white shadow-xs">
          <h2 className="text-xs font-bold text-slate-900">Photo Preview</h2>

          <div className="grid grid-cols-12 gap-3 items-center">
            {/* User Portrait Image */}
            <div className="col-span-5 bg-slate-100 rounded-2xl overflow-hidden aspect-square border border-slate-200 relative shadow-inner">
              <img 
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80" 
                alt="Ashutosh Kumar"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Verification Metadata Table */}
            <div className="col-span-7 space-y-2 text-xs">
              <div className="flex justify-between items-center pb-1.5 border-b border-slate-50">
                <div className="flex items-center gap-1.5 text-slate-600">
                  <User className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Name</span>
                </div>
                <span className="font-bold text-slate-900">Ashutosh Kumar</span>
              </div>

              <div className="flex justify-between items-center pb-1.5 border-b border-slate-50">
                <div className="flex items-center gap-1.5 text-slate-600">
                  <Calendar className="w-3.5 h-3.5 text-purple-600" />
                  <span>Verification</span>
                </div>
                <span className="font-bold text-slate-900">18 May 2025</span>
              </div>

              <div className="flex justify-between items-center pb-1.5 border-b border-slate-50">
                <div className="flex items-center gap-1.5 text-slate-600">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span>Photo Status</span>
                </div>
                <span className="font-bold text-emerald-600 flex items-center gap-1">
                  Verified <CheckCircle2 className="w-3 h-3" />
                </span>
              </div>

              <div className="flex justify-between items-center pt-0.5">
                <div className="flex items-center gap-1.5 text-slate-600">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>Last Updated</span>
                </div>
                <span className="font-bold text-slate-900">18 May 2025</span>
              </div>
            </div>
          </div>
        </div>

        {/* Photo Guidelines Checklist Box */}
        <div className="bg-[#EFF8F3] border border-emerald-100 rounded-2xl p-4 space-y-2">
          <h3 className="font-extrabold text-emerald-900 text-xs">Photo Guidelines</h3>
          <div className="space-y-1 text-[11px] text-slate-700 font-medium pl-1">
            <p className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Use a recent photo</p>
            <p className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Your face should be clearly visible</p>
            <p className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Look straight into the camera</p>
            <p className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> No sunglasses, hat or mask</p>
            <p className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Use a plain light background</p>
            <p className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Accepted formats: JPG, PNG</p>
            <p className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Maximum file size: 5MB</p>
          </div>
        </div>

        {/* Uploaded Photo Preview Card */}
        <div className="border border-slate-100 rounded-2xl p-4 space-y-3 bg-white shadow-xs">
          <h2 className="text-xs font-bold text-slate-900">Uploaded Photo</h2>

          <div className="grid grid-cols-12 gap-3 items-center">
            <div className="col-span-8 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 shrink-0">
                <img 
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80" 
                  alt="Profile thumbnail" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="space-y-0.5">
                <h4 className="font-extrabold text-xs text-slate-900">profile_photo.jpg</h4>
                <p className="text-[10px] text-slate-400">Uploaded on 18 May 2025</p>
                <span className="inline-block bg-emerald-100 text-emerald-800 text-[9px] font-extrabold px-2 py-0.2 rounded mt-0.5">
                  Verified
                </span>
              </div>
            </div>

            <button 
              onClick={() => showToast("Viewing Profile Photo Fullscreen...")}
              className="col-span-4 h-full border border-dashed border-slate-200 rounded-xl p-2.5 flex flex-col items-center justify-center gap-1 hover:bg-slate-50 transition text-emerald-600"
            >
              <Maximize2 className="w-4 h-4 text-emerald-500" />
              <span className="text-[10px] font-bold text-emerald-600 text-center leading-tight">View Fullscreen</span>
            </button>
          </div>
        </div>

        {/* Footer Support & Update Button */}
        <div className="pt-1 text-center space-y-3">
          <button onClick={() => showToast("Contacting Support...")} className="text-xs text-slate-500 font-medium hover:underline block mx-auto">
            Facing an issue? <span className="text-emerald-600 font-bold">Contact Support</span>
          </button>

          <button 
            onClick={() => showToast("Update Profile Photo Form...")}
            className="w-full border-2 border-emerald-600 text-emerald-700 font-extrabold text-xs py-3 rounded-2xl flex items-center justify-center gap-2 hover:bg-emerald-50 transition"
          >
            <Upload className="w-4 h-4" />
            <span>Update Profile Photo</span>
          </button>
        </div>

      </main>
    </div>
  );
}