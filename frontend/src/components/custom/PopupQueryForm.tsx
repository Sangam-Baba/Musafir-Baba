import LazyQueryForm from "./LazyQueryForm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { SquarePen } from "lucide-react";
import Image from "next/image";

export default function PopupQueryForm() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <SquarePen />
          Apply Now
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] md:max-w-[900px] p-0 border-none shadow-none bg-transparent">
        <DialogTitle className="sr-only">Apply Now</DialogTitle>
        <DialogDescription className="sr-only">Fill out the form below to apply.</DialogDescription>
        <div className="flex w-full bg-white rounded-2xl overflow-hidden shadow-2xl">

          <div className="hidden md:block w-1/2 relative min-h-full">
             <Image 
                src="/enquary_pop_up_v21.png" 
                alt="Enquiry" 
                fill 
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
                className="object-cover" 
             />
          </div>
          <div className="w-full md:w-1/2">
             <LazyQueryForm className="shadow-none rounded-none w-full max-w-full" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
