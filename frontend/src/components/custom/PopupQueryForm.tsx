import QueryForm from "./QueryForm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { SquarePen } from "lucide-react";

export default function PopupQueryForm() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="bg-gradient-to-r from-[#eb3b23] to-[#f8b914] hover:bg-[#FE5300]"
        >
          <SquarePen />
          Apply Now
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <QueryForm />
      </DialogContent>
    </Dialog>
  );
}
