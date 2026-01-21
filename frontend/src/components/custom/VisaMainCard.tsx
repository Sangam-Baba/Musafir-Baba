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
function VisaMainCard({ visa }: { visa: VisaInterface }) {
  return (
    <Card
      key={visa.id}
      className=" shadow-lg h-full shadow-gray-500/50 hover:shadow-[#FF5300]/50  "
    >
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <Image
            src={visa.coverImage?.url ? visa.coverImage.url : ""}
            alt={visa.coverImage?.alt ? visa.coverImage.alt : ""}
            width={300}
            height={200}
            className="outline rounded-md object-cover w-20 h-15"
          />
          <VisaTypesDialog type={visa.visaType} />
        </div>

        <CardTitle className="flex items-center text-2xl  gap-2">
          <h2>{visa.country}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 font-semibold">
          Get your visa in {visa.duration}
        </p>
        <p className="text-gray-600 font-semibold">
          {visa.visaProcessed}+ Visa Processed
        </p>
      </CardContent>
      <CardFooter className="flex items-center justify-between border-t  ">
        <p className="text-sm  text-gray-600">
          <span className="text-[#FF5300] font-bold text-lg">₹{visa.cost}</span>
          + Service Fee
        </p>
        <p className="font-bold text-blue-600 whitespace-nowrap">
          <Link href={`/visa/${visa.slug}`}>
            Apply Now <span className="font-bold">{`>`}</span>
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}

export default VisaMainCard;
