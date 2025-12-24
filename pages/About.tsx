
import React from 'react';
import { Code2, Phone, Heart, ShieldCheck, Zap, Layers, Globe, Star } from 'lucide-react';

export const About: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Hero Section */}
      <div className="bg-indigo-900 text-white p-12 rounded-[3rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <Code2 className="w-96 h-96 -ml-20 -mt-20 transform -rotate-12" />
        </div>
        
        <div className="relative z-10 text-center space-y-6">
          <div className="inline-block p-4 bg-indigo-800 rounded-3xl mb-4 border border-indigo-700 shadow-inner">
            <Code2 className="w-12 h-12 text-indigo-300" />
          </div>
          <h1 className="text-4xl font-black">نظام كنترول المدرسة المتكامل</h1>
          <p className="text-indigo-200 text-lg font-bold max-w-2xl mx-auto">
            تم تصميم هذا البرنامج ليكون الحل الأمثل والشامل لإدارة كنترول المدارس، مع التركيز على الدقة، السرعة، وسهولة الاستخدام.
          </p>
        </div>
      </div>

      {/* Designer Info Card */}
      <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col md:flex-row items-center gap-10">
        <div className="w-32 h-32 bg-indigo-50 rounded-full flex items-center justify-center border-4 border-indigo-100 shadow-inner">
          <span className="text-4xl font-black text-indigo-600">مب</span>
        </div>
        <div className="flex-1 text-center md:text-right space-y-4">
          <div>
            <h3 className="text-2xl font-black text-gray-800">تصميم وتطوير</h3>
            <p className="text-indigo-600 text-xl font-black">م/ محمد بكري</p>
          </div>
          <p className="text-gray-500 font-bold leading-relaxed">
            مهندس برمجيات متخصص في بناء الأنظمة الإدارية التعليمية والحلول الذكية للمؤسسات.
          </p>
          <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-2">
            <a 
              href="tel:0096892391215" 
              className="flex items-center gap-3 bg-emerald-50 text-emerald-700 px-6 py-3 rounded-2xl font-black border border-emerald-100 hover:bg-emerald-100 transition-all active:scale-95"
            >
              <Phone className="w-5 h-5" />
              0096892391215
            </a>
          </div>
        </div>
      </div>

      {/* Importance Section */}
      <div className="space-y-6">
        <h3 className="text-2xl font-black text-gray-800 flex items-center gap-3">
          <span className="text-yellow-500"><Star className="w-7 h-7 fill-current" /></span>
          لماذا تختار هذا النظام؟
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FeatureCard 
            icon={<ShieldCheck className="w-6 h-6" />}
            title="أمان وخصوصية البيانات"
            description="يعمل النظام بالكامل أوفلاين (بدون إنترنت)، مما يضمن بقاء بيانات الطلاب والدرجات محلياً داخل المؤسسة."
          />
          <FeatureCard 
            icon={<Zap className="w-6 h-6" />}
            title="سرعة فائقة في الرصد"
            description="نظام رصد درجات ذكي مع حفظ تلقائي، يمنع الأخطاء البشرية ويوفر الوقت والجهد في عمليات الإدخال."
          />
          <FeatureCard 
            icon={<Layers className="w-6 h-6" />}
            title="تقارير احترافية"
            description="توليد شهادات الطلاب، كشوف المناداة، وبطاقات الجلوس بضغطة زر واحدة بتصاميم عصرية وجاهزة للطباعة."
          />
          <FeatureCard 
            icon={<Globe className="w-6 h-6" />}
            title="دعم الدور الثاني"
            description="محرك برمجي ذكي يحسب نتائج الدور الثاني تلقائياً بناءً على القواعد التربوية الصحيحة المعتمدة."
          />
        </div>
      </div>

      {/* Footer message */}
      <div className="text-center pt-10">
        <div className="inline-flex items-center gap-2 text-gray-400 font-bold text-sm">
          <span>صنع بكل</span>
          <Heart className="w-4 h-4 text-red-500 fill-red-500" />
          <span>لدعم مسيرة التعليم</span>
        </div>
      </div>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
  <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-3 transition-all hover:shadow-md hover:border-indigo-100 group">
    <div className="w-12 h-12 bg-gray-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
      {icon}
    </div>
    <h4 className="text-lg font-black text-gray-800">{title}</h4>
    <p className="text-gray-500 font-bold text-sm leading-relaxed">{description}</p>
  </div>
);
