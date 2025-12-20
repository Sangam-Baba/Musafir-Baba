import { ChevronRight } from "lucide-react";
import { SettingDialog } from "@/components/User/SettingDailog";
import { getWebPageBySlug } from "@/app/(user)/[...slug]/page";

async function page() {
  const privacy = await getWebPageBySlug("privacy-policy");
  const terms = await getWebPageBySlug("terms-and-conditions");
  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="text-2xl p-4 shadow-md border-1 rounded-xl font-semibold">
        <h1>Settings</h1>
      </div>
      <div className="flex flex-col items-center gap-4 px-4 py-10 shadow-md border-1 rounded-xl  ">
        <div className="w-full ">
          <SettingDialog title="Privacy Policy" description={privacy.content} />
        </div>
        <div className="w-full ">
          <SettingDialog
            title="Terms & Conditions"
            description={terms.content}
          />
        </div>

        <div className="flex w-full  justify-between border-1 hover:bg-gray-100 rounded-lg px-4 py-3 max-w-md">
          <p>Change Password</p>
          <ChevronRight />
        </div>
      </div>
    </div>
  );
}

export default page;
