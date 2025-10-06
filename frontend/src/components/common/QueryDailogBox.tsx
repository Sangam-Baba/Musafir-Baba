import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import QueryForm from "../custom/QueryForm";

export function QueryDailogBox() {
  return (
    <Dialog>
      <form>
        <DialogTrigger asChild>
          <Button className="bg-[#FE5300] hover:bg-[#FE5300]" variant="outline">
            Enquery Now
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <QueryForm />
        </DialogContent>
      </form>
    </Dialog>
  );
}
