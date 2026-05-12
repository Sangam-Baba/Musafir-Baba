"use client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import QueryForm from "../custom/QueryForm";

export function QueryDailogBox() {
  return (
    <div className="hidden md:flex fixed top-100 -right-10 z-50 flex items-center gap-2 rotate-[270deg]">
      <Dialog>
        <DialogTrigger asChild>
          <Button>Enquire Now</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px] md:max-w-[480px] p-0 border-none shadow-none bg-transparent">
          <QueryForm />
        </DialogContent>
      </Dialog>
    </div>
  );
}
