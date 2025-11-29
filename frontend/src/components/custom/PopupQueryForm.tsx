import QueryForm from "./QueryForm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { SquarePen } from "lucide-react";

export default function PopupQueryForm() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
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
