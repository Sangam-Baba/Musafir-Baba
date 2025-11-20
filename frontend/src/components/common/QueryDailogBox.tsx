"use client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import QueryForm from "../custom/QueryForm";

export function QueryDailogBox() {
  return (
    <div className="hidden md:flex fixed top-100 -right-10 z-50 flex items-center gap-2 rotate-[270deg]">
      <Dialog>
        <DialogTrigger asChild>
          <Button
            className="bg-gradient-to-r from-[#eb3b23] to-[#f8b914] hover:bg-[#FE5300] text-black"
            variant="outline"
          >
            Enquire Now
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <QueryForm />
        </DialogContent>
      </Dialog>
    </div>
  );
}
