import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Info } from "lucide-react"
type VisaInfo = {
  title: string
  description: string
  benefits: string[]
}

const visaData: Record<string, VisaInfo> = {
  "E-Visa": {
    title: "E-Visa (Electronic Visa)",
    description:
      "An E-Visa is an online visa application that lets travellers get approval to enter a country without visiting an embassy or consulate. It’s usually sent as a PDF or email and linked to your passport, making short-term travel easier and faster than traditional visas.",
    benefits: [
      "Saves time and money by allowing online applications.",
      "No need to visit embassies or consulates.",
      "Usually faster processing than traditional visas.",
      "Eliminates postage, courier, and travel costs.",
    ],
  },
  Sticker: {
    title: "Sticker Visa",
    description:
      "A Sticker Visa is a traditional visa that is physically placed in your passport as a sticker or stamp. It shows permission to enter a country and is recognized worldwide. It’s often required for longer stays or multiple entries.",
    benefits: [
      "Recognized worldwide and accepted at all immigration checkpoints.",
      "Often allows longer stays and multiple entries.",
      "Permanent record in your passport, easy for travel documentation.",
      "Reliable for countries requiring strict entry proof.",
    ],
  },
  DAC: {
    title: "DAC (Destination Arrival Card)",
    description:
      "A DAC is a visa that travellers get at the airport or border when they arrive in the country. It usually requires filling a form and paying a fee on the spot. It’s convenient for short visits without applying in advance.",
    benefits: [
      "Convenient for travelers who didn’t apply in advance.",
      "Quick entry at the airport with minimal paperwork.",
      "Ideal for spontaneous or last-minute travel.",
      "Often low or nominal processing fees.",
    ],
  },
  ETA: {
    title: "ETA (Electronic Travel Authorization)",
    description:
      "An ETA is an online pre-approval linked to your passport, allowing short-term stays like tourism or business. It’s quicker and simpler than a traditional visa and is automatically checked by immigration when you arrive.",
    benefits: [
      "Fast online approval, usually within hours.",
      "Avoids long embassy queues and paperwork.",
      "Linked electronically to passport, easy for immigration checks.",
      "Usually low-cost or free in many countries.",
    ],
  },
  PAR: {
    title: "PAR (Pre-Arrival Registration / Pre-Arrival Visa)",
    description:
      "A PAR is a pre-registration process where travellers get approval before boarding their flight. It ensures eligibility to enter the country and often speeds up the immigration process on arrival.",
    benefits: [
      "Confirms eligibility before travel, reducing risk of denied boarding.",
      "Speeds up immigration process on arrival.",
      "No need to carry extra documents physically in many cases.",
      "Helps organize entry for countries with strict border rules.",
    ],
  },
  EVOA: {
    title: "EVOA (Electronic Visa on Arrival)",
    description:
      "An EVOA is an online pre-approval for a visa, but the visa itself is issued when you land at the airport. It combines the convenience of online application with the flexibility of visa-on-arrival.",
    benefits: [
      "Online pre-approval saves time at the airport.",
      "Combines convenience of e-Visa with flexibility of visa-on-arrival.",
      "Reduces long queues and wait times on arrival.",
      "Secure, as approval is linked to your passport electronically.",
    ],
  },
}

export function VisaTypesDialog({ type }: { type: string }) {
  const visa = visaData[type]
  if (!visa) return null // if type is not valid, render nothing

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">{type} <Info color="#FE5300" /></Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{visa.title}</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <div className="grid md:grid-cols-2 grid-cols-1 gap-2">
            <div className="rounded-md border p-4">
              <h1 className="mb-2 font-bold md:text-xl">What is {type}?</h1>
              <p>{visa.description}</p>
            </div>
            <div className="rounded-md border p-4">
              <h1 className="mb-2 font-bold md:text-xl">Benefits of {type}</h1>
              <ul className="list-disc pl-4">
                {visa.benefits.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <DialogFooter className="sm:justify-start">
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
