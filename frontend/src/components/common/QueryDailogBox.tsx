"use client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import QueryForm from "../custom/QueryForm";
import Image from "next/image";

export function QueryDailogBox() {
  return (
    <div className="hidden md:flex fixed top-100 -right-10 z-50 flex items-center gap-2 rotate-[270deg]">
      <Dialog>
        <DialogTrigger asChild>
          <Button>Enquire Now</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[800px] md:max-w-[900px] p-0 border-none shadow-none bg-transparent">
          <DialogTitle className="sr-only">Enquire Now</DialogTitle>
          <DialogDescription className="sr-only">Fill out the form below to get a free quote.</DialogDescription>
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
               <QueryForm className="shadow-none rounded-none w-full max-w-full" />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
