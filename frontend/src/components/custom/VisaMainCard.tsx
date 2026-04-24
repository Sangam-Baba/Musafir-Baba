import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";
import { VisaTypesDialog } from "./VisaTypesDialog";
import { VisaInterface } from "@/app/(user)/visa/visaClient";

// function VisaMainCard({ visa }: { visa: VisaInterface }) {
//   return (
//     <Card
//       key={visa.id}
//       className="rounded-xl border border-gray-100 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(254,83,0,0.12)] hover:-translate-y-1 transition-all duration-300 flex flex-col bg-white overflow-hidden relative group"
//     >
//       <div className="absolute top-0 right-0 z-10 scale-[0.8] origin-top-right mt-1.5 mr-1.5">
//         <VisaTypesDialog type={visa.visaType} />
//       </div>

//       <CardHeader className="flex-none mt-1">
//         <div className="flex items-center gap-3 w-[80%]">
//           <div className="p-0.5 rounded border border-gray-100 shadow-sm bg-white flex-shrink-0">
//             <Image
//               src={visa.coverImage?.url ? visa.coverImage.url : ""}
//               alt={visa.coverImage?.alt ? visa.coverImage.alt : ""}
//               width={300}
//               height={200}
//               className="object-cover w-[36px] h-[24px] rounded-[2px]"
//             />
//           </div>
//           <CardTitle className="text-[17px] font-bold text-gray-900 tracking-tight leading-tight truncate">
//             {visa.country}
//           </CardTitle>
//         </div>
//       </CardHeader>
      
//       <CardContent className="px-4 pb-0 flex-1">
//         <p className="text-[12px] text-gray-600 font-medium leading-snug truncate">
//           Get your visa in <span className="text-[#FE5300] font-bold">{visa.duration}</span>
//         </p>
//         <div className="flex items-center gap-1.5 pb-3">
//           <span className="flex h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]"></span>
//           <p className="text-[12px] text-gray-600 font-medium truncate">
//              <span className="text-gray-900 font-bold">{visa.visaProcessed}+</span> Visas Processed
//           </p>
//         </div>
//       </CardContent>
      
//       <CardFooter className="px-4flex items-center justify-between border-t border-gray-50 bg-gray-50/50">
//         <div className="flex flex-col">
//           <span className="text-[10px] text-gray-500 font-semibold leading-none mb-1 uppercase tracking-wider">Starting From</span>
//           <p className="text-sm text-gray-600 flex items-baseline gap-0.5 leading-none">
//             <span className="font-extrabold text-[#FE5300] text-lg">₹{visa.cost}</span>
//             <span className="text-[11px] font-medium scale-90 origin-left">+ fee</span>
//           </p>
//         </div>
        
//         <Link 
//           href={`/visa/${visa.slug}`} 
//           className="flex items-center gap-0.5 text-[#FE5300] font-semibold text-[13px] hover:text-white transition-colors bg-orange-50 hover:bg-[#FE5300] px-3.5 py-1.5 rounded-full border border-orange-100 hover:border-[#FE5300]"
//         >
//           Apply <span className="text-[15px] leading-none tracking-tight mb-[1px] ml-0.5 group-hover:translate-x-0.5 transition-transform">›</span>
//         </Link>
//       </CardFooter>
//     </Card>
//   );
// }

// function VisaMainCard({ visa }: { visa: VisaInterface }) {
//   return (
//     <Card
//       key={visa.id}
//       className="rounded-lg border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col bg-white overflow-hidden relative group"
//     >
//       {/* Visa Type Badge */}
//       <div className="absolute top-1 right-1 z-10 scale-[0.75] origin-top-right">
//         <VisaTypesDialog type={visa.visaType} />
//       </div>

//       {/* Header */}
//       <CardHeader className="py-2 px-3">
//         <div className="flex items-center gap-2 w-[85%]">
//           <div className="p-[2px] rounded border border-gray-100 bg-white flex-shrink-0">
//             <Image
//               src={visa.coverImage?.url || ""}
//               alt={visa.coverImage?.alt || ""}
//               width={300}
//               height={200}
//               className="object-cover w-[32px] h-[20px] rounded-[2px]"
//             />
//           </div>
//           <CardTitle className="text-[15px] font-semibold text-gray-900 leading-tight truncate">
//             {visa.country}
//           </CardTitle>
//         </div>
//       </CardHeader>

//       {/* Content */}
//       <CardContent className="px-3 py-1 flex-1">
//         <p className="text-[11px] text-gray-600 leading-tight truncate">
//           Get visa in{" "}
//           <span className="text-[#FE5300] font-semibold">
//             {visa.duration}
//           </span>
//         </p>

//         <div className="flex items-center gap-1 mt-1">
//           <span className="h-1 w-1 rounded-full bg-green-500"></span>
//           <p className="text-[11px] text-gray-600 truncate">
//             <span className="text-gray-900 font-semibold">
//               {visa.visaProcessed}+
//             </span>{" "}
//             processed
//           </p>
//         </div>
//       </CardContent>

