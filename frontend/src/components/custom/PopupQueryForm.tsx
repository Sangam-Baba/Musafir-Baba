import QueryForm from "./QueryForm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

export default function PopupQueryForm() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="bg-[#FE5300] hover:bg-[#FE5300]">
          Enquery Now
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <QueryForm />
      </DialogContent>
    </Dialog>
  );
}
