const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/screens/rider/auth/ScreenRiderAuth.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Fix WorldMapBackground
content = content.replace(
  /<View className="absolute inset-0 items-center justify-center pointer-events-none overflow-hidden" style=\{\{ opacity: 0.25 \}\}>/,
  '<View style={{ position: \'absolute\', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.25 }} pointerEvents="none">'
);

// 2. Fix BrandLogo
const brandLogoRegex = /const BrandLogo = \(\) => \([\s\S]*?\n\);\n/;
const newBrandLogo = `const LOGO = require('../../../desgin/mbgoLogo.png');

const BrandLogo = () => (
  <View className="items-center mb-2 z-10">
    <Image source={LOGO} style={{ width: 140, height: 60 }} resizeMode="contain" />
  </View>
);
`;
content = content.replace(brandLogoRegex, newBrandLogo);

// 3. Fix Customer Portal Header
const scrollContainerRegex = /<View className="flex-1 bg-\[#F4F6F9\] relative">\n\s*\{\/\* Scrollable Content Body \*\/\}\n\s*<ScrollView className="flex-1" contentContainerStyle=\{\{ paddingBottom: 100 \}\} showsVerticalScrollIndicator=\{false\}>/g;
const newHeader = `<View className="flex-1 bg-[#F4F6F9] relative">

        {/* Header Navigation Bar */}
        <View className="w-full px-5 pt-4 pb-2 flex-row justify-between items-center z-20 absolute top-0 left-0 right-0">
          <View />
          <TouchableOpacity onPress={() => console.log('Portal')} className="flex-row items-center gap-1.5 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100">
            <User size={15} color="#1E293B" />
            <Text className="text-xs font-semibold text-slate-800">Customer Portal</Text>
            <ChevronRight size={13} color="#1E293B" />
          </TouchableOpacity>
        </View>

        {/* Scrollable Content Body */}
        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100, paddingTop: 60 }} showsVerticalScrollIndicator={false}>`;
content = content.replace(scrollContainerRegex, newHeader);

// 4. Fix Stepper rendering outside of step blocks
const cardTopRegex = /\{\/\* Floating Icon Badge \*\/\}/g;
const newCardTop = `{/* Stepper Bar (Register/Forgot) */}
              {(activeScreen === 'register' && registerStep !== 'success') && (
                <StepProgress currentStep={registerStep === 'form' ? 1 : registerStep === 'otp' ? 2 : 3} steps={[{ num: 1, label: 'Details' }, { num: 2, label: 'OTP' }, { num: 3, label: 'Ready' }]} />
              )}
              {(activeScreen === 'forgot' && forgotStep < 4) && (
                <StepProgress currentStep={forgotStep} steps={[{ num: 1, label: 'Email' }, { num: 2, label: 'OTP' }, { num: 3, label: 'Reset' }]} />
              )}
              
              {/* Floating Icon Badge */}`;
content = content.replace(cardTopRegex, newCardTop);

// 5. Fix Lucide Icons
const iconMap = [
  { classStr: 'className="w-3.5 h-3.5 text-white"', replace: 'size={14} color="#FFFFFF"' },
  { classStr: 'className="w-4 h-4 text-white"', replace: 'size={16} color="#FFFFFF"' },
  { classStr: 'className="w-6 h-6 text-white"', replace: 'size={24} color="#FFFFFF"' },
  
  { classStr: 'className="w-3.5 h-3.5 text-slate-700"', replace: 'size={14} color="#334155"' },
  { classStr: 'className="w-4 h-4 text-slate-400"', replace: 'size={16} color="#94A3B8"' },
  { classStr: 'className="w-4 h-4 text-slate-400 shrink-0"', replace: 'size={16} color="#94A3B8"' },
  { classStr: 'className="w-3.5 h-3.5 text-emerald-600"', replace: 'size={14} color="#059669"' },
  { classStr: 'className="w-4 h-4 text-emerald-400"', replace: 'size={16} color="#34d399"' },
  { classStr: 'className="w-9 h-9 text-emerald-500"', replace: 'size={36} color="#10b981"' },
  
  { classStr: 'className="w-4 h-4 text-[#FF5500]"', replace: 'size={16} color="#FF5500"' },
  { classStr: 'className="w-5 h-5 text-[#FF5500]"', replace: 'size={20} color="#FF5500"' },
  { classStr: 'className="w-6 h-6 text-[#FF5500]"', replace: 'size={24} color="#FF5500"' },
  { classStr: 'className="w-3.5 h-3.5 text-[#FF5500]"', replace: 'size={14} color="#FF5500"' },
];

iconMap.forEach(mapping => {
  const safeClassStr = mapping.classStr.replace(/\\./g, '\\\\.').replace(/\\[/g, '\\\\[').replace(/\\]/g, '\\\\]');
  // we can also just use simple split/join for string replacement instead of regex to avoid escaping issues
  content = content.split(mapping.classStr).join(mapping.replace);
});

fs.writeFileSync(filePath, content, 'utf8');
console.log('UI Fixes Applied');