//       {/* Footer */}
//       <CardFooter className="px-3 py-2 flex items-center justify-between border-t border-gray-100 bg-gray-50">
//         <div className="flex flex-col leading-tight">
//           <span className="text-[9px] text-gray-500 uppercase tracking-wide">
//             From
//           </span>
//           <p className="text-[13px]">
//             <span className="font-bold text-[#FE5300]">
//               ₹{visa.cost}
//             </span>
//             <span className="text-[10px] text-gray-500 ml-0.5">
//               +fee
//             </span>
//           </p>
//         </div>

//         <Link
//           href={`/visa/${visa.slug}`}
//           className="text-[12px] font-medium text-[#FE5300] hover:text-white transition-colors bg-orange-50 hover:bg-[#FE5300] px-2.5 py-1 rounded-md border border-orange-100 hover:border-[#FE5300]"
//         >
//           Apply →
//         </Link>
//       </CardFooter>
//     </Card>
//   );
// }

// function VisaMainCard({ visa }: { visa: VisaInterface }) {
//   return (
//     <Card
//       key={visa.id}
//       className="rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col bg-white overflow-hidden relative group"
//     >
//       {/* Top */}
//       <div className="flex items-center justify-between px-2 py-1.5">
//         <div className="flex items-center gap-1.5">
//           <div className="border border-gray-200 rounded overflow-hidden">
//             <Image
//               src={visa.coverImage?.url || ""}
//               alt={visa.coverImage?.alt || ""}
//               width={300}
//               height={200}
//               className="w-[26px] h-[16px] object-cover"
//             />
//           </div>

//           <h3 className="text-[14px] font-semibold text-gray-900 leading-none">
//             {visa.country}
//           </h3>
//         </div>

//         <div className="scale-[0.7] origin-top-right">
//           <VisaTypesDialog type={visa.visaType} />
//         </div>
//       </div>

//       {/* Middle */}
//       <div className="px-2 py-1 space-y-[2px]">
//         <p className="text-[11px] text-gray-600 leading-none">
//           Get visa in{" "}
//           <span className="text-[#FE5300] font-medium">
//             {visa.duration}
//           </span>
//         </p>

//         <div className="flex items-center gap-1 leading-none">
//           <span className="h-[3px] w-[3px] rounded-full bg-green-500"></span>
//           <p className="text-[11px] text-gray-600">
//             <span className="font-medium text-gray-900">
//               {visa.visaProcessed}+
//             </span>{" "}
//             processed
//           </p>
//         </div>
//       </div>

//       {/* Bottom */}
//       <div className="flex items-center justify-between px-2 py-1.5 border-t border-gray-100">
//         <div className="leading-none">
//           <p className="text-[9px] text-gray-400 uppercase leading-none">
//             From
//           </p>
//           <p className="text-[13px] font-bold text-[#FE5300] leading-none">
//             ₹{visa.cost}
//             <span className="text-[9px] text-gray-500 ml-1">
//               +fee
//             </span>
//           </p>
//         </div>

//         <Link
//           href={`/visa/${visa.slug}`}
//           className="text-[11px] font-medium text-white bg-[#FE5300] px-2 py-[3px] rounded"
//         >
//           Apply →
//         </Link>
//       </div>
//     </Card>
//   );
// }

function VisaMainCard({ visa }: { visa: VisaInterface }) {
  return (
    <Card
      key={visa.id}
      className="rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col relative group"
    >
      <Link href={`/visa/${visa.slug}`} className="absolute inset-0 z-10">
        <span className="sr-only">View {visa.country} Visa</span>
      </Link>

      {/* TOP */}
      <div className="flex items-center justify-between px-3 pt-2 pb-0">
        <div className="flex items-center gap-2">
          <Image
            src={visa.coverImage?.url || ""}
            alt={visa.coverImage?.alt || ""}
            width={300}
            height={200}
            className="w-[30px] h-[20px] object-cover rounded-sm border border-gray-200"
          />
          <h3 className="text-[15px] font-semibold text-gray-900 leading-none">
            {visa.country}
          </h3>
        </div>

        <div className="scale-[0.8] origin-right py-0 relative z-20">
          <VisaTypesDialog type={visa.visaType} />
        </div>
      </div>

      {/* MIDDLE */}
      <div className="px-3 pb-1 -mt-0.5 space-y-1">
        <p className="text-[12px] text-gray-600 leading-none">
          Get visa in{" "}
          <span className="text-[#FE5300] font-semibold">
            {visa.duration}
          </span>
        </p>

        <p className="text-[12px] text-gray-600 leading-none flex items-center gap-1">
          <span className="w-[3px] h-[3px] rounded-full bg-green-500"></span>
          <span>
            <span className="text-gray-900 font-semibold">
              {visa.visaProcessed}+
            </span>{" "}
            processed
          </span>
        </p>
      </div>

      {/* FOOTER */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-gray-100 mt-auto bg-gray-50/40">
        <div className="flex flex-col justify-center">
          <p className="text-[14px] font-bold text-[#FE5300] leading-none">
            ₹{visa.cost} <span className="text-[10px] text-gray-500 font-medium ml-1">+ service fee</span>
          </p>
        </div>

        <span
          className="bg-orange-50 text-[#FE5300] border border-orange-100 text-[12px] font-semibold px-2.5 py-1 rounded-md group-hover:bg-[#FE5300] group-hover:text-white transition-colors"
        >
          Apply →
        </span>
      </div>
    </Card>
  );
}

export default VisaMainCard;
